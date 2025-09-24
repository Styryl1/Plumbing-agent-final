import { randomUUID } from "crypto";

import { describe, expect, it } from "vitest";

import { formatConflictMessage } from "./jobs";

describe("formatConflictMessage", () => {
	it("mentions the conflicting job title and employee name when available", () => {
		const message = formatConflictMessage([
			{
				jobId: randomUUID(),
				employeeId: randomUUID(),
				employeeName: "Jan Jansen",
				startsAt: "2025-09-24T08:00:00+02:00",
				endsAt: "2025-09-24T09:00:00+02:00",
				title: "CV onderhoud",
			},
		]);

		expect(message).toContain("CV onderhoud");
		expect(message).toContain("Jan Jansen");
	});

	it("falls back to generic label when employee name is missing", () => {
		const message = formatConflictMessage([
			{
				jobId: randomUUID(),
				employeeId: randomUUID(),
				employeeName: null,
				startsAt: "2025-09-24T10:00:00+02:00",
				endsAt: "2025-09-24T11:00:00+02:00",
				title: "Lekkage oplossen",
			},
		]);

		expect(message).toContain("Lekkage oplossen");
		expect(message).toContain("deze monteur");
	});
});
