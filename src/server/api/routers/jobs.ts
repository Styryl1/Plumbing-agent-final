import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logJobAudit } from "~/lib/audit";
import { assertOrgRole } from "~/lib/authz";
import { toISO, toZDT } from "~/lib/calendar-temporal";
import { isWithinBusinessHours } from "~/lib/dates";
import { E } from "~/lib/i18n/errors";
import { zMsg } from "~/lib/i18n/zodMessage";
import { fromDbStatus, type JobStatusDB, toDbStatus } from "~/lib/job-status";
import { NL_POSTCODE } from "~/lib/validation/postcode";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { JobDTO } from "~/types/job";
import type {
	Database,
	Tables,
	TablesInsert,
	TablesUpdate,
} from "~/types/supabase";

// Constants for type safety and consistency
export const JOB_STATUSES = [
	"planned",
	"in_progress",
	"done",
	"cancelled",
] as const;

const jobStatusSchema = z.enum(JOB_STATUSES);
const uuidSchema = z.uuid();
// Accept either date-only (2025-09-02) or full ISO datetime format
const isoDateSchema = z.string().transform((value, ctx) => {
	// If it's already a full ISO datetime, use it as-is
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
		return value;
	}
	// If it's date-only, convert to start of day in Amsterdam timezone
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		try {
			// Convert date-only to start of day in Amsterdam timezone
			const amsterdamZdt = toZDT(`${value}T00:00:00Z`).with({
				hour: 0,
				minute: 0,
				second: 0,
			});
			return toISO(amsterdamZdt);
		} catch {
			ctx.addIssue({
				code: "custom",
				message: "Invalid date format",
			});
			return z.NEVER;
		}
	}
	ctx.addIssue({
		code: "custom",
		message: "Expected date (YYYY-MM-DD) or ISO datetime format",
	});
	return z.NEVER;
});

const SCHEDULER_ROLES = ["owner", "admin", "staff"] as const;

function ensureSchedulerRole(role: string | null | undefined): void {
	assertOrgRole(role, SCHEDULER_ROLES);
}

type AssigneeRow = {
	readonly job_id: string;
	readonly employee_id: string;
	readonly is_primary: boolean;
};

const normalizePrimaryId = (value: unknown): string | null =>
	typeof value === "string" && value.length > 0 ? value : null;

const normalizeSecondaryIds = (
	primaryId: string | null,
	secondaryIds: readonly string[],
): string[] => {
	const unique = new Set(secondaryIds);
	if (primaryId) {
		unique.delete(primaryId);
	}
	return Array.from(unique);
};

const normalizeAssignmentActor = (
	userId: string | null | undefined,
): string | null =>
	typeof userId === "string" && userId.length > 0 ? userId : null;

const buildSecondaryMap = (
	rows: readonly AssigneeRow[],
): Map<string, string[]> => {
	const map = new Map<string, string[]>();
	for (const row of rows) {
		if (row.is_primary) continue;
		const existing = map.get(row.job_id);
		if (existing) {
			existing.push(row.employee_id);
		} else {
			map.set(row.job_id, [row.employee_id]);
		}
	}
	return map;
};

const fetchSecondaryAssignees = async (
	db: SupabaseClient<Database>,
	jobIds: readonly string[],
): Promise<Map<string, string[]>> => {
	if (jobIds.length === 0) {
		return new Map();
	}

	const response = await db
		.from("job_assignees")
		.select("job_id, employee_id, is_primary")
		.in("job_id", jobIds)
		.throwOnError();

	const rows = response.data as AssigneeRow[];
	return buildSecondaryMap(rows);
};

const fetchSecondaryForJob = async (
	db: SupabaseClient<Database>,
	jobId: string,
): Promise<string[]> => {
	const response = await db
		.from("job_assignees")
		.select("job_id, employee_id, is_primary")
		.eq("job_id", jobId)
		.throwOnError();

	const rows = response.data as AssigneeRow[];
	return buildSecondaryMap(rows).get(jobId) ?? [];
};

interface UpsertAssignmentsParams {
	readonly db: SupabaseClient<Database>;
	readonly jobId: string;
	readonly orgId: string;
	readonly primaryEmployeeId: string | null;
	readonly secondaryEmployeeIds: readonly string[];
	readonly actorUserId: string | null;
}

const replaceJobAssignees = async ({
	db,
	jobId,
	orgId,
	primaryEmployeeId,
	secondaryEmployeeIds,
	actorUserId,
}: UpsertAssignmentsParams): Promise<void> => {
	await db.from("job_assignees").delete().eq("job_id", jobId).throwOnError();

	const normalizedSecondaries = normalizeSecondaryIds(
		primaryEmployeeId,
		secondaryEmployeeIds,
	);

	const assignedAt = Temporal.Now.instant().toString();
	const assignmentActor = normalizeAssignmentActor(actorUserId);

	const rows: TablesInsert<"job_assignees">[] = [];

	if (primaryEmployeeId) {
		rows.push({
			job_id: jobId,
			employee_id: primaryEmployeeId,
			is_primary: true,
			assigned_at: assignedAt,
			assigned_by: assignmentActor,
			org_id: orgId,
		});
	}

	for (const employee of normalizedSecondaries) {
		rows.push({
			job_id: jobId,
			employee_id: employee,
			is_primary: false,
			assigned_at: assignedAt,
			assigned_by: assignmentActor,
			org_id: orgId,
		});
	}

	if (rows.length > 0) {
		await db.from("job_assignees").insert(rows).throwOnError();
	}
};

export const jobsRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z.object({
				from: isoDateSchema,
				to: isoDateSchema,
				employeeId: uuidSchema.optional(), // Legacy support
				employeeIds: z.array(z.string()).optional(), // New multi-select support
				status: jobStatusSchema.optional(),
			}),
		)
		.query(async ({ ctx, input }): Promise<JobDTO[]> => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId } = auth;
			const { from, to, employeeId, employeeIds, status } = input;

			let jobIdFilter: string[] | null = null;
			const filterEmployeeIds =
				employeeIds && employeeIds.length > 0
					? Array.from(new Set(employeeIds))
					: employeeId
						? [employeeId]
						: [];

			if (filterEmployeeIds.length > 0) {
				const assignmentFilter = await db
					.from("job_assignees")
					.select("job_id")
					.eq("org_id", orgId)
					.in("employee_id", filterEmployeeIds)
					.throwOnError();

				const ids = assignmentFilter.data;
				jobIdFilter = Array.from(new Set(ids.map((row) => row.job_id)));

				if (jobIdFilter.length === 0) {
					return [];
				}
			}

			let query = db
				.from("jobs")
				.select(`
					*,
					customers (
						id,
						name,
						archived_at
					)
				`)
				.eq("org_id", orgId)
				.gte("starts_at", from)
				.lte("ends_at", to)
				.order("starts_at", { ascending: true });

			if (jobIdFilter) {
				query = query.in("id", jobIdFilter);
			}

			if (status !== undefined) {
				const dbStatus = toDbStatus(status);
				query = query.eq("status", dbStatus as string);
			}

			const { data, error } = await query;

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch jobs",
				});
			}

			const typedData = data as
				| (Tables<"jobs"> & {
						customers?: {
							id: string;
							name: string;
							archived_at: string | null;
						} | null;
				  })[]
				| null;
			if (!typedData) {
				return [];
			}

			const secondaryByJob = await fetchSecondaryAssignees(
				db,
				typedData.map((row) => row.id),
			);

			return typedData.map((row) => ({
				id: row.id,
				title: row.title,
				description: row.description ?? "",
				start: row.starts_at ?? "",
				end: row.ends_at ?? "",
				employeeId: row.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: secondaryByJob.get(row.id) ?? [],
				status: fromDbStatus(row.status as JobStatusDB),
				priority: row.priority as JobDTO["priority"],
				address: row.address ?? "",
				customerId: row.customer_id,
				// Customer information for archived badge display
				customer: row.customers
					? {
							id: row.customers.id,
							name: row.customers.name,
							isArchived: Boolean(row.customers.archived_at),
						}
					: null,
				// notes field doesn't exist in base schema - only description
				// legacy back-compat fields
				starts_at: row.starts_at ?? "",
				ends_at: row.ends_at ?? "",
			}));
		}),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1, zMsg(E.titleRequired)),
				description: z.string().optional(),
				start: isoDateSchema,
				end: isoDateSchema,
				address: z.object({
					postalCode: z.string().regex(NL_POSTCODE, zMsg(E.postalInvalid)),
					houseNumber: z
						.union([z.string(), z.number()])
						.refine(
							(v) => String(v).trim() !== "",
							zMsg(E.houseNumberRequired),
						),
					addition: z.string().optional(),
					street: z.string().optional(),
					city: z.string().optional(),
				}),
				customerId: uuidSchema,
				employeeId: uuidSchema.optional(),
				secondaryEmployeeIds: z.array(uuidSchema).default([]),
				status: jobStatusSchema.default("planned"),
				// notes removed - using description field instead
			}),
		)
		.mutation(async ({ ctx, input }): Promise<JobDTO> => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId, userId } = auth;
			const {
				title,
				description,
				start,
				end,
				address,
				customerId,
				employeeId,
				secondaryEmployeeIds,
				status,
				// notes removed - using description field instead
			} = input;

			const primaryAssigneeId = normalizePrimaryId(employeeId);
			const normalizedSecondary = normalizeSecondaryIds(
				primaryAssigneeId,
				secondaryEmployeeIds,
			);

			// Address is now required via schema validation
			// Convert structured address to string for database storage
			const addressString =
				`${address.street ?? ""} ${address.houseNumber}${address.addition ?? ""}, ${address.postalCode} ${address.city ?? ""}`.trim();

			// Customer ID is now required - no more temporary customers

			const jobData: TablesInsert<"jobs"> = {
				org_id: orgId,
				customer_id: customerId,
				title,
				description: description ?? null,
				starts_at: start,
				ends_at: end,
				status: toDbStatus(status),
				address: addressString,
				// notes field doesn't exist in base schema - using description
				...(primaryAssigneeId ? { employee_id: primaryAssigneeId } : {}),
			};

			const createResult = await db
				.from("jobs")
				.insert(jobData)
				.select()
				.single()
				.throwOnError();

			const createdTyped = createResult.data as Tables<"jobs">;

			await replaceJobAssignees({
				db,
				jobId: createdTyped.id,
				orgId,
				primaryEmployeeId: primaryAssigneeId,
				secondaryEmployeeIds: normalizedSecondary,
				actorUserId: auth.userId,
			});

			// Log job creation for audit trail
			await logJobAudit(db, {
				orgId,
				userId,
				action: "create",
				jobId: createdTyped.id,
				after: {
					title: createdTyped.title,
					starts_at: createdTyped.starts_at,
					ends_at: createdTyped.ends_at,
					status: createdTyped.status,
					customer_id: createdTyped.customer_id,
					employee_id: createdTyped.employee_id,
					secondary_employee_ids: normalizedSecondary,
				},
			});

			return {
				id: createdTyped.id,
				title: createdTyped.title,
				description: createdTyped.description ?? "",
				start: createdTyped.starts_at ?? "",
				end: createdTyped.ends_at ?? "",
				employeeId: createdTyped.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: normalizedSecondary,
				status: fromDbStatus(createdTyped.status as JobStatusDB),
				priority: createdTyped.priority as JobDTO["priority"],
				address: createdTyped.address ?? "",
				customerId: createdTyped.customer_id,
				// notes field doesn't exist in base schema
				// legacy back-compat fields
				starts_at: createdTyped.starts_at ?? "",
				ends_at: createdTyped.ends_at ?? "",
			};
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: uuidSchema,
				patch: z.object({
					title: z.string().min(1).optional(),
					description: z.string().optional(),
					start: isoDateSchema.optional(),
					end: isoDateSchema.optional(),
					address: z.string().optional(),
					employeeId: uuidSchema.optional(),
					status: jobStatusSchema.optional(),
					// notes removed - using description field instead
				}),
			}),
		)
		.mutation(async ({ ctx, input }): Promise<JobDTO> => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId, userId } = auth;
			const { id, patch } = input;

			const currentJobResult = await db
				.from("jobs")
				.select("*")
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			if (currentJobResult.error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found or you don't have permission to update it",
				});
			}

			const currentJobData = currentJobResult.data;
			if (!currentJobData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found or you don't have permission to update it",
				});
			}

			const currentJobTyped = currentJobData as Tables<"jobs">;
			const existingSecondaries = await fetchSecondaryForJob(db, id);
			const nextPrimary = normalizePrimaryId(patch.employeeId);

			const updateData: TablesUpdate<"jobs"> = {};
			if (patch.title !== undefined) updateData.title = patch.title;
			if (patch.description !== undefined)
				updateData.description = patch.description;
			if (patch.start !== undefined) updateData.starts_at = patch.start;
			if (patch.end !== undefined) updateData.ends_at = patch.end;
			if (patch.address !== undefined) updateData.address = patch.address;
			if (patch.employeeId !== undefined) updateData.employee_id = nextPrimary;
			if (patch.status !== undefined)
				updateData.status = toDbStatus(patch.status);

			const updateResult = await db
				.from("jobs")
				.update({
					...updateData,
					updated_at: Temporal.Now.instant().toString(),
				} satisfies TablesUpdate<"jobs">)
				.eq("id", id)
				.eq("org_id", orgId)
				.select()
				.single()
				.throwOnError();

			const updatedJob = updateResult.data as Tables<"jobs">;

			if (patch.employeeId !== undefined) {
				await replaceJobAssignees({
					db,
					jobId: id,
					orgId,
					primaryEmployeeId: nextPrimary,
					secondaryEmployeeIds: existingSecondaries,
					actorUserId: auth.userId,
				});
			}

			const nextSecondaryAssignees = await fetchSecondaryForJob(db, id);

			// Log job update for audit trail
			const auditParams = {
				orgId,
				userId,
				action: "update" as const,
				jobId: id,
				after: {
					title: updatedJob.title,
					starts_at: updatedJob.starts_at,
					ends_at: updatedJob.ends_at,
					status: updatedJob.status,
					employee_id: updatedJob.employee_id,
					secondary_employee_ids: nextSecondaryAssignees,
					address: updatedJob.address,
					description: updatedJob.description ?? "",
				},
				metadata: { updatedFields: Object.keys(patch) },
			};

			await logJobAudit(db, {
				...auditParams,
				before: {
					title: currentJobTyped.title,
					starts_at: currentJobTyped.starts_at,
					ends_at: currentJobTyped.ends_at,
					status: currentJobTyped.status,
					employee_id: currentJobTyped.employee_id,
					secondary_employee_ids: existingSecondaries,
					address: currentJobTyped.address,
					description: currentJobTyped.description ?? "",
				},
			});

			return {
				id: updatedJob.id,
				title: updatedJob.title,
				description: updatedJob.description ?? "",
				start: updatedJob.starts_at ?? "",
				end: updatedJob.ends_at ?? "",
				employeeId: updatedJob.employee_id ?? null,
				secondaryEmployeeIds: nextSecondaryAssignees,
				status: fromDbStatus(updatedJob.status as JobStatusDB),
				priority: updatedJob.priority as JobDTO["priority"],
				address: updatedJob.address ?? "",
				customerId: updatedJob.customer_id,
				starts_at: updatedJob.starts_at ?? "",
				ends_at: updatedJob.ends_at ?? "",
			};
		}),

	move: protectedProcedure
		.input(
			z.object({
				id: uuidSchema,
				startLocal: z.string(), // Local Amsterdam ISO
				endLocal: z.string(), // Local Amsterdam ISO
				employeeId: uuidSchema.optional(),
			}),
		)
		.mutation(async ({ ctx, input }): Promise<JobDTO> => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId, userId } = auth;
			const { id, startLocal, endLocal, employeeId } = input;

			// Business hours validation
			if (!isWithinBusinessHours(startLocal, endLocal)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Buiten werktijden (08:00–18:00). Kies een tijd binnen kantooruren.",
				});
			}

			// Convert to UTC for database storage
			const startUTC = toISO(toZDT(startLocal));
			const endUTC = toISO(toZDT(endLocal));

			const currentJobResult = await db
				.from("jobs")
				.select(
					"id, title, description, starts_at, ends_at, status, priority, address, customer_id, employee_id",
				)
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			if (currentJobResult.error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden of geen toegang",
				});
			}

			const currentJobData = currentJobResult.data;
			if (!currentJobData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden of geen toegang",
				});
			}

			const currentJobTyped = currentJobData as Tables<"jobs">;
			const existingSecondaries = await fetchSecondaryForJob(db, id);
			const nextPrimary =
				employeeId === undefined
					? normalizePrimaryId(currentJobTyped.employee_id)
					: normalizePrimaryId(employeeId);
			const normalizedSecondaries = normalizeSecondaryIds(
				nextPrimary,
				existingSecondaries,
			);

			const updatePayload: TablesUpdate<"jobs"> = {
				starts_at: startUTC,
				ends_at: endUTC,
				updated_at: Temporal.Now.instant().toString(),
			};

			if (employeeId !== undefined) {
				updatePayload.employee_id = nextPrimary;
			}

			const { data: moved, error: moveErr } = await db
				.from("jobs")
				.update(updatePayload)
				.eq("id", id)
				.eq("org_id", orgId) // Security: ensure org ownership
				.select()
				.maybeSingle();

			if (moveErr) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to reschedule job",
				});
			}

			if (!moved) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to reschedule job",
				});
			}

			if (employeeId !== undefined) {
				await replaceJobAssignees({
					db,
					jobId: id,
					orgId,
					primaryEmployeeId: nextPrimary,
					secondaryEmployeeIds: normalizedSecondaries,
					actorUserId: auth.userId,
				});
			}

			// Type assertion: moved should be non-null after successful update
			const movedRowTyped = moved as Tables<"jobs">;

			// Log job move/reschedule for audit trail
			const moveAuditParams = {
				orgId,
				userId,
				action: "move" as const,
				jobId: id,
				after: {
					starts_at: startUTC,
					ends_at: endUTC,
					employee_id: nextPrimary,
					secondary_employee_ids: normalizedSecondaries,
				},
			};

			await logJobAudit(db, {
				...moveAuditParams,
				before: {
					starts_at: currentJobTyped.starts_at,
					ends_at: currentJobTyped.ends_at,
					employee_id: currentJobTyped.employee_id,
					secondary_employee_ids: existingSecondaries,
				},
			});

			// movedRowTyped already declared above
			return {
				id: movedRowTyped.id,
				title: movedRowTyped.title,
				description: movedRowTyped.description ?? "",
				start: movedRowTyped.starts_at ?? "",
				end: movedRowTyped.ends_at ?? "",
				employeeId: movedRowTyped.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: normalizedSecondaries,
				status: fromDbStatus(movedRowTyped.status as JobStatusDB),
				priority: movedRowTyped.priority as JobDTO["priority"],
				address: movedRowTyped.address ?? "",
				customerId: movedRowTyped.customer_id,
				// notes field doesn't exist in base schema
				// legacy back-compat fields
				starts_at: movedRowTyped.starts_at ?? "",
				ends_at: movedRowTyped.ends_at ?? "",
			};
		}),

	remove: protectedProcedure
		.input(z.object({ id: uuidSchema }))
		.mutation(async ({ ctx, input }): Promise<void> => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId } = auth;
			const { id } = input;

			const { error, count } = await db
				.from("jobs")
				.delete()
				.eq("id", id)
				.eq("org_id", orgId); // Security: ensure org ownership

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to remove job: ${error.message}`,
				});
			}

			if (count === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found or you don't have permission to delete it",
				});
			}

			// Log job deletion for audit trail - TEMPORARILY DISABLED FOR DEBUGGING
			// if (jobToDeleteTyped) {
			// 	await logJobAudit(db, {
			// 		orgId,
			// 		userId: ctx.auth.userId,
			// 		action: "delete",
			// 		jobId: id,
			// 		before: {
			// 			title: jobToDeleteTyped.title,
			// 			starts_at: jobToDeleteTyped.starts_at,
			// 			ends_at: jobToDeleteTyped.ends_at,
			// 			status: jobToDeleteTyped.status,
			// 			customer_id: jobToDeleteTyped.customer_id,
			// 			employee_id: jobToDeleteTyped.employee_id,
			// 		},
			// 	});
			// } else {
			// 	await logJobAudit(db, {
			// 		orgId,
			// 		userId: ctx.auth.userId,
			// 		action: "delete",
			// 		jobId: id,
			// 	});
			// }
		}),

	byId: protectedProcedure
		.input(z.object({ id: uuidSchema }))
		.query(async ({ ctx, input }) => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId } = auth;
			const { id } = input;

			// First get the job
			const { data: jobData, error: jobError } = await db
				.from("jobs")
				.select("*")
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			if (jobError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch job",
				});
			}

			if (!jobData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found",
				});
			}

			// Then get the customer separately to avoid RLS nested select issues
			const { data: customerData } = await db
				.from("customers")
				.select("id, name, archived_at")
				.eq("id", jobData.customer_id)
				.eq("org_id", orgId)
				.maybeSingle();

			// Combine the data manually
			const data = {
				...jobData,
				customers: customerData,
			};

			const job = data as Tables<"jobs"> & {
				customers?: {
					id: string;
					name: string;
					archived_at: string | null;
				} | null;
			};

			const secondaryEmployeeIds = await fetchSecondaryForJob(db, job.id);
			return {
				id: job.id,
				title: job.title,
				description: job.description ?? "",
				start: job.starts_at ?? "",
				end: job.ends_at ?? "",
				employeeId: job.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds,
				status: fromDbStatus(job.status as JobStatusDB),
				priority: job.priority as JobDTO["priority"],
				address: job.address ?? "",
				customerId: job.customer_id,
				// Customer information for archived badge display
				customer: job.customers
					? {
							id: job.customers.id,
							name: job.customers.name,
							isArchived: Boolean(job.customers.archived_at),
						}
					: null,
				// notes field doesn't exist in base schema
				// legacy back-compat fields
				starts_at: job.starts_at ?? "",
				ends_at: job.ends_at ?? "",
			};
		}),

	updateAssignees: protectedProcedure
		.input(
			z.object({
				jobId: uuidSchema,
				primaryEmployeeId: uuidSchema.optional(),
				secondaryEmployeeIds: z.array(uuidSchema).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId, userId } = auth;
			// TODO: derive employeeId from userId if needed; for now, restrict with role only.
			const { jobId } = input;

			const currentJobResult = await db
				.from("jobs")
				.select(
					"id, employee_id, title, starts_at, ends_at, status, priority, address, customer_id, description",
				)
				.eq("id", jobId)
				.eq("org_id", orgId)
				.maybeSingle();

			if (currentJobResult.error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden of geen toegang",
				});
			}

			const currentJobData = currentJobResult.data;
			if (!currentJobData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden of geen toegang",
				});
			}

			const currentJobTyped = currentJobData as Tables<"jobs">;
			const existingSecondaries = await fetchSecondaryForJob(db, jobId);

			const nextPrimary =
				input.primaryEmployeeId === undefined
					? normalizePrimaryId(currentJobTyped.employee_id)
					: normalizePrimaryId(input.primaryEmployeeId);

			const desiredSecondaries = normalizeSecondaryIds(
				nextPrimary,
				input.secondaryEmployeeIds ?? existingSecondaries,
			);

			const { error } = await db
				.from("jobs")
				.update({
					employee_id: nextPrimary,
					updated_at: Temporal.Now.instant().toString(),
				} satisfies TablesUpdate<"jobs">)
				.eq("id", jobId)
				.eq("org_id", orgId)
				.select("id")
				.maybeSingle();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update assignees",
				});
			}

			await replaceJobAssignees({
				db,
				jobId,
				orgId,
				primaryEmployeeId: nextPrimary,
				secondaryEmployeeIds: desiredSecondaries,
				actorUserId: auth.userId,
			});

			await logJobAudit(db, {
				orgId,
				userId,
				action: "update",
				jobId,
				before: {
					employee_id: currentJobTyped.employee_id,
					secondary_employee_ids: existingSecondaries,
				},
				after: {
					employee_id: nextPrimary,
					secondary_employee_ids: desiredSecondaries,
				},
			});

			return {
				success: true,
				employeeId: nextPrimary,
				secondaryEmployeeIds: desiredSecondaries,
			};
		}),

	reschedule: protectedProcedure
		.input(
			z.object({
				jobId: uuidSchema,
				starts_at: z.string(),
				ends_at: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db } = ctx;
			const { auth } = ctx;
			ensureSchedulerRole(auth.role);
			const { orgId, userId } = auth;
			// TODO: derive employeeId from userId if needed; for now, restrict with role only.
			const { jobId, starts_at, ends_at } = input;

			// Get current job for permission and audit
			const currentJobResult = await db
				.from("jobs")
				.select("*")
				.eq("id", jobId)
				.eq("org_id", orgId)
				.maybeSingle();

			if (currentJobResult.error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden of geen toegang",
				});
			}

			const currentJobData = currentJobResult.data;
			if (!currentJobData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job niet gevonden of geen toegang",
				});
			}

			const currentJobTyped = currentJobData as Tables<"jobs">;
			const secondaryAssignees = await fetchSecondaryForJob(db, jobId);

			// Permission check for staff
			// TODO: Implement proper staff permission check once employee lookup is implemented
			// Currently allowing all org members to reschedule jobs

			// Business hours validation removed for now - can be re-added with proper role detection

			const { data: updated, error } = await db
				.from("jobs")
				.update({
					starts_at,
					ends_at,
					updated_at: Temporal.Now.instant().toString(),
				})
				.eq("id", jobId)
				.eq("org_id", orgId)
				.select()
				.maybeSingle();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to reschedule job",
				});
			}

			// Log reschedule action
			await logJobAudit(db, {
				orgId,
				userId,
				action: "move",
				jobId,
				before: {
					starts_at: currentJobTyped.starts_at,
					ends_at: currentJobTyped.ends_at,
					employee_id: currentJobTyped.employee_id,
					secondary_employee_ids: secondaryAssignees,
				},
				after: {
					starts_at,
					ends_at,
					employee_id: currentJobTyped.employee_id,
					secondary_employee_ids: secondaryAssignees,
				},
			});

			const updatedTyped = updated as Tables<"jobs">;
			return {
				id: updatedTyped.id,
				title: updatedTyped.title,
				description: updatedTyped.description ?? "",
				start: updatedTyped.starts_at ?? "",
				end: updatedTyped.ends_at ?? "",
				employeeId: updatedTyped.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: secondaryAssignees,
				status: fromDbStatus(updatedTyped.status as JobStatusDB),
				priority: updatedTyped.priority as JobDTO["priority"],
				address: updatedTyped.address ?? "",
				customerId: updatedTyped.customer_id,
				// notes field doesn't exist in base schema
				// legacy back-compat fields
				starts_at: updatedTyped.starts_at ?? "",
				ends_at: updatedTyped.ends_at ?? "",
			};
		}),
});
