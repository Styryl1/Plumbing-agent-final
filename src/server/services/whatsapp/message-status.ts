import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";
import type { NormalizedStatus } from "./message-normalizer";

type DB = SupabaseClient<Database>;

/**
 * Update wa_messages.status and payload_json for Meta status events.
 * Only affects rows with matching wa_message_id (outbound messages).
 */
export async function applyStatuses(
	db: DB,
	orgId: string,
	list: NormalizedStatus[],
): Promise<void> {
	for (const s of list) {
		// Best effort update; ignore if not found or belongs to other org (RLS handles org)
		await db
			.from("wa_messages")
			.update({
				status: s.status,
				payload_json: {
					status: s.status,
					statusAt: s.timestampIso,
					errorTitle: s.errorTitle ?? null,
					errorCode: s.errorCode ?? null,
				},
			})
			.eq("wa_message_id", s.waMessageId)
			.eq("org_id", orgId);
	}
}
