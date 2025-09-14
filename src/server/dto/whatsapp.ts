import { useTranslations } from "next-intl";
import { z } from "zod";

/**
 * DTO for WhatsApp conversation lead in the leads list
 * Used by the operator UI to display conversation summaries
 */
export const LeadDTO = z.object({
	id: z.uuid(),
	name: z.string().nullable(),
	phoneMasked: z.string(),
	lastMessageAt: z.string(),
	lastSnippet: z.string(),
	unreadCount: z.number().int().min(0),
	sessionActive: z.boolean(),
});
export type LeadDTO = z.infer<typeof LeadDTO>;

/**
 * DTO for WhatsApp message in conversation view
 * Used by the operator UI to display message history
 */
export const MessageDTO = z.object({
	id: z.uuid(),
	conversationId: z.uuid(),
	dir: z.enum(["in", "out"]),
	text: z.string().optional(),
	mediaUrl: z.string().optional(),
	createdAt: z.string(),
});
export type MessageDTO = z.infer<typeof MessageDTO>;

/**
 * DTO for WhatsApp session information
 * Used by the operator UI to show session status and handle composer logic
 */
export const SessionInfoDTO = z.object({
	active: z.boolean(),
	expiresAt: z.string().optional(),
});
export type SessionInfoDTO = z.infer<typeof SessionInfoDTO>;

/**
 * Map server conversation data to LeadDTO for leads list
 * Handles phone masking and session status calculation
 */
export function toLeadDTO(serverData: {
	conversation_id: string | null;
	phone_number: string | null;
	last_message_at: string | null;
	last_message_snippet?: string | null;
	unread_count?: number;
}): LeadDTO {
	// For now, assume all sessions are active (TODO: implement proper session tracking)
	const sessionActive = true;

	// Mask phone number for privacy
	const phoneMasked = serverData.phone_number
		? `+${serverData.phone_number.slice(0, 3)}***${serverData.phone_number.slice(-3)}`
		: "Unknown";

	return {
		id: serverData.conversation_id ?? "unknown",
		name: null, // TODO: Add customer name from joined query
		phoneMasked,
		lastMessageAt:
			serverData.last_message_at ??
			globalThis.Temporal.Now.instant().toString(),
		lastSnippet: serverData.last_message_snippet ?? "No message content",
		unreadCount: serverData.unread_count ?? 0,
		sessionActive,
	};
}

/**
 * Map server message data to MessageDTO for conversation view
 * Handles direction mapping and timestamp formatting
 */
export function toMessageDTO(serverData: {
	id: string;
	wa_message_id: string;
	direction: string;
	message_type: string;
	content: string | null;
	media_url: string | null;
	created_at: string;
}): MessageDTO {
	return {
		id: serverData.id,
		conversationId: serverData.wa_message_id, // Using wa_message_id as conversation identifier for now
		dir: serverData.direction === "inbound" ? "in" : "out",
		text: serverData.content ?? undefined,
		mediaUrl: serverData.media_url ?? undefined,
		createdAt: serverData.created_at,
	};
}

/**
 * Calculate session info from conversation data
 * Used by composer to determine if session messages are allowed
 */
export function toSessionInfoDTO(lastInboundAt: string | null): SessionInfoDTO {
	if (!lastInboundAt) {
		return { active: false };
	}

	const lastInbound = globalThis.Temporal.Instant.from(lastInboundAt);
	const now = globalThis.Temporal.Now.instant();
	const sessionWindow = globalThis.Temporal.Duration.from({ hours: 24 });
	const timeSinceLastInbound = now.since(lastInbound);

	const active =
		globalThis.Temporal.Duration.compare(timeSinceLastInbound, sessionWindow) <
		0;
	const expiresAt = active
		? lastInbound.add(sessionWindow).toString()
		: undefined;

	return {
		active,
		expiresAt,
	};
}
