import { describe, expect, it } from "vitest";
import { toAiRecommendationDTO } from "~/server/mappers/aiRecommendation";
import type { Tables } from "~/types/supabase";

describe("toAiRecommendationDTO", () => {
	const baseRow: Tables<"wa_suggestions"> = {
		id: "00000000-0000-0000-0000-000000000001",
		org_id: "org-1",
		conversation_id: null,
		message_id: null,
		intake_event_id: "11111111-1111-1111-1111-111111111111",
		proposed_text: "Plan een spoedbezoek en neem pomp mee",
		summary: "Klant meldt dat kruipruimte vol water staat",
		tags: ["lekkage"],
		urgency: "high",
		confidence: 0.82,
		time_estimate_min: 120,
		materials_stub: ["Dompelpomp"],
		time_stub: "120 minuten",
		source: "openai",
		created_at: "2025-09-26T10:00:00.000Z",
		approved_at: null,
		approved_by: null,
		rejected_at: null,
		rejected_by: null,
		rejection_reason: null,
		status: "pending",
		job_id: null,
		channel: "voice",
		payload: {
			job: {
				title: "Noodreparatie kruipruimte",
				description: "Waterstand meten en dompelpomp plaatsen",
				durationMinutes: 120,
				priority: "emergency",
			},
			notes: ["Controleer hoofdkraan", "Neem extra slangen mee"],
		},
	};

	it("maps voice recommendation fields", () => {
		const dto = toAiRecommendationDTO(baseRow, undefined, "Europe/Amsterdam");

		expect(dto.channel).toBe("voice");
		expect(dto.intakeEventId).toBe(baseRow.intake_event_id);
		expect(dto.summary).toBe(baseRow.summary);
		expect(dto.actionText).toBe(baseRow.proposed_text);
		expect(dto.estimate?.durationMinutes).toBe(120);
		expect(dto.confidenceScore).toBeCloseTo(baseRow.confidence);
		expect(dto.materialsStub).toEqual(baseRow.materials_stub);
		expect(dto.payload).not.toBeNull();
	});

	it("falls back to proposed text when summary missing", () => {
		const dto = toAiRecommendationDTO(
			{ ...baseRow, summary: null, proposed_text: "Maak job aan" },
			undefined,
			"Europe/Amsterdam",
		);

		expect(dto.summary).toBe("Maak job aan");
		expect(dto.title).toContain("Maak job aan".slice(0, 10));
	});
});
