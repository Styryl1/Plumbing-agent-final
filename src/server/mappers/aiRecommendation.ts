// AI Recommendation mapper - Transforms between database types and DTOs
// Enforces DTO boundary: DB → mapper → DTO → UI (never DB types in UI)
// Handles wa_suggestions table mapping with Temporal datetime conversion

import { parseZdt } from "~/lib/time";
import type { AiRecommendationDTO } from "~/types/ai";
import type { Tables } from "~/types/supabase";

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
): AiRecommendationDTO {
	// Parse created_at timestamp to ISO string
	const createdZdt = parseZdt(row.created_at);
	const createdIso = createdZdt.toInstant().toString();

	// Build base DTO
	const confidenceScore =
		typeof row.confidence === "number" ? row.confidence : 0;
	const dto: AiRecommendationDTO = {
		id: row.id,
		createdIso,
		title: row.proposed_text,
		confidence: Math.round(confidenceScore * 100), // Convert 0-1 to 0-100
		confidenceScore,
		intakeEventId: conversation?.intake_event_id ?? null,
		conversationId: conversation?.id ?? null,
		urgency: row.urgency as "low" | "medium" | "high",
		tags: row.tags,
		source: row.source as "rule" | "openai",
	};

	// Add optional summary (using proposed_text as both title and summary for now)
	if (row.proposed_text.length > 50) {
		dto.summary = row.proposed_text;
		dto.title = row.proposed_text.slice(0, 50) + "...";
	}

	// Add customer info from conversation if available
	if (conversation) {
		dto.customer = {
			phoneE164: conversation.phone_number,
		};
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

	if (row.time_stub && row.time_stub.length > 0) {
		dto.timeStub = row.time_stub;
	}

	return dto;
}
