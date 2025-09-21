import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import type { Database } from "~/types/supabase";

type DB = SupabaseClient<Database>;

type WebhookProvider =
	| "moneybird"
	| "mollie"
	| "whatsapp"
	| "clerk"
	| "messagebird";

type RecordWebhookEventParams = {
	eventId: string;
	provider: WebhookProvider;
	db: DB;
	eventType?: string;
	entityType?: string;
	entityId?: string;
	orgId?: string | null;
};

type WebhookDuplicateParams = {
	eventId: string;
	provider: WebhookProvider;
	db: DB;
};

export async function isWebhookEventDuplicate({
	eventId,
	provider,
	db,
}: WebhookDuplicateParams): Promise<boolean> {
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
}: RecordWebhookEventParams): Promise<void> {
	const processedAt = Temporal.Now.instant().toString();
	await db.from("webhook_events").insert({
		webhook_id: eventId,
		provider,
		event_type: eventType ?? "event",
		entity_type: entityType ?? "intake",
		entity_id: entityId ?? eventId,
		org_id: orgId ?? null,
		processed_at: processedAt,
	});
}
