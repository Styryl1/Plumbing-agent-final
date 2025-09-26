import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logJobAudit } from "~/lib/audit";
import { minutesBetween, nowZoned, round5 } from "~/lib/calendar-temporal";
import { env } from "~/lib/env";
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

const CONFLICT_RESOLUTIONS = ["plumber", "organizer", "last-write"] as const;
type ConflictResolution = (typeof CONFLICT_RESOLUTIONS)[number];

const conflictEntrySchema = z.object({
	field: z.string(),
	resolvedBy: z.enum(CONFLICT_RESOLUTIONS),
	resolvedAtISO: z.string(),
	serverValue: z.unknown(),
	clientValue: z.unknown(),
	note: z.string().optional(),
});

type ConflictEntry = z.infer<typeof conflictEntrySchema>;

const conflictSnapshotSchema = z.object({
	entries: z.array(conflictEntrySchema),
});

const MAX_CONFLICT_HISTORY = 10;

function toJson(value: unknown): Json {
	return value as Json;
}

function parseConflictSnapshot(raw: unknown): ConflictEntry[] {
	try {
		const parsed = conflictSnapshotSchema.parse(raw);
		return parsed.entries;
	} catch {
		return [];
	}
}

function serializeConflictEntries(entries: ConflictEntry[]): Json {
	return { entries } as unknown as Json;
}

function hasServerAdvancedVersion(
	serverUpdatedAt: string | null,
	clientVersion: string | undefined,
): boolean {
	if (!serverUpdatedAt || !clientVersion) {
		return false;
	}
	try {
		const serverInstant = Temporal.Instant.from(serverUpdatedAt);
		const clientInstant = Temporal.Instant.from(clientVersion);
		return Temporal.Instant.compare(serverInstant, clientInstant) === 1;
	} catch {
		return false;
	}
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key: string, input: unknown) => {
		if (Array.isArray(input) || input === null || typeof input !== "object") {
			return input;
		}
		const record = input as Record<string, unknown>;
		return Object.keys(record)
			.sort()
			.reduce<Record<string, unknown>>((acc, key) => {
				acc[key] = record[key];
				return acc;
			}, {});
	});
}

function isJsonEqual(a: unknown, b: unknown): boolean {
	return stableStringify(a) === stableStringify(b);
}

function detectSchedulingConflict(
	job: JobRow,
	baseline?: SchedulingBaseline,
): ConflictEntry | null {
	if (!baseline) {
		return null;
	}
	const serverSchedule = {
		startsAtISO: job.starts_at ?? null,
		endsAtISO: job.ends_at ?? null,
		employeeId: job.employee_id ?? null,
	};
	if (isJsonEqual(serverSchedule, baseline)) {
		return null;
	}
	return {
		field: "scheduling",
		resolvedBy: "organizer",
		resolvedAtISO: Temporal.Now.instant().toString(),
		serverValue: toJson(serverSchedule),
		clientValue: toJson(baseline),
		note: "Organiser scheduling changes kept while plumber edits applied.",
	};
}

function evaluateConflicts(params: {
	job: JobRow;
	version?: string;
	entries?: Array<{
		field: string;
		serverValue: Json;
		clientValue: Json;
		resolvedBy: ConflictResolution;
		note?: string;
	}>;
	baseline?: SchedulingBaseline;
}): ConflictEvaluation {
	const { job, version } = params;
	const candidateEntries = params.entries ?? [];
	const serverAdvanced = hasServerAdvancedVersion(job.updated_at, version);
	if (!serverAdvanced) {
		return { flagged: false, entries: [] } satisfies ConflictEvaluation;
	}

	const nowISO = Temporal.Now.instant().toString();
	const resolvedEntries: ConflictEntry[] = [];

	for (const entry of candidateEntries) {
		if (isJsonEqual(entry.serverValue, entry.clientValue)) {
			continue;
		}
		resolvedEntries.push({
			field: entry.field,
			resolvedBy: entry.resolvedBy,
			resolvedAtISO: nowISO,
			serverValue: entry.serverValue,
			clientValue: entry.clientValue,
			note: entry.note,
		});
	}

	const schedulingConflict = detectSchedulingConflict(job, params.baseline);
	if (schedulingConflict) {
		resolvedEntries.push(schedulingConflict);
	}

	if (resolvedEntries.length === 0) {
		resolvedEntries.push({
			field: "unknown",
			resolvedBy: "last-write",
			resolvedAtISO: nowISO,
			serverValue: toJson({ updatedAtISO: job.updated_at ?? null }),
			clientValue: toJson({ versionISO: version ?? null }),
			note: "Version mismatch detected without a tracked field diff.",
		});
	}

	const existingEntries = parseConflictSnapshot(job.conflict_snapshot);
	const combined = [...resolvedEntries, ...existingEntries].slice(
		0,
		MAX_CONFLICT_HISTORY,
	);

	return {
		flagged: true,
		snapshot: serializeConflictEntries(combined),
		entries: resolvedEntries,
	};
}

const TZ = "Europe/Amsterdam";

const tokenTtlDuration = (): Temporal.Duration =>
	Temporal.Duration.from({ days: 2 });

const SIGNATURE_URL_TTL_SECONDS = 60 * 60; // 1 hour

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
	assigneeId: z.uuid().nullable(),
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
		versionISO: z.string().nullable(),
		conflict: z
			.object({
				flagged: z.boolean(),
				entries: z.array(conflictEntrySchema),
			})
			.nullable(),
	}),
	notes: z.string(),
	signatureDataUrl: z.string().nullable(),
});

type JobCardStatus = (typeof JOB_CARD_STATUSES)[number];
type MaterialLine = z.infer<typeof jobCardMaterialLineSchema>;
type JobCardView = z.infer<typeof jobCardViewSchema>;
type ListJob = z.infer<typeof listJobSchema>;

const syncMetadataInput = z.object({
	version: z.iso.datetime().optional(),
	baseline: z
		.object({
			startsAtISO: z.string().nullable(),
			endsAtISO: z.string().nullable(),
			employeeId: z.uuid().nullable(),
		})
		.optional(),
});

interface SchedulingBaseline {
	startsAtISO: string | null;
	endsAtISO: string | null;
	employeeId: string | null;
}

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
	version: string | null;
	notes: string;
	signatureStorageKey: string | null;
	signaturePreviewDataUrl: string | null;
}

interface ConflictEvaluation {
	flagged: boolean;
	snapshot?: Json;
	entries: ConflictEntry[];
}

type JobRow = Tables<"jobs"> & {
	customer_signature_key?: string | null;
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

	const signatureRaw = cardRaw.signature;
	const rowSignatureKey =
		typeof row.customer_signature_key === "string" &&
		row.customer_signature_key.length > 0
			? row.customer_signature_key
			: null;

	let signatureStorageKey = rowSignatureKey;
	let signaturePreview: string | null = null;

	if (isRecord(signatureRaw)) {
		if (typeof signatureRaw.storageKey === "string") {
			signatureStorageKey = signatureRaw.storageKey;
		}
		if (typeof signatureRaw.preview === "string") {
			signaturePreview = signatureRaw.preview;
		}
	} else if (typeof signatureRaw === "string" && signatureRaw.length > 0) {
		if (signatureRaw.startsWith("data:")) {
			signaturePreview = signatureRaw;
		} else {
			signatureStorageKey = signatureRaw;
		}
	}

	const legacySignaturePreview = normalizeSignature(row.customer_signature);
	if (!signaturePreview && legacySignaturePreview) {
		signaturePreview = legacySignaturePreview;
	}

	const lastSyncedAt =
		typeof cardRaw.lastSyncedAt === "string" ? cardRaw.lastSyncedAt : null;

	const pendingOperations = Array.isArray(cardRaw.pendingQueue)
		? cardRaw.pendingQueue.length
		: typeof cardRaw.pendingCount === "number"
			? cardRaw.pendingCount
			: 0;

	const version =
		typeof cardRaw.version === "string"
			? cardRaw.version
			: typeof row.updated_at === "string"
				? row.updated_at
				: null;

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
		version,
		notes,
		signatureStorageKey,
		signaturePreviewDataUrl: signaturePreview,
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
		version: state.version,
		notes: state.notes,
		signature: {
			storageKey: state.signatureStorageKey,
			preview: state.signaturePreviewDataUrl,
		},
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

function toJobCardView(
	row: JobRow,
	state: JobCardState,
	options?: { signatureUrl?: string | null },
): JobCardView {
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

	const signatureDataUrl =
		options?.signatureUrl ?? state.signaturePreviewDataUrl ?? null;

	const conflictEntries = parseConflictSnapshot(row.conflict_snapshot);
	const conflict =
		row.conflict_flag || conflictEntries.length > 0
			? {
					flagged: Boolean(row.conflict_flag),
					entries: conflictEntries,
				}
			: null;

	const versionISO =
		typeof row.updated_at === "string" ? row.updated_at : state.version;

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
		assigneeId: row.employee_id ?? null,
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
			versionISO: versionISO ?? null,
			conflict,
		},
		notes: state.notes,
		signatureDataUrl,
	} satisfies JobCardView;

	return jobCardViewSchema.parse(detail);
}

async function toJobCardViewWithSignature(
	db: SupabaseClient<Database>,
	row: JobRow,
	state: JobCardState,
	overridePreview?: string | null,
): Promise<JobCardView> {
	let signatureUrl = overridePreview ?? state.signaturePreviewDataUrl ?? null;
	const hasPreview =
		typeof signatureUrl === "string" && signatureUrl.length > 0;
	if (
		!hasPreview &&
		typeof state.signatureStorageKey === "string" &&
		state.signatureStorageKey.length > 0
	) {
		const { data: signed, error } = await db.storage
			.from(env.BUCKET_JOB_SIGNATURES)
			.createSignedUrl(state.signatureStorageKey, SIGNATURE_URL_TTL_SECONDS);
		if (!error) {
			const signedUrl = signed.signedUrl;
			if (typeof signedUrl === "string" && signedUrl.length > 0) {
				signatureUrl = signedUrl;
			}
		}
	}
	return toJobCardView(row, state, { signatureUrl });
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

function buildSignatureStorageKey(orgId: string, jobId: string): string {
	const safeOrg = orgId.replace(/[^a-zA-Z0-9_-]/g, "_");
	const safeJob = jobId.replace(/[^a-zA-Z0-9_-]/g, "_");
	const stamp = Temporal.Now.instant().epochMilliseconds.toString();
	return `org_${safeOrg}/jobs/${safeJob}/signature_${stamp}.png`;
}

async function removeSignatureObject(
	db: SupabaseClient<Database>,
	storageKey: string | null,
): Promise<void> {
	if (!storageKey) {
		return;
	}
	const { error } = await db.storage
		.from(env.BUCKET_JOB_SIGNATURES)
		.remove([storageKey]);
	if (error && !error.message.toLowerCase().includes("not found")) {
		logger.warn("[job-card] failed to delete signature object", {
			storageKey,
			error: error.message,
		});
	}
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

			return toJobCardViewWithSignature(serviceDb, row, state);
		}),

	getByJobId: protectedProcedure
		.input(z.object({ jobId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			const state = ensureTokenFresh(deriveJobCardState(job));
			return toJobCardViewWithSignature(db, job, state);
		}),

	updateTimer: protectedProcedure
		.input(
			z
				.object({
					jobId: z.uuid(),
					action: z.enum(["start", "pause", "complete"]),
				})
				.and(syncMetadataInput),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const previousState = state;
			const baseline = input.baseline as SchedulingBaseline | undefined;

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

			const timerConflict = evaluateConflicts({
				job,
				...(baseline ? { baseline } : {}),
				entries: [
					{
						field: "timer",
						serverValue: toJson({
							status: previousState.status,
							timerLocked: previousState.timerLocked,
							timerStartedAt: previousState.timerStartedAt,
							actualMinutes: previousState.actualMinutes,
						}),
						clientValue: toJson({
							status: state.status,
							timerLocked: state.timerLocked,
							timerStartedAt: state.timerStartedAt,
							actualMinutes: state.actualMinutes,
						}),
						resolvedBy: "plumber",
					},
				],
				...(input.version ? { version: input.version } : {}),
			});

			if (timerConflict.flagged && timerConflict.snapshot != null) {
				update.conflict_flag = true;
				update.conflict_snapshot = timerConflict.snapshot;
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

			return toJobCardViewWithSignature(db, updatedRow, nextState);
		}),

	addMaterial: protectedProcedure
		.input(
			z
				.object({
					jobId: z.uuid(),
					line: materialInputSchema,
				})
				.and(syncMetadataInput),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const previousState = state;
			const baseline = input.baseline as SchedulingBaseline | undefined;
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

			const materialConflict = evaluateConflicts({
				job,
				...(baseline ? { baseline } : {}),
				entries: [
					{
						field: "materials",
						serverValue: toJson(previousState.materials),
						clientValue: toJson(state.materials),
						resolvedBy: "plumber",
					},
				],
				...(input.version ? { version: input.version } : {}),
			});

			const update: TablesUpdate<"jobs"> = {
				offline_state: buildOfflineState(job.offline_state, state),
			};

			if (materialConflict.flagged && materialConflict.snapshot != null) {
				update.conflict_flag = true;
				update.conflict_snapshot = materialConflict.snapshot;
			}

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

			return toJobCardViewWithSignature(db, updatedRow, nextState);
		}),

	updateNotes: protectedProcedure
		.input(
			z
				.object({
					jobId: z.uuid(),
					notes: z
						.string()
						.max(10_000)
						.transform((value) => value.trimStart()),
				})
				.and(syncMetadataInput),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const previousState = state;
			const baseline = input.baseline as SchedulingBaseline | undefined;
			const nowInstant = Temporal.Now.instant();
			const trimmed = input.notes.trimEnd();

			state = {
				...state,
				notes: trimmed,
				lastSyncedAt: nowInstant.toString(),
			} satisfies JobCardState;

			const noteConflict = evaluateConflicts({
				job,
				...(baseline ? { baseline } : {}),
				entries: [
					{
						field: "notes",
						serverValue: toJson(previousState.notes),
						clientValue: toJson(trimmed),
						resolvedBy: "plumber",
					},
				],
				...(input.version ? { version: input.version } : {}),
			});

			const update: TablesUpdate<"jobs"> = {
				notes: trimmed.length > 0 ? trimmed : null,
				offline_state: buildOfflineState(job.offline_state, state),
			};

			if (noteConflict.flagged && noteConflict.snapshot != null) {
				update.conflict_flag = true;
				update.conflict_snapshot = noteConflict.snapshot;
			}

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

			return toJobCardViewWithSignature(db, updatedRow, nextState);
		}),

	saveSignature: protectedProcedure
		.input(
			z
				.object({
					jobId: z.uuid(),
					signatureDataUrl: z.string().nullable(),
				})
				.and(syncMetadataInput),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const previousState = state;
			const baseline = input.baseline as SchedulingBaseline | undefined;
			const nowInstant = Temporal.Now.instant();

			const existingKey =
				typeof job.customer_signature_key === "string" &&
				job.customer_signature_key.length > 0
					? job.customer_signature_key
					: null;

			let normalizedDataUrl: string | null = null;
			let nextStorageKey: string | null = existingKey;

			const update: TablesUpdate<"jobs"> = {
				offline_state: job.offline_state,
			};

			if (input.signatureDataUrl) {
				const parsed = extractSignaturePayload(input.signatureDataUrl);
				if (!parsed.base64) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Empty handtekening",
					});
				}
				const bytes = Buffer.from(parsed.base64, "base64");
				const MAX_SIGNATURE_BYTES = 750_000; // ~0.75 MB
				if (bytes.byteLength > MAX_SIGNATURE_BYTES) {
					throw new TRPCError({
						code: "PAYLOAD_TOO_LARGE",
						message: "Handtekening is te groot",
					});
				}
				const storageKey = buildSignatureStorageKey(auth.orgId, input.jobId);
				const upload = await db.storage
					.from(env.BUCKET_JOB_SIGNATURES)
					.upload(storageKey, bytes, {
						contentType: "image/png",
						cacheControl: "31536000",
						upsert: false,
					});

				if (upload.error) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Opslaan van handtekening mislukt: ${upload.error.message}`,
					});
				}

				if (existingKey && existingKey !== storageKey) {
					await removeSignatureObject(db, existingKey);
				}

				nextStorageKey = storageKey;
				normalizedDataUrl = parsed.dataUrl;
				update.customer_signature_key = storageKey;
				update.customer_signature = null;
			} else {
				await removeSignatureObject(db, existingKey);
				nextStorageKey = null;
				update.customer_signature_key = null;
				update.customer_signature = null;
			}

			state = {
				...state,
				signatureStorageKey: nextStorageKey,
				signaturePreviewDataUrl: normalizedDataUrl,
				lastSyncedAt: nowInstant.toString(),
			} satisfies JobCardState;

			const signatureConflict = evaluateConflicts({
				job,
				...(baseline ? { baseline } : {}),
				entries: [
					{
						field: "signature",
						serverValue: toJson({
							storageKey: previousState.signatureStorageKey,
							preview: previousState.signaturePreviewDataUrl,
						}),
						clientValue: toJson({
							storageKey: state.signatureStorageKey,
							preview: state.signaturePreviewDataUrl,
						}),
						resolvedBy: "plumber",
					},
				],
				...(input.version ? { version: input.version } : {}),
			});

			if (signatureConflict.flagged && signatureConflict.snapshot != null) {
				update.conflict_flag = true;
				update.conflict_snapshot = signatureConflict.snapshot;
			}

			update.offline_state = buildOfflineState(job.offline_state, state);

			const updatedRow = await updateJobRow(
				db,
				auth.orgId,
				input.jobId,
				update,
			);
			const nextState = ensureTokenFresh(deriveJobCardState(updatedRow));

			const previewSize = normalizedDataUrl
				? Buffer.from(normalizedDataUrl.split(",")[1] ?? "", "base64")
						.byteLength
				: 0;

			await logJobAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				jobId: input.jobId,
				metadata: {
					action: nextStorageKey ? "job.signature.save" : "job.signature.clear",
					size: previewSize,
				},
			});

			return toJobCardViewWithSignature(
				db,
				updatedRow,
				nextState,
				normalizedDataUrl,
			);
		}),

	updateStatus: protectedProcedure
		.input(
			z
				.object({
					jobId: z.uuid(),
					status: z.enum(JOB_CARD_STATUSES),
					notifyCustomer: z.boolean().optional().default(false),
				})
				.and(syncMetadataInput),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const job = await fetchJobForOrg(db, auth.orgId, input.jobId);
			let state = ensureTokenFresh(deriveJobCardState(job));
			const previousState = state;
			const baseline = input.baseline as SchedulingBaseline | undefined;
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

			const statusConflict = evaluateConflicts({
				job,
				...(baseline ? { baseline } : {}),
				entries: [
					{
						field: "status",
						serverValue: toJson(previousState.status),
						clientValue: toJson(state.status),
						resolvedBy: "plumber",
					},
				],
				...(input.version ? { version: input.version } : {}),
			});

			const update: TablesUpdate<"jobs"> = {
				status: dbStatus,
				offline_state: buildOfflineState(job.offline_state, state),
			};

			if (statusConflict.flagged && statusConflict.snapshot != null) {
				update.conflict_flag = true;
				update.conflict_snapshot = statusConflict.snapshot;
			}

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

			return toJobCardViewWithSignature(db, updatedRow, nextState);
		}),
});
