import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { env } from "~/lib/env";
import type { AnalyzerResult as IntakeAnalyzerResult } from "~/schema/intake";
import { getServiceDbForWebhook } from "~/server/db/serviceClient";
import { analyzeAndPersist } from "~/server/services/analyzers/whatsapp";
import { ensureIntakeForWhatsApp } from "~/server/services/intake/ensure-intake";
import {
	isWebhookEventDuplicate,
	recordWebhookEvent,
} from "~/server/services/webhooks/events";
import {
	parseWhatsAppStatuses,
	parseWhatsAppWebhook,
} from "~/server/services/whatsapp/message-normalizer";
import { applyStatuses } from "~/server/services/whatsapp/message-status";
import {
	type PersistedWhatsAppConversation,
	persistWhatsAppMessages,
} from "~/server/services/whatsapp/message-store";
import { verifyWhatsAppSignature } from "~/server/services/whatsapp/signature-verify";
import type { Tables } from "~/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TIME_ESTIMATE_MIN = 60;

const mapAnalyzerUrgency = (
	value: string | null | undefined,
): IntakeAnalyzerResult["urgency"] => {
	const normalized = value?.toLowerCase() ?? "low";
	if (
		normalized === "high" ||
		normalized === "urgent" ||
		normalized === "emergency"
	) {
		return "emergency";
	}
	if (normalized === "medium" || normalized === "normal") {
		return "urgent";
	}
	return "normal";
};

const clampConfidence = (value: number | null | undefined): number => {
	if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
};

const toAnalyzerResult = (
	suggestion: Tables<"wa_suggestions">,
	fallbackSummary: string,
): IntakeAnalyzerResult => {
	const summaryFallback =
		fallbackSummary.length > 0 ? fallbackSummary : "Intake";
	const firstTag = suggestion.tags[0];
	const issue =
		typeof firstTag === "string" && firstTag.length > 0
			? firstTag
			: summaryFallback;
	const timeEstimate =
		suggestion.time_estimate_min ?? DEFAULT_TIME_ESTIMATE_MIN;
	return {
		issue,
		urgency: mapAnalyzerUrgency(suggestion.urgency),
		timeEstimateMin: Math.max(15, Math.round(timeEstimate)),
		materials: [],
		confidence: clampConfidence(suggestion.confidence),
	};
};

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
	const ingestLatencyMs =
		typeof entryTime === "number"
			? Math.max(0, nowMs - entryTime * 1000)
			: null;
	if (await isWebhookEventDuplicate({ eventId, provider: "whatsapp", db })) {
		return NextResponse.json({ ok: true, duplicate: true });
	}

	// 5) Persist messages
	let persistedConversations: PersistedWhatsAppConversation[] = [];
	if (messages.length > 0) {
		persistedConversations = await persistWhatsAppMessages({
			messages,
			orgId,
			db,
		});

		const conversationByContact = new Map<
			string,
			PersistedWhatsAppConversation
		>();
		for (const conversation of persistedConversations) {
			conversationByContact.set(conversation.waContactId, conversation);
		}

		const analyzerByConversation = new Map<string, IntakeAnalyzerResult>();

		for (const message of messages) {
			const candidate = conversationByContact.get(message.waContactId);
			if (!candidate) continue;

			const messageRowId = candidate.messageRowByWaId[message.waMessageId];
			if (!messageRowId) continue;

			const existingSuggestion = await db
				.from("wa_suggestions")
				.select("*")
				.eq("message_id", messageRowId)
				.eq("org_id", orgId)
				.maybeSingle();

			let suggestion =
				(existingSuggestion.data as Tables<"wa_suggestions"> | null) ?? null;

			if (!suggestion) {
				const analyzed = await analyzeAndPersist(db, {
					orgId,
					conversationId: candidate.conversationId,
					messageId: message.waMessageId,
					text: message.content ?? null,
					mediaKey: message.mediaUrl ?? null,
				});
				suggestion = analyzed ?? null;
			}

			if (suggestion) {
				analyzerByConversation.set(
					candidate.conversationId,
					toAnalyzerResult(suggestion, candidate.summary),
				);
			}
		}

				for (const conversation of persistedConversations) {
					const analyzer = analyzerByConversation.get(conversation.conversationId);
					await ensureIntakeForWhatsApp({
						db,
						orgId,
						conversationId: conversation.conversationId,
						waContactId: conversation.waContactId,
						waConversationId: conversation.waConversationId,
						waMessageIds: conversation.waMessageIds,
						messageRowIds: conversation.messageRowIds,
						summary: conversation.summary,
						snippet: conversation.snippet,
						lastMessageIso: conversation.lastMessageIso,
						media: conversation.media,
						...(analyzer ? { analyzer } : {}),
						ingestLatencyMs,
					});
				}

		await recordWebhookEvent({ eventId, provider: "whatsapp", db, orgId });
	}

	// 6) Process status updates
	const statusPack = parseWhatsAppStatuses(payload);
	if (statusPack && statusPack.statuses.length > 0) {
		// orgId already resolved above via phoneNumberId mapping
		await applyStatuses(db, orgId, statusPack.statuses);
	}

	return NextResponse.json({ ok: true, messages: messages.length });
}
