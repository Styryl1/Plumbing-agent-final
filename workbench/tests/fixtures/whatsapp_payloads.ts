import { Temporal } from "temporal-polyfill";
import { randomUUID } from "crypto";

/**
 * WhatsApp Business API payload fixtures for comprehensive testing
 */

export function createWhatsAppPayload(opts: {
	phoneNumberId: string;
	changes: Array<{
		field: string;
		value: any;
	}>;
	entryId?: string;
	timestamp?: string;
}) {
	const ts = opts.timestamp ?? Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
	
	return {
		object: "whatsapp_business_account",
		entry: [{
			id: opts.entryId ?? "test_entry_id",
			time: Number(ts),
			changes: opts.changes
		}]
	};
}

/**
 * Text message payloads
 */
export const textMessagePayloads = {
	simple: (phoneId: string, from: string) => createWhatsAppPayload({
		phoneNumberId: phoneId,
		changes: [{
			field: "messages",
			value: {
				messaging_product: "whatsapp",
				metadata: { phone_number_id: phoneId },
				contacts: [{ wa_id: from }],
				messages: [{
					from,
					id: `wamid.${randomUUID()}`,
					timestamp: Math.floor(Temporal.Now.instant().epochMilliseconds / 1000).toString(),
					type: "text",
					text: { body: "Simple text message" }
				}]
			}
		}]
	}),

	withEmojis: (phoneId: string, from: string) => createWhatsAppPayload({
		phoneNumberId: phoneId,
		changes: [{
			field: "messages", 
			value: {
				messaging_product: "whatsapp",
				metadata: { phone_number_id: phoneId },
				contacts: [{ wa_id: from }],
				messages: [{
					from,
					id: `wamid.${randomUUID()}`,
					timestamp: Math.floor(Temporal.Now.instant().epochMilliseconds / 1000).toString(),
					type: "text",
					text: { body: "🚰 Emergency plumber needed! 🔧💧 ASAP!" }
				}]
			}
		}]
	}),

	maxLength: (phoneId: string, from: string) => createWhatsAppPayload({
		phoneNumberId: phoneId,
		changes: [{
			field: "messages",
			value: {
				messaging_product: "whatsapp",
				metadata: { phone_number_id: phoneId },
				contacts: [{ wa_id: from }],
				messages: [{
					from,
					id: `wamid.${randomUUID()}`,
					timestamp: Math.floor(Temporal.Now.instant().epochMilliseconds / 1000).toString(),
					type: "text",
					text: { body: "A".repeat(4096) } // Max WhatsApp text length
				}]
			}
		}]
	})
};

/**
 * Status update payloads
 */
export const statusUpdatePayloads = {
	sent: (phoneId: string, messageId: string) => createWhatsAppPayload({
		phoneNumberId: phoneId,
		changes: [{
			field: "messages",
			value: {
				messaging_product: "whatsapp",
				metadata: { phone_number_id: phoneId },
				statuses: [{
					id: messageId,
					status: "sent",
					timestamp: Math.floor(Temporal.Now.instant().epochMilliseconds / 1000).toString(),
					recipient_id: "recipient_phone_number"
				}]
			}
		}]
	}),

	delivered: (phoneId: string, messageId: string) => createWhatsAppPayload({
		phoneNumberId: phoneId,
		changes: [{
			field: "messages",
			value: {
				messaging_product: "whatsapp",
				metadata: { phone_number_id: phoneId },
				statuses: [{
					id: messageId,
					status: "delivered",
					timestamp: Math.floor(Temporal.Now.instant().epochMilliseconds / 1000).toString(),
					recipient_id: "recipient_phone_number"
				}]
			}
		}]
	})
};