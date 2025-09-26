import { randomUUID } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proposalsRouter } from "~/server/api/routers/proposals";

interface TableState {
	ai_proposals: any[];
	slot_holds: any[];
	jobs: any[];
	unscheduled_items: any[];
	audit_events: any[];
}

function applyFilters<T>(rows: T[], filters: Array<{ column: string; value: unknown; operator?: string }>): T[] {
	return rows.filter((row) =>
		filters.every((filter) => {
			const value = (row as Record<string, unknown>)[filter.column];
			if (filter.operator === "in") {
				return Array.isArray(filter.value) && filter.value.includes(value);
			}
			if (filter.operator === "lte") {
				return typeof value === "string" && typeof filter.value === "string"
					? value <= filter.value
					: false;
			}
			return value === filter.value;
		}),
	);
}

function createSupabaseStub(state: TableState) {
	return {
		from(table: keyof TableState) {
			const tableState = state[table];
			const filters: Array<{ column: string; value: unknown; operator?: string }> = [];
			let limitValue: number | undefined;
			let orderConfig: { column: string; ascending: boolean } | undefined;

			return {
				select() {
					return this;
				},
				eq(column: string, value: unknown) {
					filters.push({ column, value });
					return this;
				},
				in(column: string, values: unknown[]) {
					filters.push({ column, value: values, operator: "in" });
					return this;
				},
				lte(column: string, value: string) {
					filters.push({ column, value, operator: "lte" });
					return this;
				},
				order(column: string, options?: { ascending?: boolean }) {
					orderConfig = { column, ascending: options?.ascending !== false };
					return this;
				},
				limit(value: number) {
					limitValue = value;
					return this;
				},
				maybeSingle() {
					const rows = applyFilters(tableState, filters);
					return { data: rows[0] ?? null, error: null };
				},
				single() {
					const rows = applyFilters(tableState, filters);
					if (rows.length === 0) {
						return { data: null, error: { message: "not found" } };
					}
					return { data: rows[0], error: null };
				},
				insert(values: any | any[]) {
					const items = Array.isArray(values) ? values : [values];
					const inserted = items.map((item) => {
						const record = { ...item };
						record.id ??= randomUUID();
						tableState.push(record);
						return record;
					});

					return {
						select: () => ({ data: inserted, error: null }),
						single: () => ({ data: inserted[0], error: null }),
						maybeSingle: () => ({ data: inserted[0], error: null }),
						throwOnError: () => ({ data: { data: inserted[0] }, error: null }),
					};
				},
				update(patch: Record<string, unknown>) {
					return {
						eq(column: string, value: unknown) {
							filters.push({ column, value });
							return this;
						},
						select: () => {
							const rows = applyFilters(tableState, filters);
							rows.forEach((row) => Object.assign(row, patch));
							return { data: rows, error: null };
						},
						maybeSingle: () => {
							const rows = applyFilters(tableState, filters);
							rows.forEach((row) => Object.assign(row, patch));
							return { data: rows[0] ?? null, error: null };
						},
					};
				},
				delete() {
					return {
						in(column: string, ids: string[]) {
							filters.push({ column, value: ids, operator: "in" });
							const rows = applyFilters(tableState, filters);
							rows.forEach((row) => {
								const index = tableState.indexOf(row);
								if (index >= 0) {
									tableState.splice(index, 1);
								}
							});
							return { error: null };
						},
						eq(column: string, value: unknown) {
							filters.push({ column, value });
							const rows = applyFilters(tableState, filters);
							rows.forEach((row) => {
								const index = tableState.indexOf(row);
								if (index >= 0) tableState.splice(index, 1);
							});
							return { error: null };
						},
					};
				},
				orderAndFilterRows() {
					let rows = applyFilters(tableState, filters);
					if (orderConfig) {
						rows = [...rows].sort((a, b) => {
							const aVal = (a as Record<string, unknown>)[orderConfig!.column];
							const bVal = (b as Record<string, unknown>)[orderConfig!.column];
							const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
							return orderConfig!.ascending ? comparison : -comparison;
						});
					}
					if (limitValue !== undefined) {
						rows = rows.slice(0, limitValue);
					}
					return rows;
				},
				order,
				limit,
				selectRows() {
					return { data: this.orderAndFilterRows(), error: null };
				},
				select: () => ({ data: applyFilters(tableState, filters), error: null }),
			};
		},
	};
}

const state: TableState = {
	ai_proposals: [],
	slot_holds: [],
	jobs: [],
	unscheduled_items: [],
	audit_events: [],
};

const mockPayload = {
	version: "1" as const,
	locale: "nl" as const,
	confidence: 0.92,
	job: {
		title: "Noord wijk lekkage",
		category: "leak" as const,
		urgency: "urgent" as const,
		description: "Water komt door plafond bij badkamer.",
		materials: [
			{ name: "Knelfitting", quantity: 2 },
		],
		laborMinutes: 120,
		estimateCents: { min: 18500, max: 26500, vatRate: "21" as const },
		hazards: [],
		photosRequired: false,
	},
	slots: [
		{
			start: "2025-09-25T08:00:00+02:00",
			end: "2025-09-25T10:00:00+02:00",
			holdTtlMinutes: 10,
		},
		{
			start: "2025-09-25T13:00:00+02:00",
			end: "2025-09-25T15:00:00+02:00",
			holdTtlMinutes: 10,
		},
	],
	checklist: [
		"Water afsluiten",
		"Plaats inspecteren",
	],
	cautions: ["Let op elektrische bedrading"],
};

vi.mock("~/server/services/intake/propose", () => ({
	generateProposalFromIntake: vi.fn(async () => {
		const proposalId = randomUUID();
		const proposalRow = {
			id: proposalId,
			org_id: "org-1",
			intake_id: "intake-1",
			customer_id: "customer-1",
			locale: "nl",
			confidence: mockPayload.confidence,
			status: "new",
			payload: mockPayload,
			created_at: Temporal.Now.instant().toString(),
			created_by: "user-1",
		};

		if (!state.unscheduled_items.find((item) => item.intake_event_id === "intake-1")) {
			state.unscheduled_items.push({
				id: "unscheduled-1",
				org_id: "org-1",
				intake_event_id: "intake-1",
				status: "pending",
				job_id: null,
				metadata: {},
				priority: "normal",
				created_at: Temporal.Now.instant().toString(),
				updated_at: Temporal.Now.instant().toString(),
			});
		}

		state.ai_proposals.push(proposalRow);

		const holds = mockPayload.slots.map((slot) => ({
			id: randomUUID(),
			org_id: "org-1",
			proposal_id: proposalId,
			resource_id: null,
			start_ts: slot.start,
			end_ts: slot.end,
			expires_at: Temporal.Now.instant().add({ minutes: slot.holdTtlMinutes ?? 10 }).toString(),
			reason: "AI proposal",
			created_by: "user-1",
			created_at: Temporal.Now.instant().toString(),
		}));

		state.slot_holds.push(...holds);

		return {
			proposal: proposalRow,
			payload: mockPayload,
			holds,
		};
	}),
}));

beforeEach(() => {
	state.ai_proposals.length = 0;
	state.slot_holds.length = 0;
	state.jobs.length = 0;
	state.unscheduled_items.length = 0;
	state.audit_events.length = 0;
});

describe("proposals router", () => {
	it("creates, lists, and applies proposals", async () => {
		const db = createSupabaseStub(state);
		const caller = proposalsRouter.createCaller({
			auth: { orgId: "org-1", userId: "user-1", role: "admin" } as const,
			db: db as any,
			timezone: "Europe/Amsterdam",
		});

		await caller.createFromIntake({ intakeId: "intake-1" });

		const list = await caller.listByIntake({ intakeId: "intake-1" });
		expect(list.items).toHaveLength(1);

		const proposalId = state.ai_proposals[0]!.id;
		const firstHold = state.slot_holds[0]!;

		await caller.applyProposal({ proposalId, slotId: firstHold.id });

		expect(state.ai_proposals[0]!.status).toBe("applied");
		expect(state.slot_holds).toHaveLength(0);
		expect(state.jobs).toHaveLength(1);
		expect(state.jobs[0]!.starts_at).toBe(firstHold.start_ts);
		expect(state.unscheduled_items[0]!.status).toBe("applied");
		expect(state.unscheduled_items[0]!.job_id).toBeDefined();
	});
});
