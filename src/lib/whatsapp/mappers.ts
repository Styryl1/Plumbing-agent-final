import type {
	LeadDTO,
	MessageDTO,
	SessionInfoDTO,
} from "~/server/dto/whatsapp";

/**
 * Client-side mapper utilities for WhatsApp data
 * These are safe to use in UI components
 */

export function mapToLeadDTO(serverData: {
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

export function mapToMessageDTO(serverData: {
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

export function mapToSessionInfoDTO(
	lastInboundAt: string | null,
): SessionInfoDTO {
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
