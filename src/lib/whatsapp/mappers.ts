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
	session_expires_at?: string | null;
	last_inbound_at?: string | null;
	customer_name?: string | null;
}): LeadDTO {
	// Mask phone number for privacy
	const phoneMasked = serverData.phone_number
		? `+${serverData.phone_number.slice(0, 3)}***${serverData.phone_number.slice(-3)}`
		: "Unknown";

	let sessionExpiresAt: string | null = null;
	if (
		typeof serverData.session_expires_at === "string" &&
		serverData.session_expires_at.length > 0
	) {
		sessionExpiresAt = serverData.session_expires_at;
	} else if (
		typeof serverData.last_inbound_at === "string" &&
		serverData.last_inbound_at.length > 0
	) {
		try {
			const expires = globalThis.Temporal.Instant.from(
				serverData.last_inbound_at,
			).add({ hours: 24 });
			sessionExpiresAt = expires.toString();
		} catch (error) {
			console.warn(
				"Failed to calculate session expiry for conversation",
				serverData.conversation_id,
				error,
			);
			sessionExpiresAt = null;
		}
	}

	let sessionActive = false;
	if (sessionExpiresAt) {
		try {
			const expiresInstant = globalThis.Temporal.Instant.from(sessionExpiresAt);
			const now = globalThis.Temporal.Now.instant();
			sessionActive =
				globalThis.Temporal.Instant.compare(expiresInstant, now) > 0;
		} catch (error) {
			console.warn(
				"Failed to parse session expiry for conversation",
				serverData.conversation_id,
				error,
			);
			sessionActive = false;
		}
	}

	return {
		id: serverData.conversation_id ?? "unknown",
		name: serverData.customer_name ?? null,
		phoneMasked,
		lastMessageAt:
			serverData.last_message_at ??
			globalThis.Temporal.Now.instant().toString(),
		lastSnippet: serverData.last_message_snippet ?? "No message content",
		unreadCount: serverData.unread_count ?? 0,
		sessionActive,
		sessionExpiresAt,
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

export function mapToSessionInfoDTO({
	lastInboundAt,
	sessionExpiresAt,
}: {
	lastInboundAt?: string | null;
	sessionExpiresAt?: string | null;
}): SessionInfoDTO {
	let expiresAt = sessionExpiresAt ?? null;

	if (!expiresAt && lastInboundAt) {
		try {
			expiresAt = globalThis.Temporal.Instant.from(lastInboundAt)
				.add({ hours: 24 })
				.toString();
		} catch (error) {
			console.warn("Failed to derive session expiry", error);
			expiresAt = null;
		}
	}

	if (!expiresAt) {
		return { active: false };
	}

	const now = globalThis.Temporal.Now.instant();
	let active = false;
	try {
		const expiresInstant = globalThis.Temporal.Instant.from(expiresAt);
		active = globalThis.Temporal.Instant.compare(expiresInstant, now) > 0;
	} catch (error) {
		console.warn("Failed to parse session expiry", error);
		active = false;
	}

	return {
		active,
		expiresAt: active ? expiresAt : undefined,
	};
}
