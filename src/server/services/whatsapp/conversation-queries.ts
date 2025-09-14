import type { SupabaseClient } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { z } from "zod";
import type { Database } from "~/types/supabase";
import { listUnreadCounts } from "./conversation-unread";

export type DB = SupabaseClient<Database>;

type ConversationRow = {
	conversation_id: string | null;
	wa_contact_id: string | null;
	phone_number: string | null;
	status: string | null;
	last_message_at: string | null;
	last_message_type: string | null;
	last_message_snippet: string | null;
	unread_count?: number;
};

type MessageRow = {
	id: string;
	wa_message_id: string;
	direction: string;
	message_type: string;
	content: string | null;
	media_url: string | null;
	created_at: string;
};

export const ListConversationsInput = z.object({
	limit: z.number().int().min(1).max(50).default(20),
	cursor: z.string().nullish(), // ISO string cursor based on last_message_at
	status: z.enum(["active", "closed"]).optional(),
});

export async function listConversations(
	db: DB,
	orgId: string,
	userId: string,
	input: z.infer<typeof ListConversationsInput>,
): Promise<{ items: ConversationRow[]; nextCursor: string | null }> {
	const { limit, cursor, status } = input;
	let q = db
		.from("vw_wa_conversation_last")
		.select(
			"conversation_id,wa_contact_id,phone_number,status,last_message_at,last_message_type,last_message_snippet",
		)
		.eq("org_id", orgId)
		.order("last_message_at", { ascending: false })
		.limit(limit + 1);
	if (status !== undefined) q = q.eq("status", status);
	if (cursor) q = q.lt("last_message_at", cursor);
	const { data, error } = await q;
	if (error) throw error;
	const hasMore = data.length > limit;
	const items = hasMore ? data.slice(0, limit) : data;

	// Add unread counts
	const convoIds = items
		.map((i) => i.conversation_id)
		.filter((id): id is string => id !== null);

	const unreadMap = await listUnreadCounts(db, orgId, userId, convoIds);
	const itemsWithUnread = items.map((i) => ({
		...i,
		unread_count: unreadMap[i.conversation_id as string] ?? 0,
	}));

	const nextCursor =
		hasMore && items.length > 0
			? (items[items.length - 1]?.last_message_at ?? null)
			: null;
	return { items: itemsWithUnread, nextCursor };
}

export const GetMessagesInput = z.object({
	conversationId: z.uuid(),
	limit: z.number().int().min(1).max(100).default(50),
	cursor: z.string().nullish(), // ISO created_at for keyset pagination
});

export async function getMessages(
	db: DB,
	orgId: string,
	input: z.infer<typeof GetMessagesInput>,
): Promise<{ items: MessageRow[]; nextCursor: string | null }> {
	const { conversationId, limit, cursor } = input;
	// Validate conversation ownership
	const c = await db
		.from("wa_conversations")
		.select("id")
		.eq("id", conversationId)
		.eq("org_id", orgId)
		.single();
	if (c.error) throw c.error;

	let q = db
		.from("wa_messages")
		.select(
			"id,wa_message_id,direction,message_type,content,media_url,created_at",
		)
		.eq("conversation_id", conversationId)
		.order("created_at", { ascending: false })
		.limit(limit + 1);
	if (cursor) q = q.lt("created_at", cursor);
	const { data, error } = await q;
	if (error) throw error;
	const hasMore = data.length > limit;
	const items = (hasMore ? data.slice(0, limit) : data).reverse(); // return ascending
	const nextCursor =
		hasMore && items.length > 0 ? (items[0]?.created_at ?? null) : null;
	return { items, nextCursor };
}

export const ToggleStatusInput = z.object({
	conversationId: z.uuid(),
	status: z.enum(["active", "closed"]),
});

export async function toggleStatus(
	db: DB,
	orgId: string,
	input: z.infer<typeof ToggleStatusInput>,
): Promise<{ ok: boolean }> {
	const { conversationId, status } = input;
	const { error } = await db
		.from("wa_conversations")
		.update({ status })
		.eq("id", conversationId)
		.eq("org_id", orgId);
	if (error) throw error;
	return { ok: true };
}

export const ListLeadsInput = z.object({
	limit: z.number().int().min(1).max(50).default(20),
	cursor: z.string().nullish(),
});

export async function listLeads(
	db: DB,
	orgId: string,
	input: z.infer<typeof ListLeadsInput>,
): Promise<{ items: ConversationRow[]; nextCursor: string | null }> {
	const { limit, cursor } = input;
	// Heuristic lead = customer conversation with no linked customer_id and status active
	let q = db
		.from("vw_wa_conversation_last")
		.select(
			"conversation_id,wa_contact_id,phone_number,status,last_message_at,last_message_type,last_message_snippet",
		)
		.eq("org_id", orgId)
		.eq("status", "active")
		.order("last_message_at", { ascending: false })
		.limit(limit + 1);
	if (cursor) q = q.lt("last_message_at", cursor);
	const { data, error } = await q;
	if (error) throw error;
	const convoIds = data
		.map((d) => d.conversation_id)
		.filter((id): id is string => id !== null);
	if (convoIds.length === 0) return { items: [], nextCursor: null };
	// Filter out any conversation already linked to a customer/job
	const link = await db
		.from("wa_conversations")
		.select("id,customer_id")
		.in("id", convoIds);
	const linked = new Set(
		(link.data ?? []).filter((x) => x.customer_id !== null).map((x) => x.id),
	);
	const filtered = data.filter(
		(d) => d.conversation_id !== null && !linked.has(d.conversation_id),
	);
	const hasMore = filtered.length > limit;
	const items = hasMore ? filtered.slice(0, limit) : filtered;
	const nextCursor =
		hasMore && items.length > 0
			? (items[items.length - 1]?.last_message_at ?? null)
			: null;
	return { items, nextCursor };
}
