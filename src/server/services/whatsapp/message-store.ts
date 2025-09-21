import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { MediaRefSchema } from "~/schema/intake";
import type { Database } from "~/types/supabase";
import { fetchAndStoreMedia } from "./media";
import type { NormalizedMessage } from "./message-normalizer";

type DB = SupabaseClient<Database>;
type MediaRef = z.infer<typeof MediaRefSchema>;

export type PersistedWhatsAppConversation = {
	conversationId: string;
	waContactId: string;
	waConversationId: string;
	waMessageIds: string[];
	messageRowIds: string[];
	messageRowByWaId: Record<string, string>;
	lastMessageIso: string;
	summary: string;
	snippet: string;
	media: MediaRef[];
};

export async function persistWhatsAppMessages({
	messages,
	orgId,
	db,
}: {
	messages: NormalizedMessage[];
	orgId: string;
	db: DB;
}): Promise<PersistedWhatsAppConversation[]> {
	const byConversation = new Map<
		string,
		{
			conversationId: string;
			waContactId: string;
			waConversationId: string;
			waMessageIds: string[];
			messageRowIds: string[];
			lastMessage: NormalizedMessage;
			mediaRefs: MediaRef[];
			messageRowMap: Map<string, string>;
		}
	>();

	for (const message of messages) {
		const conversationUpsert = await db
			.from("wa_conversations")
			.upsert(
				{
					org_id: orgId,
					wa_contact_id: message.waContactId,
					phone_number: message.phoneNumber,
					last_message_at: message.timestampIso,
					status: "active",
				},
				{ onConflict: "org_id,wa_contact_id" },
			)
			.select("id")
			.single();

		const conversationId = conversationUpsert.data?.id;
		if (!conversationId) continue;

		const messageUpsert = await db
			.from("wa_messages")
			.upsert(
				{
					org_id: orgId,
					conversation_id: conversationId,
					wa_message_id: message.waMessageId,
					direction: "in",
					message_type: message.messageType,
					content: message.content ?? null,
					media_url: message.mediaUrl ?? null,
					payload_json:
						message as unknown as Database["public"]["Tables"]["wa_messages"]["Row"]["payload_json"],
					created_at: message.timestampIso,
				},
				{ onConflict: "wa_message_id" },
			)
			.select("id")
			.single();

		const messageRowId = messageUpsert.data?.id;
		if (!messageRowId) continue;

		const entry = byConversation.get(conversationId);
		if (!entry) {
			const mediaRefs: MediaRef[] = [];
			if (message.mediaId) {
				const mediaResult = await fetchAndStoreMedia({
					mediaId: message.mediaId,
					waMessageId: message.waMessageId,
					messageRowId,
					orgId,
					db,
				});
				if (mediaResult.success) {
					const parsedMedia = MediaRefSchema.parse({
						storageKey: mediaResult.storageKey,
						mime: mediaResult.mimeType ?? "application/octet-stream",
						byteSize: mediaResult.fileSize,
						checksumSha256: mediaResult.checksumSha256,
						source: "whatsapp" as const,
					});
					mediaRefs.push(parsedMedia);
				} else {
					console.warn(
						`Failed to persist media for message ${message.waMessageId}: ${mediaResult.error}`,
					);
				}
			}

			byConversation.set(conversationId, {
				conversationId,
				waContactId: message.waContactId,
				waConversationId: conversationId,
				waMessageIds: [message.waMessageId],
				messageRowIds: [messageRowId],
				lastMessage: message,
				mediaRefs,
				messageRowMap: new Map([[message.waMessageId, messageRowId]]),
			});
			continue;
		}

		entry.waMessageIds.push(message.waMessageId);
		entry.messageRowIds.push(messageRowId);
		entry.messageRowMap.set(message.waMessageId, messageRowId);
		if (message.mediaId) {
			const mediaResult = await fetchAndStoreMedia({
				mediaId: message.mediaId,
				waMessageId: message.waMessageId,
				messageRowId,
				orgId,
				db,
			});
			if (mediaResult.success) {
				const parsedMedia = MediaRefSchema.parse({
					storageKey: mediaResult.storageKey,
					mime: mediaResult.mimeType ?? "application/octet-stream",
					byteSize: mediaResult.fileSize,
					checksumSha256: mediaResult.checksumSha256,
					source: "whatsapp" as const,
				});
				entry.mediaRefs.push(parsedMedia);
			} else {
				console.warn(
					`Failed to persist media for message ${message.waMessageId}: ${mediaResult.error}`,
				);
			}
		}

		const hasNewerTimestamp =
			entry.lastMessage.timestampIso < message.timestampIso;
		if (hasNewerTimestamp) {
			entry.lastMessage = message;
		}
	}

	const conversations: PersistedWhatsAppConversation[] = [];

	for (const entry of byConversation.values()) {
		const { lastMessage } = entry;
		const summarySource =
			lastMessage.messageType === "text"
				? (lastMessage.content ?? "")
				: `${lastMessage.messageType.toUpperCase()} bericht`;
		const snippetSource = lastMessage.content ?? summarySource;

		conversations.push({
			conversationId: entry.conversationId,
			waContactId: entry.waContactId,
			waConversationId: entry.waConversationId,
			waMessageIds: entry.waMessageIds,
			messageRowIds: entry.messageRowIds,
			messageRowByWaId: Object.fromEntries(entry.messageRowMap.entries()),
			lastMessageIso: lastMessage.timestampIso,
			summary: summarySource,
			snippet: snippetSource,
			media: entry.mediaRefs,
		});
	}

	return conversations;
}
