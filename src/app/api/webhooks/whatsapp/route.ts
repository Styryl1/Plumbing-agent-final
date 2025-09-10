import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { serverOnlyEnv } from "~/lib/env";
import { createSystemClient } from "~/server/db/client";
import {
	parseWhatsAppStatuses,
	parseWhatsAppWebhook,
} from "~/server/services/whatsapp/message-normalizer";
import {
	isWebhookEventDuplicate,
	persistWhatsAppMessages,
	recordWebhookEvent,
} from "~/server/services/whatsapp/message-store";
import { verifyWhatsAppSignature } from "~/server/services/whatsapp/signature-verify";

/**
 * WhatsApp Webhook Route
 *
 * GET: Meta verification challenge (hub.mode=subscribe)
 * POST: Process inbound messages/statuses with signature verification
 */

export function GET(request: NextRequest): NextResponse {
	const { searchParams } = request.nextUrl;
	const mode = searchParams.get("hub.mode");
	const token = searchParams.get("hub.verify_token");
	const challenge = searchParams.get("hub.challenge");

	// Meta webhook verification
	if (
		mode === "subscribe" &&
		token === serverOnlyEnv.WHATSAPP_VERIFY_TOKEN &&
		challenge
	) {
		return new NextResponse(challenge, {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		});
	}

	return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Get raw body for signature verification
		const rawBody = await request.text();
		const signatureHeader = request.headers.get("X-Hub-Signature-256");

		// Verify signature using Meta app secret
		const isValid = verifyWhatsAppSignature({
			appSecret: serverOnlyEnv.WA_APP_SECRET,
			rawBody,
			signatureHeader,
		});

		if (!isValid) {
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}

		// Parse webhook payload
		let payload: unknown;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
		}

		// Use system client for webhook processing (verified webhook context)
		const db = createSystemClient();

		// Generate unique event ID for deduplication
		const eventId = `whatsapp_${Temporal.Now.instant().epochMilliseconds}_${Math.random().toString(36).slice(2)}`;

		// Check for duplicate webhook event to prevent double processing
		if (await isWebhookEventDuplicate({ eventId, provider: "whatsapp", db })) {
			return NextResponse.json(
				{ message: "Event already processed" },
				{ status: 200 },
			);
		}

		// Try to parse as messages first
		try {
			const messageData = parseWhatsAppWebhook(payload);
			if (messageData.messages.length > 0) {
				// Resolve org via wa_numbers (phone_number_id → org_id)
				const { data: numRow, error: numErr } = await db
					.from("wa_numbers")
					.select("org_id")
					.eq("phone_number_id", messageData.phoneNumberId)
					.single();
				if (numErr !== null) {
					return NextResponse.json(
						{ error: "Unknown phone_number_id (no org mapping)" },
						{ status: 400 },
					);
				}
				const orgId = numRow.org_id;

				await persistWhatsAppMessages({
					messages: messageData.messages,
					orgId,
					db,
				});

				// Record successful webhook processing
				await recordWebhookEvent({
					eventId,
					provider: "whatsapp",
					db,
					eventType: "message",
					entityType: "whatsapp_message",
					entityId: messageData.phoneNumberId,
					orgId,
				});

				return NextResponse.json(
					{
						message: "Messages processed",
						count: messageData.messages.length,
					},
					{ status: 200 },
				);
			}
		} catch (error) {
			// Not a message payload, try status updates
			console.warn("Failed to parse as messages:", error);
		}

		// Try to parse as status updates
		try {
			const statusData = parseWhatsAppStatuses(payload);
			if (statusData?.statuses.length) {
				// TODO: Update message status in wa_messages table
				// For now, just record successful webhook processing
				await recordWebhookEvent({
					eventId,
					provider: "whatsapp",
					db,
					eventType: "status",
					entityType: "whatsapp_status",
					entityId: statusData.phoneNumberId,
				});

				return NextResponse.json(
					{
						message: "Status updates processed",
						count: statusData.statuses.length,
					},
					{ status: 200 },
				);
			}
		} catch (error) {
			// Not a status payload either
			console.warn("Failed to parse as status updates:", error);
		}

		// If we get here, it's an unrecognized payload format
		// Still record the event for debugging
		await recordWebhookEvent({
			eventId,
			provider: "whatsapp",
			db,
			eventType: "unknown",
			entityType: "webhook",
			entityId: eventId,
		});

		return NextResponse.json(
			{ message: "Webhook received but not processed" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("WhatsApp webhook error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
