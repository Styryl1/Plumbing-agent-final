import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverOnlyEnv } from "~/lib/env";
import {
	createTemplateParameters,
	generateReminderMessage,
	getWhatsAppTemplateName,
	type ReminderMessageData,
} from "~/server/services/whatsapp/templates";
import type { Database } from "~/types/supabase";

type DB = SupabaseClient<Database>;

export type WhatsAppSendResult =
	| { ok: true }
	| { ok: false; retry: boolean; code?: number; error?: string };

/**
 * Normalize Dutch phone numbers to E.164 format
 * Handles common Dutch phone number formats
 */
export function normalizeE164NL(input?: string | null): string | null {
	if (!input) return null;

	const cleaned = input.trim().replace(/[\s\-()]/g, "");

	// Already in E.164 format
	if (cleaned.startsWith("+")) return cleaned;

	// Dutch mobile/landline starting with 0
	if (cleaned.startsWith("0")) {
		return "+31" + cleaned.slice(1);
	}

	// Just digits, assume Dutch
	if (/^\d+$/.test(cleaned)) {
		return "+31" + cleaned;
	}

	return null;
}

/**
 * Send WhatsApp reminder using Meta Business API
 * Uses pre-approved templates for compliance
 */
export async function sendWhatsAppReminder(
	_db: DB,
	phone: string,
	messageData: ReminderMessageData,
): Promise<WhatsAppSendResult> {
	const accessToken = serverOnlyEnv.WHATSAPP_ACCESS_TOKEN;
	const businessPhoneId = serverOnlyEnv.WHATSAPP_BUSINESS_PHONE_ID;

	if (!accessToken || !businessPhoneId) {
		return {
			ok: false,
			retry: false,
			error: "WhatsApp not configured",
		};
	}

	// For development/testing, use text messages instead of templates
	const isDevelopment = serverOnlyEnv.NODE_ENV === "development";

	let payload: Record<string, unknown>;

	if (isDevelopment) {
		// Development: send as text message
		const message = generateReminderMessage(messageData);
		payload = {
			messaging_product: "whatsapp",
			to: phone,
			type: "text",
			text: { body: message },
		};
	} else {
		// Production: use approved templates
		const templateName = getWhatsAppTemplateName(messageData.daysOverdue);
		const templateParameters = createTemplateParameters(messageData);

		payload = {
			messaging_product: "whatsapp",
			to: phone,
			type: "template",
			template: {
				name: templateName,
				language: { code: "nl" },
				components: [
					{
						type: "body",
						parameters: templateParameters,
					},
				],
			},
		};
	}

	try {
		const response = await fetch(
			`https://graph.facebook.com/v19.0/${businessPhoneId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			},
		);

		if (
			response.status === 470 ||
			response.status === 471 ||
			(response.status >= 500 && response.status <= 599)
		) {
			// Transient API or server errors — retry per policy
			return {
				ok: false,
				retry: true,
				code: response.status,
			};
		}

		if (!response.ok) {
			// Permanent error - don't retry
			const errorText = await response.text();
			return {
				ok: false,
				retry: false,
				code: response.status,
				error: `HTTP ${response.status}: ${errorText}`,
			};
		}

		return { ok: true };
	} catch (error) {
		// Network errors - retry
		return {
			ok: false,
			retry: true,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}
