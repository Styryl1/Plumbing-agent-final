import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { rowsOrEmpty } from "~/server/db/unwrap";
import type { Database } from "~/types/supabase";

type DB = SupabaseClient<Database>;

export const MarkReadInput = z.object({
	conversationId: z.uuid(),
	// Optional override: mark read up to a specific inbound message timestamp (ISO)
	upToCreatedAtIso: z.string().optional(),
});

type UnreadCountsResult = {
	counts: Record<string, number>;
	lastInboundByConversation: Record<string, string | null>;
};

export async function listUnreadCounts(
	db: DB,
	orgId: string,
	userId: string,
	conversationIds: string[],
): Promise<UnreadCountsResult> {
	if (conversationIds.length === 0) {
		return {
			counts: {},
			lastInboundByConversation: {},
		};
	}

	// Regular query approach (portable):
	const respRows = await db
		.from("wa_messages")
		.select("conversation_id, created_at")
		.in("conversation_id", conversationIds)
		.eq("org_id", orgId)
		.eq("direction", "in");
	const rows = rowsOrEmpty(respRows);

	const respMarkers = await db
		.from("wa_read_markers")
		.select("conversation_id, last_read_at")
		.eq("org_id", orgId)
		.eq("user_id", userId)
		.in("conversation_id", conversationIds);
	const markers = rowsOrEmpty(respMarkers);

	const lastReadByConvo = new Map<string, string | null>();
	const counts: Record<string, number> = {};
	const lastInboundByConversation: Record<string, string | null> = {};

	const zeroUnread = 0;
	const noInbound: string | null = null;
	for (let i = 0; i < conversationIds.length; i += 1) {
		const conversationId = conversationIds[i]!;
		counts[conversationId] = zeroUnread;
		lastInboundByConversation[conversationId] = noInbound;
	}

	// Lint-clean iteration (no truthiness, no ??)
	for (let i = 0; i < markers.length; i += 1) {
		const marker = markers[i]!;
		lastReadByConvo.set(marker.conversation_id, marker.last_read_at);
	}

	for (let i = 0; i < rows.length; i += 1) {
		const message = rows[i]!;
		const cid = message.conversation_id;
		const existingInbound = lastInboundByConversation[cid] ?? null;
		if (existingInbound === null || existingInbound < message.created_at) {
			lastInboundByConversation[cid] = message.created_at;
		}
		const lastRead = lastReadByConvo.get(cid);
		if (
			lastRead === null ||
			lastRead === undefined ||
			message.created_at > lastRead
		) {
			const prev = counts[cid];
			counts[cid] = (typeof prev === "number" ? prev : 0) + 1;
		}
	}

	return {
		counts,
		lastInboundByConversation,
	};
}

export async function markConversationRead(
	db: DB,
	orgId: string,
	userId: string,
	input: z.infer<typeof MarkReadInput>,
): Promise<{ ok: true; last_read_at: string }> {
	// Resolve a timestamp to write
	let lastReadIso = input.upToCreatedAtIso;
	if (!lastReadIso) {
		const { data: last } = await db
			.from("wa_messages")
			.select("created_at")
			.eq("org_id", orgId)
			.eq("direction", "in")
			.eq("conversation_id", input.conversationId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		lastReadIso = last?.created_at ?? undefined;
	}
	if (!lastReadIso || lastReadIso.length === 0) {
		return {
			ok: true,
			last_read_at: Temporal.Instant.fromEpochMilliseconds(0).toString(),
		};
	}

	// Upsert marker with max(existing, new)
	const { data: existing } = await db
		.from("wa_read_markers")
		.select("last_read_at")
		.eq("org_id", orgId)
		.eq("user_id", userId)
		.eq("conversation_id", input.conversationId)
		.maybeSingle();

	const nextIso =
		existing?.last_read_at && existing.last_read_at > lastReadIso
			? existing.last_read_at
			: lastReadIso;

	const { error } = await db.from("wa_read_markers").upsert({
		org_id: orgId,
		user_id: userId,
		conversation_id: input.conversationId,
		last_read_at: nextIso,
		updated_at: nextIso,
	});
	if (error) throw error;

	return { ok: true, last_read_at: nextIso };
}
