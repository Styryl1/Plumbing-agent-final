import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { env } from "~/lib/env";
import { getServiceDbForWebhook } from "~/server/db/serviceClient";
import type { ApprovalContext } from "~/server/services/whatsapp/approval";
import {
	approveSuggestion,
	createQuoteDraft,
	isControlNumberWhitelisted,
	rejectSuggestion,
	sendRaw,
} from "~/server/services/whatsapp/approval";
import type { ControlAction } from "~/server/services/whatsapp/commands";
import {
	getCommandHelp,
	handleControlCommand,
} from "~/server/services/whatsapp/commands";
import type { NormalizedMessage } from "~/server/services/whatsapp/message-normalizer";
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
import { sendTextMessage } from "~/server/services/whatsapp/send";
import { verifyWhatsAppSignature } from "~/server/services/whatsapp/signature-verify";
import type { Database } from "~/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Execute a control command and send response to control chat
 */
async function executeControlCommand(
	db: SupabaseClient<Database>,
	command: ControlAction,
	context: ApprovalContext,
	originalMessage: NormalizedMessage,
): Promise<void> {
	let responseText = "";

	try {
		switch (command.kind) {
			case "approve": {
				const result = await approveSuggestion(db, command.msgId, context);
				responseText = result.success
					? `✅ Approved and sent suggestion for message ${command.msgId}`
					: `❌ Failed to approve: ${result.error}`;
				break;
			}
			case "reject": {
				const result = await rejectSuggestion(
					db,
					command.msgId,
					command.reason,
					context,
				);
				responseText = result.success
					? `🚫 Rejected suggestion for message ${command.msgId}\nReason: ${command.reason}`
					: `❌ Failed to reject: ${result.error}`;
				break;
			}
			case "send": {
				const result = await sendRaw(db, command.msgId, context);
				responseText = result.success
					? `📤 Sent original message ${command.msgId}`
					: `❌ Failed to send: ${result.error}`;
				break;
			}
			case "quote": {
				const result = await createQuoteDraft(db, command.msgId, context);
				responseText = result.success
					? `💰 Created quote draft: ${result.url}\nMessage: ${command.msgId}`
					: `❌ Failed to create quote: ${result.error}`;
				break;
			}
		}
	} catch (error) {
		responseText = `❌ Command failed: ${String(error)}`;
	}

	// Send response back to control chat
	const conversation = await db
		.from("wa_conversations")
		.select("id")
		.eq("org_id", context.orgId)
		.eq("wa_contact_id", originalMessage.waContactId)
		.single();

	if (conversation.data) {
		await sendTextMessage(db, context.orgId, {
			conversationId: conversation.data.id,
			text: responseText,
		});
	}
}

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

export async function POST(request: NextRequest): Promise<Response> {
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

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody) as unknown;
	} catch {
		return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
	}

	const { phoneNumberId, entryId, entryTime, messages } =
		parseWhatsAppWebhook(payload);

	const db = getServiceDbForWebhook();
	const map = await db
		.from("wa_numbers")
		.select("org_id, label")
		.eq("phone_number_id", phoneNumberId)
		.single();
	const orgId = map.data?.org_id;
	if (!orgId)
		return NextResponse.json(
			{ error: "Org mapping not found" },
			{ status: 422 },
		);

	const nowMs = Temporal.Now.instant().epochMilliseconds;
	const eventId =
		entryId && entryTime ? `${entryId}_${entryTime}` : `wa_${nowMs}`;
	if (await isWebhookEventDuplicate({ eventId, provider: "whatsapp", db })) {
		return NextResponse.json({ ok: true, duplicate: true });
	}

	if (messages.length > 0) {
		await persistWhatsAppMessages({ messages, orgId, db });
		await recordWebhookEvent({
			eventId,
			provider: "whatsapp",
			db,
			orgId,
			eventType: "control",
		});

		// Process control commands from messages
		for (const message of messages) {
			if (message.content) {
				// Check if sender is whitelisted for control actions
				const isWhitelisted = await isControlNumberWhitelisted(
					db,
					orgId,
					message.phoneNumber,
				);

				if (!isWhitelisted) {
					// Send help message to non-whitelisted users
					const conversation = await db
						.from("wa_conversations")
						.select("id")
						.eq("org_id", orgId)
						.eq("wa_contact_id", message.waContactId)
						.single();

					if (conversation.data) {
						await sendTextMessage(db, orgId, {
							conversationId: conversation.data.id,
							text: "⚠️ Access denied. This is a restricted control chat.",
						});
					}
					continue;
				}

				// Parse and execute command
				const command = handleControlCommand({
					text: message.content,
					orgId,
					phone: message.phoneNumber,
				});

				if (command) {
					await executeControlCommand(
						db,
						command,
						{
							orgId,
							userId: "system", // TODO: Map to actual user when user management is implemented
							phone: message.phoneNumber,
						},
						message,
					);
				} else if (message.content.trim().startsWith("#")) {
					// Unknown command - send help
					const conversation = await db
						.from("wa_conversations")
						.select("id")
						.eq("org_id", orgId)
						.eq("wa_contact_id", message.waContactId)
						.single();

					if (conversation.data) {
						await sendTextMessage(db, orgId, {
							conversationId: conversation.data.id,
							text: `❌ Unknown command: ${message.content.split(" ")[0]}\n\n${getCommandHelp()}`,
						});
					}
				}
			}
		}
	}

	// Process status updates
	const statusPack = parseWhatsAppStatuses(payload);
	if (statusPack && statusPack.statuses.length > 0) {
		// orgId already resolved above via phoneNumberId mapping
		await applyStatuses(db, orgId, statusPack.statuses);
	}

	return NextResponse.json({ ok: true, messages: messages.length });
}
