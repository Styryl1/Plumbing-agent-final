import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { env } from "~/lib/env";
import type { Database } from "~/types/supabase";
import { isWithin24h } from "./session";
import { MetaSendResponseSchema } from "./zod";

type DB = SupabaseClient<Database>;

interface MessagePayload {
	mode: "session" | "template";
	templateName?: string;
	templateLang?: string;
	createdAt: string;
	error?: boolean;
	status?: string;
}

export const SendTextInput = z.object({
	conversationId: z.uuid(),
	text: z.string().min(1).max(1000),
	templateName: z.string().default("utility_reengage").optional(), // pre-approved template
	templateLang: z.string().default("en").optional(),
});

async function getConversation(
	db: DB,
	orgId: string,
	conversationId: string,
): Promise<{
	id: string;
	org_id: string;
	wa_contact_id: string;
	phone_number: string;
	last_message_at: string;
}> {
	const { data, error } = await db
		.from("wa_conversations")
		.select("id, org_id, wa_contact_id, phone_number, last_message_at")
		.eq("id", conversationId)
		.eq("org_id", orgId)
		.single();
	if (error) throw error;
	return data;
}

export async function sendTextMessage(
	db: DB,
	orgId: string,
	input: z.infer<typeof SendTextInput>,
): Promise<{ ok: boolean; mode: "session" | "template"; meta: unknown }> {
	const {
		conversationId,
		text,
		templateName = "utility_reengage",
		templateLang = "en",
	} = input;
	const convo = await getConversation(db, orgId, conversationId);
	const nowIso = Temporal.Now.instant().toString();

	const inSession = isWithin24h(convo.last_message_at);
	const pnid = convo.phone_number; // receiving number id we send from
	const to = convo.wa_contact_id; // WhatsApp user id

	// Persist optimistic "out" message immediately (payload_json captures decision)
	const outInsert = await db
		.from("wa_messages")
		.insert({
			org_id: orgId,
			conversation_id: convo.id,
			wa_message_id: `out_${conversationId}_${Temporal.Now.instant().epochMilliseconds}`, // local synthetic id
			direction: "out",
			message_type: "text",
			content: text,
			media_url: null,
			payload_json: {
				mode: inSession ? "session" : "template",
				templateName,
				templateLang,
				createdAt: nowIso,
			} satisfies MessagePayload,
			created_at: nowIso,
		})
		.select("id")
		.single();
	if (outInsert.error) throw outInsert.error;

	// Call Meta API (S2 minimal; replace fetch with your HTTP client wrapper if you have one)
	const url = `https://graph.facebook.com/v20.0/${pnid}/messages`;
	const headers = {
		Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
		"Content-Type": "application/json",
	};

	const body = inSession
		? {
				messaging_product: "whatsapp",
				to,
				type: "text",
				text: { body: text },
			}
		: {
				messaging_product: "whatsapp",
				to,
				type: "template",
				template: {
					name: templateName,
					language: { code: templateLang },
					components: [{ type: "body", parameters: [{ type: "text", text }] }],
				},
			};

	// Network fire-and-forget; webhook delivery will confirm later
	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
	const ok = res.ok;

	// Parse response for ID reconciliation
	const json: unknown = await res.json().catch(() => ({}));
	const meta = MetaSendResponseSchema.parse(json);

	// Update the optimistic row with real Meta id if present
	const realId = meta.messages?.[0]?.id;
	if (ok && realId && realId.length > 0) {
		await db
			.from("wa_messages")
			.update({
				wa_message_id: realId,
				status: "sent",
				payload_json: {
					...(body.type === "template"
						? { mode: "template" }
						: { mode: "session" }),
					sentAt: nowIso,
				},
			})
			.eq("id", outInsert.data.id);
	} else if (!ok) {
		await db
			.from("wa_messages")
			.update({
				status: "failed",
				payload_json: {
					...(body.type === "template"
						? { mode: "template" }
						: { mode: "session" }),
					error: true,
					errorMessage: meta.error?.message ?? "send_failed",
				},
			})
			.eq("id", outInsert.data.id);
	}

	// Record audit row in webhook_events (reuse that table)
	const messageId = outInsert.data.id;
	await db.from("webhook_events").insert({
		webhook_id: `send_${messageId}`,
		provider: "whatsapp",
		event_type: "outbound_send",
		entity_type: "message",
		entity_id: messageId,
		org_id: orgId,
		processed_at: nowIso,
	});

	return { ok, mode: inSession ? "session" : "template", meta };
}
