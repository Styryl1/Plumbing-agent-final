import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import type { Database } from "~/types/supabase";
import type { NormalizedMessage } from "./message-normalizer";

type DB = SupabaseClient<Database>;

export async function persistWhatsAppMessages({
	messages,
	orgId,
	db,
}: {
	messages: NormalizedMessage[];
	orgId: string;
	db: DB;
}): Promise<void> {
	for (const m of messages) {
		// Upsert conversation by (org_id, wa_contact_id)
		const upsert = await db
			.from("wa_conversations")
			.upsert(
				{
					org_id: orgId,
					wa_contact_id: m.waContactId,
					phone_number: m.phoneNumber,
					last_message_at: m.timestampIso,
					status: "active",
				},
				{ onConflict: "org_id,wa_contact_id" },
			)
			.select("id")
			.single();

		const conversationId = upsert.data?.id;
		if (!conversationId) continue;

		// Idempotent insert (unique wa_message_id)
		await db.from("wa_messages").upsert(
			{
				org_id: orgId,
				conversation_id: conversationId,
				wa_message_id: m.waMessageId,
				direction: "in", // inbound in S0
				message_type: m.messageType,
				content: m.content ?? null,
				media_url: m.mediaUrl ?? null,
				payload_json:
					m as unknown as Database["public"]["Tables"]["wa_messages"]["Row"]["payload_json"],
				created_at: m.timestampIso,
			},
			{ onConflict: "wa_message_id", ignoreDuplicates: true },
		);
	}
}

export async function isWebhookEventDuplicate({
	eventId,
	provider,
	db,
}: {
	eventId: string;
	provider: string;
	db: DB;
}): Promise<boolean> {
	const { count, error } = await db
		.from("webhook_events")
		.select("id", { head: true, count: "exact" })
		.eq("webhook_id", eventId)
		.eq("provider", provider);

	if (error) return false;
	return (count ?? 0) > 0;
}

export async function recordWebhookEvent({
	eventId,
	provider,
	db,
	eventType,
	entityType,
	entityId,
	orgId,
}: {
	eventId: string;
	provider: string;
	db: DB;
	eventType?: string;
	entityType?: string;
	entityId?: string;
	orgId?: string | null;
}): Promise<void> {
	const processedAt = Temporal.Now.instant().toString();
	await db.from("webhook_events").insert({
		webhook_id: eventId,
		provider,
		event_type: eventType ?? "message",
		entity_type: entityType ?? "whatsapp",
		entity_id: entityId ?? eventId,
		org_id: orgId ?? null,
		processed_at: processedAt,
	});
}
