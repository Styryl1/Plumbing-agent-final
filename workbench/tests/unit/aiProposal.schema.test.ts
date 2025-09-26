import { describe, expect, it } from "vitest";
import { AiProposal } from "~/server/schemas/aiProposal";

describe("AiProposal schema", () => {
	const basePayload = {
		version: "1" as const,
		locale: "nl" as const,
		confidence: 0.82,
		job: {
			title: "Lekkende kraan",
			category: "leak" as const,
			urgency: "urgent" as const,
			description: "Keukenmengkraan lekt aan de onderzijde.",
			materials: [
				{
					name: "Kraanpakking",
					quantity: 2,
				},
			],
			laborMinutes: 90,
			estimateCents: {
				min: 9500,
				max: 14500,
				vatRate: "21" as const,
			},
			hazards: ["electric" as const],
			photosRequired: false,
		},
		slots: [
			{
				start: "2025-09-25T08:00:00+02:00",
				end: "2025-09-25T09:30:00+02:00",
				holdTtlMinutes: 15,
			},
		],
		checklist: [
			"Water afsluiten",
			"Kraan demonteren",
		],
		cautions: ["Controleer elektrische boiler op lekkage"],
	};

	it("accepts a valid proposal payload", () => {
		expect(() => AiProposal.parse(basePayload)).not.toThrow();
	});

	it("rejects invalid labor minutes", () => {
		const invalid = {
			...basePayload,
			job: {
				...basePayload.job,
				laborMinutes: 5,
			},
		};

		expect(() => AiProposal.parse(invalid)).toThrowError();
	});

	it("enforces slot window count", () => {
		const invalid = {
			...basePayload,
			slots: [],
		};
		expect(() => AiProposal.parse(invalid)).toThrowError();
	});
});
