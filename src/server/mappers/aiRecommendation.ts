// AI Recommendation mapper - Transforms between database types and DTOs
// Enforces DTO boundary: DB → mapper → DTO → UI (never DB types in UI)
// Handles wa_suggestions table mapping with Temporal datetime conversion

import { parseZdt } from "~/lib/time";
import type { Tables } from "~/types/supabase";

// === TYPE ALIASES FOR DATABASE LAYER ===

type DbWaSuggestion = Tables<"wa_suggestions">;
type DbWaConversation = Tables<"wa_conversations">;

// === DTO TYPE DEFINITION ===

export type AiRecommendationDTO = {
	id: string;
	createdIso: string; // ISO datetime string
	title: string;
	summary?: string;
	confidence: number; // 0..100
	customer?: { name?: string; phoneE164?: string };
	estimate?: {
		durationMinutes?: number;
		materials?: Array<{ name: string; qty: number; unit?: string }>;
	};
	media?: string[];
	urgency: "low" | "medium" | "high";
	tags: string[];
	source: "rule" | "openai";
};

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
	const dto: AiRecommendationDTO = {
		id: row.id,
		createdIso,
		title: row.proposed_text,
		confidence: Math.round(row.confidence * 100), // Convert 0-1 to 0-100
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

	return dto;
}
