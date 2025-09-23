import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logJobAudit } from "~/lib/audit";
import { minutesBetween, nowZoned, round5 } from "~/lib/calendar-temporal";
import { logger } from "~/lib/log";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { createSystemClient } from "~/server/db/client";
import type { Database, Json, Tables, TablesUpdate } from "~/types/supabase";

const JOB_CARD_STATUSES = [
	"scheduled",
	"en_route",
	"in_progress",
	"completed",
] as const;

const TZ = "Europe/Amsterdam";

const tokenTtlDuration = (): Temporal.Duration =>
	Temporal.Duration.from({ days: 2 });

type MaterialVatRate = 21 | 9 | 0;

const normalizeVatRate = (rate: unknown): MaterialVatRate => {
	return rate === 21 || rate === 9 || rate === 0 ? rate : 21;
};

const normalizePriority = (
	priority: unknown,
): "normal" | "urgent" | "emergency" => {
	if (priority === "urgent" || priority === "emergency") {
		return priority;
	}
	return "normal";
};

const listJobSchema = z.object({
	jobId: z.uuid(),
	token: z.string(),
	title: z.string(),
	startsAtISO: z.string().nullable(),
	endsAtISO: z.string().nullable(),
	address: z.string().nullable(),
	priority: z.union([
		z.literal("normal"),
		z.literal("urgent"),
		z.literal("emergency"),
	]),
	status: z.enum(JOB_CARD_STATUSES),
	customerName: z.string().nullable(),
	customerPhone: z.string().nullable(),
	customerWhatsApp: z.string().nullable(),
});

const jobCardTimerSchema = z.object({
	startedAtISO: z.string().nullable(),
	actualMinutes: z.number(),
	displayedMinutes: z.number(),
	running: z.boolean(),
	locked: z.boolean(),
});

const jobCardMaterialLineSchema = z.object({
	id: z.string(),
	name: z.string(),
	qty: z.number(),
	unit: z.string(),
	unitPriceCents: z.number(),
	vatRate: z.union([z.literal(21), z.literal(9), z.literal(0)]),
	createdAtISO: z.string(),
});

const jobCardTotalsSchema = z.object({
	subtotalCents: z.number(),
	vatCents: z.number(),
	totalCents: z.number(),
});

const jobCardViewSchema = z.object({
	jobId: z.uuid(),
	token: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	status: z.enum(JOB_CARD_STATUSES),
	priority: z.union([
		z.literal("normal"),
		z.literal("urgent"),
		z.literal("emergency"),
	]),
	expiresAtISO: z.string().nullable(),
	startsAtISO: z.string().nullable(),
	endsAtISO: z.string().nullable(),
	address: z.string().nullable(),
	customer: z.object({
		name: z.string().nullable(),
		phone: z.string().nullable(),
		whatsapp: z.string().nullable(),
	}),
	timer: jobCardTimerSchema,
	materials: z.object({
		lines: z.array(jobCardMaterialLineSchema),
		totals: jobCardTotalsSchema,
	}),
	sync: z.object({
		lastSyncedAtISO: z.string().nullable(),
		pendingOperations: z.number(),
	}),
	notes: z.string(),
	signatureDataUrl: z.string().nullable(),
});

type JobCardStatus = (typeof JOB_CARD_STATUSES)[number];
type MaterialLine = z.infer<typeof jobCardMaterialLineSchema>;
type JobCardView = z.infer<typeof jobCardViewSchema>;
type ListJob = z.infer<typeof listJobSchema>;

interface JobCardState {
	accessToken: string;
	expiresAt: string | null;
	timerStartedAt: string | null;
	actualMinutes: number;
	timerLocked: boolean;
	materials: MaterialLine[];
	status: JobCardStatus;
	lastSyncedAt: string | null;
	pendingOperations: number;
	notes: string;
	signatureDataUrl: string | null;
}

type JobRow = Tables<"jobs"> & {
	customers?: {
		id: string;
		name: string | null;
		phone: string | null;
		phones: string[] | null;
		street: string | null;
		house_number: string | null;
		postal_code: string | null;
		city: string | null;
	} | null;
};

type EmployeeRow = {
	id: string;
};

const serviceDb = createSystemClient();

const materialInputSchema = z
	.object({
		name: z.string().min(2).max(80),
		qty: z.number().positive().max(999),
		unit: z.string().min(1).max(12).optional(),
		unitPriceCents: z.number().int().nonnegative(),
		vatRate: z.union([z.literal(21), z.literal(9), z.literal(0)]).optional(),
	})
	.transform((value) => ({
		...value,
		unit: value.unit ?? "st",
		vatRate: normalizeVatRate(value.vatRate),
	}));

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapDbStatusToJobCardStatus(status: string | null): JobCardStatus {
	switch (status) {
		case "in_progress":
			return "in_progress";
		case "completed":
		case "invoiced":
			return "completed";
		case "scheduled":
		case "unscheduled":
		default:
			return "scheduled";
	}
}

function isJobCardStatus(value: unknown): value is JobCardStatus {
	return (
		typeof value === "string" &&
		(JOB_CARD_STATUSES as readonly string[]).includes(value)
	);
}

function sanitizeMaterials(rawValue: unknown): MaterialLine[] {
	if (!Array.isArray(rawValue)) {
		return [];
	}

	const lines: MaterialLine[] = [];

	for (const entry of rawValue) {
		if (!isRecord(entry)) {
			continue;
		}

		const id = typeof entry.id === "string" ? entry.id : randomUUID();
		const name = typeof entry.name === "string" ? entry.name : null;
		const qty = typeof entry.qty === "number" ? entry.qty : null;
		const unit =
			typeof entry.unit === "string" && entry.unit.length > 0
				? entry.unit
				: "st";
		const unitPriceCents =
			typeof entry.unitPriceCents === "number"
				? Math.max(0, Math.round(entry.unitPriceCents))
				: null;
		const vatRate = normalizeVatRate(entry.vatRate);
		const createdAtISO =
			typeof entry.createdAtISO === "string"
				? entry.createdAtISO
				: Temporal.Now.instant().toString();

		if (!name || qty === null || unitPriceCents === null) {
			continue;
		}

		lines.push({
			id,
			name,
			qty,
			unit,
			unitPriceCents,
			vatRate,
			createdAtISO,
		});
	}

	return lines;
}

function deriveJobCardState(row: JobRow): JobCardState {
	const offlineState = isRecord(row.offline_state) ? row.offline_state : {};
	const cardRaw = isRecord(offlineState.job_card)
		? (offlineState.job_card as Record<string, unknown>)
		: {};

	const accessToken =
		typeof cardRaw.accessToken === "string" && cardRaw.accessToken.length >= 6
			? cardRaw.accessToken
			: row.id;

	const expiresAt =
		typeof cardRaw.expiresAt === "string" ? cardRaw.expiresAt : row.ends_at;

	const timerStartedAt =
		typeof cardRaw.timerStartedAt === "string"
			? cardRaw.timerStartedAt
			: row.timer_started_at;

	const timerLocked = Boolean(
		typeof cardRaw.timerLocked === "boolean"
			? cardRaw.timerLocked
			: row.status === "completed",
	);

	const totalSecondsBase =
		typeof row.timer_total_seconds === "number" ? row.timer_total_seconds : 0;
	const totalSeconds = Math.max(0, totalSecondsBase);
	const actualMinutesRaw =
		typeof cardRaw.actualMinutes === "number"
			? cardRaw.actualMinutes
			: Math.round(totalSeconds / 60);

	const status = isJobCardStatus(cardRaw.status)
		? cardRaw.status
		: mapDbStatusToJobCardStatus(row.status as string | null);

	const materials = sanitizeMaterials(cardRaw.materials);

	const notes =
		typeof cardRaw.notes === "string"
			? cardRaw.notes
			: typeof row.notes === "string"
				? row.notes
				: "";

	const signatureFromState =
		typeof cardRaw.signature === "string" && cardRaw.signature.length > 0
			? cardRaw.signature
			: null;
	const signatureFromRow = normalizeSignature(row.customer_signature);
	const signatureDataUrl = signatureFromState ?? signatureFromRow;

	const lastSyncedAt =
		typeof cardRaw.lastSyncedAt === "string" ? cardRaw.lastSyncedAt : null;

	const pendingOperations = Array.isArray(cardRaw.pendingQueue)
		? cardRaw.pendingQueue.length
		: typeof cardRaw.pendingCount === "number"
			? cardRaw.pendingCount
			: 0;

	return {
		accessToken,
		expiresAt,
		timerStartedAt,
		actualMinutes: actualMinutesRaw,
		timerLocked,
		materials,
		status,
		lastSyncedAt,
		pendingOperations,
		notes,
		signatureDataUrl,
	} satisfies JobCardState;
}

function buildOfflineState(previous: unknown, state: JobCardState): Json {
	const base = isRecord(previous) ? { ...previous } : {};
	base.job_card = {
		accessToken: state.accessToken,
		expiresAt: state.expiresAt,
		timerStartedAt: state.timerStartedAt,
		actualMinutes: state.actualMinutes,
		timerLocked: state.timerLocked,
		materials: state.materials,
		status: state.status,
		lastSyncedAt: state.lastSyncedAt,
		pendingCount: state.pendingOperations,
		notes: state.notes,
		signature: state.signatureDataUrl,
	} satisfies Record<string, unknown>;

	return base as Json;
}

function calcMaterialTotals(lines: MaterialLine[]): {
	subtotalCents: number;
	vatCents: number;
	totalCents: number;
} {
	return lines.reduce(
		(acc, line) => {
			const lineBase = Math.round(line.unitPriceCents * line.qty);
			const lineVat = Math.round((lineBase * line.vatRate) / 100);
			acc.subtotalCents += lineBase;
			acc.vatCents += lineVat;
			acc.totalCents += lineBase + lineVat;
			return acc;
		},
		{ subtotalCents: 0, vatCents: 0, totalCents: 0 },
	);
}

function mapCustomer(row: JobRow["customers"]): {
	name: string | null;
	phone: string | null;
	whatsapp: string | null;
} {
	if (!row) {
		return { name: null, phone: null, whatsapp: null };
	}

	const primaryPhone = row.phone ?? row.phones?.[0] ?? null;
	return {
		name: row.name ?? null,
		phone: primaryPhone,
		whatsapp: primaryPhone,
	};
}

function composeAddress(row: JobRow): string | null {
	if (row.address) {
		return row.address;
	}

	const customer = row.customers;
	if (!customer) {
		return null;
	}

	const parts = [
		[customer.street, customer.house_number].filter(Boolean).join(" "),
		[customer.postal_code, customer.city].filter(Boolean).join(" "),
	].filter((segment) => segment.length > 0);

	return parts.length > 0 ? parts.join(", ") : null;
}

function toListJob(row: JobRow, state: JobCardState): ListJob {
	const customer = mapCustomer(row.customers ?? null);
	const data = {
		jobId: row.id,
		token: state.accessToken,
		title: row.title,
		startsAtISO: row.starts_at ?? null,
		endsAtISO: row.ends_at ?? null,
		address: composeAddress(row),
		priority: normalizePriority(row.priority),
		status: state.status,
		customerName: customer.name,
		customerPhone: customer.phone,
		customerWhatsApp: customer.whatsapp,
	} satisfies ListJob;

	return data;
}

function toJobCardView(row: JobRow, state: JobCardState): JobCardView {
	const totals = calcMaterialTotals(state.materials);
	const customer = mapCustomer(row.customers ?? null);
	const startedAtISO = state.timerStartedAt;
	const running = Boolean(startedAtISO);
	const nowZ = nowZoned();
	const elapsedRunningMinutes = running
		? minutesBetween(
				Temporal.Instant.from(startedAtISO as string).toZonedDateTimeISO(TZ),
				nowZ,
			)
		: 0;
	const displayMinutes = round5(state.actualMinutes + elapsedRunningMinutes);

	const detail = {
		jobId: row.id,
		token: state.accessToken,
		title: row.title,
		description: row.description ?? null,
		status: state.status,
		priority: normalizePriority(row.priority),
		expiresAtISO: state.expiresAt,
		startsAtISO: row.starts_at ?? null,
		endsAtISO: row.ends_at ?? null,
		address: composeAddress(row),
		customer,
		timer: {
			startedAtISO,
			actualMinutes: state.actualMinutes,
			displayedMinutes: displayMinutes,
			running,
			locked: state.timerLocked,
		},
		materials: {
			lines: state.materials,
			totals,
		},
		sync: {
			lastSyncedAtISO: state.lastSyncedAt,
			pendingOperations: state.pendingOperations,
		},
		notes: state.notes,
		signatureDataUrl: state.signatureDataUrl,
	} satisfies JobCardView;

	return jobCardViewSchema.parse(detail);
}

function normalizeSignature(raw: unknown): string | null {
	if (typeof raw !== "string" || raw.length === 0) {
		return null;
	}
	if (raw.startsWith("data:image/")) {
		return raw;
	}
	if (raw.startsWith("\\x")) {
		const hex = raw.slice(2);
		const base64 = Buffer.from(hex, "hex").toString("base64");
		return `data:image/png;base64,${base64}`;
	}
	// Assume base64 without prefix
	return `data:image/png;base64,${raw}`;
}

function extractSignaturePayload(dataUrl: string | null): {
	base64: string | null;
	dataUrl: string | null;
} {
	if (!dataUrl || dataUrl.length === 0) {
		return { base64: null, dataUrl: null };
	}
	const match =
		/^data:(?<mime>image\/(?:png|jpeg));base64,(?<payload>[A-Za-z0-9+/=]+)$/.exec(
			dataUrl,
		);
	const payload = match?.groups?.payload ?? null;
	const mime = match?.groups?.mime ?? null;
	if (!payload || !mime) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Ongeldig handtekeningformaat",
		});
	}
	return {
		base64: payload,
		dataUrl: `data:${mime};base64,${payload}`,
	};
}

async function requireEmployee(
	db: SupabaseClient<Database>,
	orgId: string,
	userId: string,
): Promise<EmployeeRow> {
	const { data, error } = await db
		.from("employees")
		.select("id")
		.eq("org_id", orgId)
		.eq("user_id", userId)
		.eq("active", true)
		.maybeSingle();

	if (error) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Kon medewerker niet ophalen",
		});
	}

	if (!data) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Geen medewerkerprofiel gevonden voor deze gebruiker",
		});
	}

	return data satisfies EmployeeRow;
}

async function fetchJobForOrg(
	db: SupabaseClient<Database>,
	orgId: string,
	jobId: string,
): Promise<JobRow> {
	const { data, error } = await db
		.from("jobs")
		.select(
			"*, customers(id,name,phone,phones,street,house_number,postal_code,city)",
		)
		.eq("org_id", orgId)
		.eq("id", jobId)
		.maybeSingle();

	if (error) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Kon job niet ophalen",
		});
	}

	const row = data as JobRow | null;

	if (!row) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Job niet gevonden" });
	}

	return row;
}

async function updateJobRow(
	db: SupabaseClient<Database>,
	orgId: string,
	jobId: string,
	update: TablesUpdate<"jobs">,
): Promise<JobRow> {
	const { data, error } = await db
		.from("jobs")
		.update({ ...update, updated_at: Temporal.Now.instant().toString() })
		.eq("org_id", orgId)
		.eq("id", jobId)
		.select(
			"*, customers(id,name,phone,phones,street,house_number,postal_code,city)",
		)
		.maybeSingle();

	if (error) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Bijwerken van job mislukt",
		});
	}

	const row = data as JobRow | null;

	if (!row) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Job niet gevonden" });
	}

	return row;
}

function ensureTokenFresh(state: JobCardState): JobCardState {
	if (!state.expiresAt) {
		return {
			...state,
			expiresAt: Temporal.Now.instant().add(tokenTtlDuration()).toString(),
		} satisfies JobCardState;
	}
	return state;
}

export const jobCardRouter = createTRPCRouter({
	getToday: protectedProcedure.query(async ({ ctx }) => {
		const { db, auth } = ctx;

		const employee = await requireEmployee(db, auth.orgId, auth.userId);

		const now = nowZoned();
		const startOfDay = now.startOfDay().toInstant().toString();
		const endOfDay = now.startOfDay().add({ days: 1 }).toInstant().toString();

		const { data, error } = await db
			.from("jobs")
			.select(
				"*, customers(id,name,phone,phones,street,house_number,postal_code,city)",
			)
			.eq("org_id", auth.orgId)
			.eq("employee_id", employee.id)
			.gte("starts_at", startOfDay)
			.lt("starts_at", endOfDay)
			.order("starts_at", { ascending: true });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Kon jobs voor vandaag niet ophalen",
			});
		}

		const rows = (data as JobRow[] | null) ?? [];

		return rows.map((row) => {
			const state = ensureTokenFresh(deriveJobCardState(row));
			return listJobSchema.parse(toListJob(row, state));
		});
	}),

	getByToken: publicProcedure
		.input(z.object({ token: z.string().min(8) }))
		.query(async ({ input }) => {
			const { token } = input;

			const query = serviceDb
				.from("jobs")
				.select(
					"*, customers(id,name,phone,phones,street,house_number,postal_code,city)",
				)
				.or(`offline_state->job_card->>accessToken.eq.${token},id.eq.${token}`)
				.maybeSingle();

			const { data, error } = await query;

			if (error) {
				logger.error("[job-card] getByToken error", { error: error.message });
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden",
				});
			}

			const row = data as JobRow | null;
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden",
				});
			}

			const state = ensureTokenFresh(deriveJobCardState(row));

			if (state.expiresAt) {
				const expires = Temporal.Instant.from(state.expiresAt);
				if (Temporal.Instant.compare(expires, Temporal.Now.instant()) < 0) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Token verlopen",
					});
				}
			}

			return toJobCardView(row, state);
		}),

	getByJobId: protectedProcedure
		.input(z.object({ jobId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			const state = ensureTokenFresh(deriveJobCardState(job));
			return toJobCardView(job, state);
		}),

	updateTimer: protectedProcedure
		.input(
			z.object({
				jobId: z.uuid(),
				action: z.enum(["start", "pause", "complete"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));

			if (state.timerLocked) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Timer is al afgerond",
				});
			}

			const nowInstant = Temporal.Now.instant();
			const update: TablesUpdate<"jobs"> = {};

			if (input.action === "start") {
				if (!state.timerStartedAt) {
					state = {
						...state,
						timerStartedAt: nowInstant.toString(),
						lastSyncedAt: nowInstant.toString(),
					} satisfies JobCardState;
					update.timer_started_at = state.timerStartedAt;
				}
			}

			if (input.action === "pause" || input.action === "complete") {
				if (state.timerStartedAt) {
					const startedInstant = Temporal.Instant.from(state.timerStartedAt);
					const elapsedSeconds = Math.max(
						0,
						Math.round(
							startedInstant.until(nowInstant).total({ unit: "seconds" }),
						),
					);
					const existingSeconds =
						typeof job.timer_total_seconds === "number"
							? job.timer_total_seconds
							: 0;
					const totalSeconds = Math.max(0, existingSeconds + elapsedSeconds);
					state = {
						...state,
						timerStartedAt: null,
						actualMinutes: Math.round(totalSeconds / 60),
						lastSyncedAt: nowInstant.toString(),
					} satisfies JobCardState;
					update.timer_started_at = null;
					update.timer_total_seconds = totalSeconds;
				}

				if (input.action === "complete") {
					state = {
						...state,
						timerLocked: true,
						status: "completed",
						lastSyncedAt: nowInstant.toString(),
					} satisfies JobCardState;
					update.status = "completed";
				}
			}

			update.offline_state = buildOfflineState(job.offline_state, state);

			const updatedRow = await updateJobRow(
				db,
				auth.orgId,
				input.jobId,
				update,
			);
			const nextState = ensureTokenFresh(deriveJobCardState(updatedRow));

			await logJobAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				jobId: input.jobId,
				metadata: { action: `job.timer.${input.action}` },
			});

			return toJobCardView(updatedRow, nextState);
		}),

	addMaterial: protectedProcedure
		.input(
			z.object({
				jobId: z.uuid(),
				line: materialInputSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const nowInstant = Temporal.Now.instant();

			const newLine: MaterialLine = {
				id: randomUUID(),
				name: input.line.name,
				qty: input.line.qty,
				unit: input.line.unit,
				unitPriceCents: Math.max(0, input.line.unitPriceCents),
				vatRate: input.line.vatRate,
				createdAtISO: nowInstant.toString(),
			} satisfies MaterialLine;

			state = {
				...state,
				materials: [...state.materials, newLine],
				lastSyncedAt: nowInstant.toString(),
			} satisfies JobCardState;

			const update: TablesUpdate<"jobs"> = {
				offline_state: buildOfflineState(job.offline_state, state),
			};

			const updatedRow = await updateJobRow(
				db,
				auth.orgId,
				input.jobId,
				update,
			);
			const nextState = ensureTokenFresh(deriveJobCardState(updatedRow));

			await logJobAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				jobId: input.jobId,
				metadata: {
					action: "job.material.add",
					line: {
						name: newLine.name,
						qty: newLine.qty,
						unitPriceCents: newLine.unitPriceCents,
						vatRate: newLine.vatRate,
					},
				},
			});

			return toJobCardView(updatedRow, nextState);
		}),

	updateNotes: protectedProcedure
		.input(
			z.object({
				jobId: z.uuid(),
				notes: z
					.string()
					.max(10_000)
					.transform((value) => value.trimStart()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const nowInstant = Temporal.Now.instant();
			const trimmed = input.notes.trimEnd();

			state = {
				...state,
				notes: trimmed,
				lastSyncedAt: nowInstant.toString(),
			} satisfies JobCardState;

			const update: TablesUpdate<"jobs"> = {
				notes: trimmed.length > 0 ? trimmed : null,
				offline_state: buildOfflineState(job.offline_state, state),
			};

			const updatedRow = await updateJobRow(
				db,
				auth.orgId,
				input.jobId,
				update,
			);
			const nextState = ensureTokenFresh(deriveJobCardState(updatedRow));

			await logJobAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				jobId: input.jobId,
				metadata: {
					action: "job.notes.update",
					notesLength: trimmed.length,
				},
			});

			return toJobCardView(updatedRow, nextState);
		}),

	saveSignature: protectedProcedure
		.input(
			z.object({
				jobId: z.uuid(),
				signatureDataUrl: z.string().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const nowInstant = Temporal.Now.instant();

			let base64: string | null = null;
			let normalizedDataUrl: string | null = null;
			if (input.signatureDataUrl) {
				const parsed = extractSignaturePayload(input.signatureDataUrl);
				base64 = parsed.base64;
				normalizedDataUrl = parsed.dataUrl;
				const bytes = Buffer.from(base64 ?? "", "base64");
				const MAX_SIGNATURE_BYTES = 750_000; // ~0.75 MB
				if (bytes.byteLength > MAX_SIGNATURE_BYTES) {
					throw new TRPCError({
						code: "PAYLOAD_TOO_LARGE",
						message: "Handtekening is te groot",
					});
				}
				base64 = bytes.toString("base64");
			}

			state = {
				...state,
				signatureDataUrl: normalizedDataUrl,
				lastSyncedAt: nowInstant.toString(),
			} satisfies JobCardState;

			const update: TablesUpdate<"jobs"> = {
				customer_signature: base64 ?? null,
				offline_state: buildOfflineState(job.offline_state, state),
			};

			const updatedRow = await updateJobRow(
				db,
				auth.orgId,
				input.jobId,
				update,
			);
			const nextState = ensureTokenFresh(deriveJobCardState(updatedRow));

			await logJobAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				jobId: input.jobId,
				metadata: {
					action: base64 ? "job.signature.save" : "job.signature.clear",
					size: base64 ? Buffer.from(base64, "base64").byteLength : 0,
				},
			});

			return toJobCardView(updatedRow, nextState);
		}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				jobId: z.uuid(),
				status: z.enum(JOB_CARD_STATUSES),
				notifyCustomer: z.boolean().optional().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const nowInstant = Temporal.Now.instant();

			const dbStatus = ((): string => {
				switch (input.status) {
					case "in_progress":
						return "in_progress";
					case "completed":
						return "completed";
					case "scheduled":
					case "en_route":
					default:
						return "scheduled";
				}
			})();

			state = {
				...state,
				status: input.status,
				timerLocked: input.status === "completed" ? true : state.timerLocked,
				lastSyncedAt: nowInstant.toString(),
			} satisfies JobCardState;

			const update: TablesUpdate<"jobs"> = {
				status: dbStatus,
				offline_state: buildOfflineState(job.offline_state, state),
			};

			const updatedRow = await updateJobRow(
				db,
				auth.orgId,
				input.jobId,
				update,
			);
			const nextState = ensureTokenFresh(deriveJobCardState(updatedRow));

			if (input.notifyCustomer) {
				logger.info("[job-card] notify customer stub", {
					jobId: input.jobId,
					status: input.status,
				});
			}

			await logJobAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				jobId: input.jobId,
				metadata: {
					action: "job.status.update",
					status: input.status,
					notifyCustomer: input.notifyCustomer,
				},
			});

			return toJobCardView(updatedRow, nextState);
		}),
});
