// AI Recommendation mapper - Transforms between database types and DTOs
// Enforces DTO boundary: DB → mapper → DTO → UI (never DB types in UI)
// Handles wa_suggestions table mapping with Temporal datetime conversion

import { parseZdt } from "~/lib/time";
import type { AiRecommendationDTO } from "~/types/ai";
import type { Tables } from "~/types/supabase";

const toNullableString = (value: unknown): string | null =>
	typeof value === "string" ? value : null;

const extractPhoneE164 = (value: unknown): string | null => {
	if (
		typeof value === "object" &&
		value !== null &&
		"phoneE164" in value &&
		typeof (value as { phoneE164?: unknown }).phoneE164 === "string"
	) {
		const trimmed = (value as { phoneE164: string }).phoneE164.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return null;
};

const firstNonNull = (...values: Array<string | null>): string | null => {
	for (const value of values) {
		if (value !== null) {
			return value;
		}
	}
	return null;
};

// === TYPE ALIASES FOR DATABASE LAYER ===

type DbWaSuggestion = Tables<"wa_suggestions">;
type DbWaConversation = Tables<"wa_conversations">;

// === DATABASE TO DTO MAPPER ===

/**
 * Transform database wa_suggestions row to AiRecommendationDTO
 * Includes optional customer info from conversation if provided
 */
export function toAiRecommendationDTO(
	row: DbWaSuggestion,
	conversation?: DbWaConversation,
	timezone?: string,
): AiRecommendationDTO {
	// Parse created_at timestamp to ISO string
	const createdZdt = parseZdt(row.created_at, timezone);
	const createdIso = createdZdt.toInstant().toString();

	// Build base DTO
	const confidenceScore =
		typeof row.confidence === "number" ? row.confidence : 0;
	const baseSummary = (row.summary ?? row.proposed_text).trim();
	const actionText = row.proposed_text;
	const normalizedSummary = baseSummary.length > 0 ? baseSummary : actionText;
	const truncatedTitle =
		normalizedSummary.length > 80
			? `${normalizedSummary.slice(0, 77)}...`
			: normalizedSummary.length > 0
				? normalizedSummary
				: "AI recommendation";

	const intakeEventId = firstNonNull(
		toNullableString(row.intake_event_id),
		toNullableString(conversation?.intake_event_id),
	);

	const conversationIdCandidate = firstNonNull(
		toNullableString(row.conversation_id),
		toNullableString(conversation?.id),
	);

	const payload =
		typeof row.payload === "object" && row.payload !== null
			? (row.payload as Record<string, unknown>)
			: null;

	const dto: AiRecommendationDTO = {
		id: row.id,
		createdIso,
		title: truncatedTitle,
		summary: normalizedSummary,
		actionText,
		confidence: Math.round(confidenceScore * 100), // Convert 0-1 to 0-100
		confidenceScore,
		intakeEventId,
		conversationId: conversationIdCandidate,
		channel: row.channel as AiRecommendationDTO["channel"],
		urgency: row.urgency as "low" | "medium" | "high",
		tags: row.tags,
		source: row.source as "rule" | "openai",
		payload,
	};

	// Add customer info from conversation if available
	if (conversation) {
		dto.customer = {
			phoneE164: conversation.phone_number,
		};
	}

	if (dto.customer == null && payload !== null) {
		const phoneValue = extractPhoneE164(payload.customer);
		if (phoneValue) {
			dto.customer = {
				phoneE164: phoneValue,
			};
		}
	}

	// Add time estimate if available (checking only for null)
	if (row.time_estimate_min !== null) {
		dto.estimate = {
			durationMinutes: row.time_estimate_min,
		};
	}

	if (Array.isArray(row.materials_stub) && row.materials_stub.length > 0) {
		dto.materialsStub = row.materials_stub;
	}

	if (row.time_stub !== null && row.time_stub.length > 0) {
		dto.timeStub = row.time_stub;
	}

	return dto;
}
