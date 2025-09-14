import { useTranslations } from "next-intl";
// WhatsApp Payment Link Sender - Pure orchestrator for session vs template message delivery
// Handles 24h window detection and appropriate message type selection

import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { env } from "~/lib/env";
import type { Database, Json } from "~/types/supabase";
import { isWithin24h } from "./session";
import { MetaSendResponseSchema } from "./zod";

type MetaSendResponse = z.infer<typeof MetaSendResponseSchema>;

type DB = SupabaseClient<Database>;

// === INPUT VALIDATION ===

export const PaymentLinkSenderInput = z.object({
	phoneE164: z.string().regex(/^\+\d{10,15}$/),
	url: z.url(),
	locale: z.enum(["nl", "en"]).default("nl"),
});

type PaymentLinkSenderInputType = z.infer<typeof PaymentLinkSenderInput>;

// === PURE ORCHESTRATOR FUNCTION ===

/**
 * Send payment link via WhatsApp using session or template based on 24h window
 * Pure function with no direct database access - orchestrates calls to existing utilities
 */
export async function sendPaymentLink(
	db: DB,
	orgId: string,
	input: PaymentLinkSenderInputType,
): Promise<{ messageId: string; mode: "session" | "template" }> {
	const validated = PaymentLinkSenderInput.parse(input);
	const { phoneE164, url, locale } = validated;

	// Get or create conversation for this phone number
	const conversation = await getOrCreateConversation(db, orgId, phoneE164);

	// Check if we're within 24h session window
	const within24h = isWithin24h(conversation.last_message_at);

	if (within24h) {
		// Send as free-form session message
		const sessionText = getSessionMessage(url, locale);
		const response = await sendSessionMessage(
			conversation.wa_contact_id,
			sessionText,
		);

		// Store message in wa_messages
		await storeMessage(db, {
			orgId,
			conversationId: conversation.id,
			waMessageId: response.messages?.[0]?.id ?? "unknown",
			direction: "out",
			messageType: "text",
			content: sessionText,
			payloadJson: response as Json,
			mode: "session",
		});

		return {
			messageId: response.messages?.[0]?.id ?? "session_sent",
			mode: "session",
		};
	} else {
		// Send as template message with payment_link template
		const response = await sendTemplateMessage(
			conversation.wa_contact_id,
			"payment_link",
			locale,
			[url], // Template variable
		);

		// Store message in wa_messages
		await storeMessage(db, {
			orgId,
			conversationId: conversation.id,
			waMessageId: response.messages?.[0]?.id ?? "unknown",
			direction: "out",
			messageType: "template",
			content: `payment_link template with ${url}`,
			payloadJson: response as Json,
			mode: "template",
		});

		return {
			messageId: response.messages?.[0]?.id ?? "template_sent",
			mode: "template",
		};
	}
}

// === HELPER FUNCTIONS ===

async function getOrCreateConversation(
	db: DB,
	orgId: string,
	phoneE164: string,
): Promise<{
	id: string;
	wa_contact_id: string;
	last_message_at: string;
}> {
	// Try to find existing conversation
	const { data: existing } = await db
		.from("wa_conversations")
		.select("id, wa_contact_id, last_message_at")
		.eq("org_id", orgId)
		.eq("phone_number", phoneE164)
		.single();

	if (existing) {
		return existing;
	}

	// Create new conversation
	const waContactId = phoneE164.replace("+", ""); // Meta format
	const { data: newConv, error } = await db
		.from("wa_conversations")
		.insert({
			org_id: orgId,
			wa_contact_id: waContactId,
			phone_number: phoneE164,
			last_message_at: Temporal.Now.instant().toString(),
			status: "active",
		})
		.select("id, wa_contact_id, last_message_at")
		.single();

	if (error !== null) {
		throw new Error("Failed to create conversation");
	}

	return newConv;
}

function getSessionMessage(url: string, locale: "nl" | "en"): string {
	if (locale === "nl") {
		return `Uw factuur is klaar! Betaal eenvoudig online via deze link: ${url}`;
	} else {
		return `Your invoice is ready! Pay easily online via this link: ${url}`;
	}
}

async function sendSessionMessage(
	waContactId: string,
	text: string,
): Promise<MetaSendResponse> {
	const payload = {
		messaging_product: "whatsapp",
		to: waContactId,
		type: "text",
		text: {
			body: text,
		},
	};

	const response = await fetch(
		`https://graph.facebook.com/v21.0/${env.WHATSAPP_BUSINESS_PHONE_ID}/messages`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw new Error(`WhatsApp API error: ${response.status}`);
	}

	return MetaSendResponseSchema.parse(await response.json());
}

async function sendTemplateMessage(
	waContactId: string,
	templateName: string,
	language: string,
	parameters: string[],
): Promise<MetaSendResponse> {
	const payload = {
		messaging_product: "whatsapp",
		to: waContactId,
		type: "template",
		template: {
			name: templateName,
			language: {
				code: language === "nl" ? "nl" : "en",
			},
			components: [
				{
					type: "body",
					parameters: parameters.map((param) => ({
						type: "text",
						text: param,
					})),
				},
			],
		},
	};

	const response = await fetch(
		`https://graph.facebook.com/v21.0/${env.WHATSAPP_BUSINESS_PHONE_ID}/messages`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw new Error(`WhatsApp Template API error: ${response.status}`);
	}

	return MetaSendResponseSchema.parse(await response.json());
}

async function storeMessage(
	db: DB,
	data: {
		orgId: string;
		conversationId: string;
		waMessageId: string;
		direction: "in" | "out";
		messageType: string;
		content: string;
		payloadJson: Json;
		mode: "session" | "template";
	},
): Promise<void> {
	await db.from("wa_messages").insert({
		org_id: data.orgId,
		conversation_id: data.conversationId,
		wa_message_id: data.waMessageId,
		direction: data.direction,
		message_type: data.messageType,
		content: data.content,
		payload_json: data.payloadJson,
	});
}
