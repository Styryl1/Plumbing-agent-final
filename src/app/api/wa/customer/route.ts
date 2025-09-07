import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { env } from "~/lib/env";
import { getServiceDbForWebhook } from "~/server/db/serviceClient";
import { analyzeAndPersist } from "~/server/services/analyzers/whatsapp";
import {
	parseWhatsAppStatuses,
	parseWhatsAppWebhook,
} from "~/server/services/whatsapp/message-normalizer";
import { applyStatuses } from "~/server/services/whatsapp/message-status";
import {
	isWebhookEventDuplicate,
	persistWhatsAppMessages,
	recordWebhookEvent,
} from "~/server/services/whatsapp/message-store";
import { verifyWhatsAppSignature } from "~/server/services/whatsapp/signature-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET = Meta challenge
export function GET(request: NextRequest): Response {
	const sp = request.nextUrl.searchParams;
	const mode = sp.get("hub.mode");
	const token = sp.get("hub.verify_token");
	const challenge = sp.get("hub.challenge");
	if (mode === "subscribe" && token && token === env.WHATSAPP_VERIFY_TOKEN) {
		return new Response(challenge ?? "", { status: 200 });
	}
	return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST = webhook
export async function POST(request: NextRequest): Promise<Response> {
	// 1) Verify signature
	const rawBody = await request.text();
	const sig = request.headers.get("X-Hub-Signature-256");
	if (
		!env.WHATSAPP_APP_SECRET ||
		!verifyWhatsAppSignature({
			appSecret: env.WHATSAPP_APP_SECRET,
			rawBody,
			signatureHeader: sig,
		})
	) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	// 2) Parse payload & normalize
	let payload: unknown;
	try {
		payload = JSON.parse(rawBody) as unknown;
	} catch {
		return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
	}

	const { phoneNumberId, entryId, entryTime, messages } =
		parseWhatsAppWebhook(payload);

	// 3) Resolve org via wa_numbers (service role)
	const db = getServiceDbForWebhook();
	const map = await db
		.from("wa_numbers")
		.select("org_id, label")
		.eq("phone_number_id", phoneNumberId)
		.single();
	const orgId = map.data?.org_id;
	if (!orgId) {
		return NextResponse.json(
			{ error: "Org mapping not found" },
			{ status: 422 },
		);
	}

	// 4) Idempotency on webhook event id
	const nowMs = Temporal.Now.instant().epochMilliseconds;
	const eventId =
		entryId && entryTime ? `${entryId}_${entryTime}` : `wa_${nowMs}`;
	if (await isWebhookEventDuplicate({ eventId, provider: "whatsapp", db })) {
		return NextResponse.json({ ok: true, duplicate: true });
	}

	// 5) Persist messages
	if (messages.length > 0) {
		await persistWhatsAppMessages({ messages, orgId, db });
		await recordWebhookEvent({ eventId, provider: "whatsapp", db, orgId });

		// 5b) Analyze inbound messages with idempotency check
		for (const message of messages) {
			// Check if suggestion already exists for this message (idempotency)
			const existingSuggestion = await db
				.from("wa_suggestions")
				.select("id")
				.eq("message_id", message.waMessageId)
				.eq("org_id", orgId)
				.single();

			if (!existingSuggestion.data) {
				// Get conversation ID from the recently persisted conversation
				const conversation = await db
					.from("wa_conversations")
					.select("id")
					.eq("org_id", orgId)
					.eq("wa_contact_id", message.waContactId)
					.single();

				if (conversation.data) {
					await analyzeAndPersist(db, {
						orgId,
						conversationId: conversation.data.id,
						messageId: message.waMessageId,
						text: message.content ?? null,
						mediaKey: message.mediaUrl ?? null,
					});
				}
			}
		}
	}

	// 6) Process status updates
	const statusPack = parseWhatsAppStatuses(payload);
	if (statusPack && statusPack.statuses.length > 0) {
		// orgId already resolved above via phoneNumberId mapping
		await applyStatuses(db, orgId, statusPack.statuses);
	}

	return NextResponse.json({ ok: true, messages: messages.length });
}
