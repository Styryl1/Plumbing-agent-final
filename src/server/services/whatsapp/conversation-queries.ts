import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
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
	session_expires_at?: string | null;
	last_inbound_at?: string | null;
	customer_name?: string | null;
	customer_id?: string | null;
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

	const { counts: unreadCounts, lastInboundByConversation } =
		await listUnreadCounts(db, orgId, userId, convoIds);

	const metaMap = new Map<
		string,
		{
			session_expires_at: string | null;
			customer_name: string | null;
			customer_id: string | null;
		}
	>();

	if (convoIds.length > 0) {
		const metaQuery = await db
			.from("wa_conversations")
			.select("id, session_expires_at, customer_id, customer:customers(name)")
			.in("id", convoIds)
			.eq("org_id", orgId);
		if (metaQuery.error) throw metaQuery.error;
		const metaRows = Array.isArray(metaQuery.data) ? metaQuery.data : [];
		for (const row of metaRows) {
			metaMap.set(row.id, {
				session_expires_at: row.session_expires_at,
				customer_name: row.customer?.name ?? null,
				customer_id: row.customer_id ?? null,
			});
		}
	}

	const itemsWithMeta = items.map((item) => {
		const conversationId = item.conversation_id;
		if (!conversationId) {
			return {
				...item,
				unread_count: 0,
				session_expires_at: null,
				last_inbound_at: null,
				customer_name: null,
			};
		}

		const meta = metaMap.get(conversationId);
		const lastInbound = lastInboundByConversation[conversationId] ?? null;
		let sessionExpiresAt = meta?.session_expires_at ?? null;
		if (!sessionExpiresAt && lastInbound) {
			try {
				const expiresInstant = Temporal.Instant.from(lastInbound).add({
					hours: 24,
				});
				sessionExpiresAt = expiresInstant.toString();
			} catch (error) {
				console.warn(
					"Failed to derive session expiration for conversation",
					conversationId,
					error,
				);
				sessionExpiresAt = null;
			}
		}

		return {
			...item,
			unread_count: unreadCounts[conversationId] ?? 0,
			session_expires_at: sessionExpiresAt,
			last_inbound_at: lastInbound,
			customer_name: meta?.customer_name ?? null,
			customer_id: meta?.customer_id ?? null,
		};
	});

	const nextCursor =
		hasMore && items.length > 0
			? (items[items.length - 1]?.last_message_at ?? null)
			: null;
	return { items: itemsWithMeta, nextCursor };
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
	userId: string,
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

	const leadIds = items
		.map((item) => item.conversation_id)
		.filter((id): id is string => typeof id === "string");

	let unreadCounts: Record<string, number> = {};
	let lastInboundByConversation: Record<string, string | null> = {};
	if (leadIds.length > 0) {
		const unreadResult = await listUnreadCounts(db, orgId, userId, leadIds);
		unreadCounts = unreadResult.counts;
		lastInboundByConversation = unreadResult.lastInboundByConversation;
	}

	const metaMap = new Map<
		string,
		{
			session_expires_at: string | null;
			customer_name: string | null;
			customer_id: string | null;
		}
	>();

	if (leadIds.length > 0) {
		const metaQuery = await db
			.from("wa_conversations")
			.select("id, session_expires_at, customer_id, customer:customers(name)")
			.in("id", leadIds)
			.eq("org_id", orgId);
		if (metaQuery.error) throw metaQuery.error;
		const metaRows = Array.isArray(metaQuery.data) ? metaQuery.data : [];
		for (const row of metaRows) {
			metaMap.set(row.id, {
				session_expires_at: row.session_expires_at,
				customer_name: row.customer?.name ?? null,
				customer_id: row.customer_id ?? null,
			});
		}
	}

	const itemsWithMeta = items.map((item) => {
		const conversationId = item.conversation_id;
		if (!conversationId) {
			return {
				...item,
				unread_count: 0,
				session_expires_at: null,
				last_inbound_at: null,
				customer_name: null,
			};
		}

		const meta = metaMap.get(conversationId);
		const lastInbound = lastInboundByConversation[conversationId] ?? null;
		let sessionExpiresAt = meta?.session_expires_at ?? null;
		if (!sessionExpiresAt && lastInbound) {
			try {
				const expiresInstant = Temporal.Instant.from(lastInbound).add({
					hours: 24,
				});
				sessionExpiresAt = expiresInstant.toString();
			} catch (error) {
				console.warn(
					"Failed to derive session expiration for lead conversation",
					conversationId,
					error,
				);
				sessionExpiresAt = null;
			}
		}

		return {
			...item,
			unread_count: unreadCounts[conversationId] ?? 0,
			session_expires_at: sessionExpiresAt,
			last_inbound_at: lastInbound,
			customer_name: meta?.customer_name ?? null,
			customer_id: meta?.customer_id ?? null,
		};
	});

	const nextCursor =
		hasMore && items.length > 0
			? (items[items.length - 1]?.last_message_at ?? null)
			: null;
	return { items: itemsWithMeta, nextCursor };
}
