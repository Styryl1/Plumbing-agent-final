import { TRPCError } from "@trpc/server";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { logJobAudit } from "~/lib/audit";
import { toISO, toZDT } from "~/lib/calendar-temporal";
import { isWithinBusinessHours } from "~/lib/dates";
import { E } from "~/lib/i18n/errors";
import { zMsg } from "~/lib/i18n/zodMessage";
import { fromDbStatus, type JobStatusDB, toDbStatus } from "~/lib/job-status";
import { NL_POSTCODE } from "~/lib/validation/postcode";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { JobDTO } from "~/types/job";
import type { Tables, TablesInsert, TablesUpdate } from "~/types/supabase";

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
			const { orgId } = ctx.auth;
			const { from, to, employeeId, employeeIds, status } = input;

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

			// Support both single employeeId (legacy) and employeeIds array (new)
			if (employeeIds && employeeIds.length > 0) {
				query = query.in("employee_id", employeeIds);
			} else if (employeeId) {
				query = query.eq("employee_id", employeeId);
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

			return typedData.map((row) => ({
				id: row.id,
				title: row.title,
				description: row.description ?? "",
				start: row.starts_at ?? "",
				end: row.ends_at ?? "",
				employeeId: row.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: [], // TODO: Query job_assignees table for multi-assignee support
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
				status: jobStatusSchema.default("planned"),
				// notes removed - using description field instead
			}),
		)
		.mutation(async ({ ctx, input }): Promise<JobDTO> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const {
				title,
				description,
				start,
				end,
				address,
				customerId,
				employeeId,
				status,
				// notes removed - using description field instead
			} = input;

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
				// Only include employee_id if we actually have a value
				...(employeeId !== undefined ? { employee_id: employeeId } : {}),
			};

			const { data: created, error: insertErr } = await db
				.from("jobs")
				.insert(jobData)
				.select()
				.single();

			const createdTyped = created as Tables<"jobs">;

			if (insertErr) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create job",
				});
			}

			// Log job creation for audit trail
			await logJobAudit(db, {
				orgId,
				userId: ctx.auth.userId,
				action: "create",
				jobId: createdTyped.id,
				after: {
					title: createdTyped.title,
					starts_at: createdTyped.starts_at,
					ends_at: createdTyped.ends_at,
					status: createdTyped.status,
					customer_id: createdTyped.customer_id,
					employee_id: createdTyped.employee_id,
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
				secondaryEmployeeIds: [], // TODO: Query job_assignees table for multi-assignee support
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
			const { orgId } = ctx.auth;
			const { id, patch } = input;

			// Get current job data for audit logging
			const { data: currentJob } = await db
				.from("jobs")
				.select("*")
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			const currentJobTyped = currentJob as Tables<"jobs"> | null;

			const updateData: TablesUpdate<"jobs"> = {};

			if (patch.title !== undefined) updateData.title = patch.title;
			if (patch.description !== undefined)
				updateData.description = patch.description;
			if (patch.start !== undefined) updateData.starts_at = patch.start;
			if (patch.end !== undefined) updateData.ends_at = patch.end;
			if (patch.address !== undefined) updateData.address = patch.address;
			if (patch.employeeId !== undefined)
				updateData.employee_id = patch.employeeId;
			if (patch.status !== undefined)
				updateData.status = toDbStatus(patch.status);
			// notes field doesn't exist in base schema - using description field

			const { data, error } = await db
				.from("jobs")
				.update({
					...updateData,
					updated_at: Temporal.Now.instant().toString(),
				} satisfies TablesUpdate<"jobs">)
				.eq("id", id)
				.eq("org_id", orgId) // Security: ensure org ownership
				.select()
				.maybeSingle();

			// Treat error as opaque — don't read .message
			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update job",
				});
			}

			// Force the union on a new variable so ESLint sees the nullability clearly
			const row: Tables<"jobs"> | null = data as Tables<"jobs"> | null;
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found or you don't have permission to update it",
				});
			}

			// Log job update for audit trail
			const auditParams = {
				orgId,
				userId: ctx.auth.userId,
				action: "update" as const,
				jobId: id,
				after: {
					title: row.title,
					starts_at: row.starts_at,
					ends_at: row.ends_at,
					status: row.status,
					employee_id: row.employee_id,
					address: row.address,
					description: row.description ?? "",
				},
				metadata: { updatedFields: Object.keys(patch) },
			};

			if (currentJobTyped) {
				await logJobAudit(db, {
					...auditParams,
					before: {
						title: currentJobTyped.title,
						starts_at: currentJobTyped.starts_at,
						ends_at: currentJobTyped.ends_at,
						status: currentJobTyped.status,
						employee_id: currentJobTyped.employee_id,
						address: currentJobTyped.address,
						description: currentJobTyped.description,
					},
				});
			} else {
				await logJobAudit(db, auditParams);
			}

			const rowTyped: Tables<"jobs"> = row;
			return {
				id: rowTyped.id,
				title: rowTyped.title,
				description: rowTyped.description ?? "",
				start: rowTyped.starts_at ?? "",
				end: rowTyped.ends_at ?? "",
				employeeId: rowTyped.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: [], // TODO: Query job_assignees table for multi-assignee support
				status: fromDbStatus(rowTyped.status as JobStatusDB),
				priority: rowTyped.priority as JobDTO["priority"],
				address: rowTyped.address ?? "",
				customerId: rowTyped.customer_id,
				// notes field doesn't exist in base schema
				// legacy back-compat fields
				starts_at: rowTyped.starts_at ?? "",
				ends_at: rowTyped.ends_at ?? "",
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
			const { orgId } = ctx.auth;
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

			// Get current job times for audit logging
			const { data: currentJob } = await db
				.from("jobs")
				.select("starts_at, ends_at")
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			const currentJobTyped = currentJob as Pick<
				Tables<"jobs">,
				"starts_at" | "ends_at"
			> | null;

			const { data: moved, error: moveErr } = await db
				.from("jobs")
				.update({
					starts_at: startUTC,
					ends_at: endUTC,
					employee_id: employeeId ?? null,
					updated_at: Temporal.Now.instant().toString(),
				} satisfies TablesUpdate<"jobs">)
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

			// Type assertion: moved should be non-null after successful update
			const movedRowTyped = moved as unknown as Tables<"jobs">;

			// Log job move/reschedule for audit trail
			const moveAuditParams = {
				orgId,
				userId: ctx.auth.userId,
				action: "move" as const,
				jobId: id,
				after: {
					starts_at: startUTC,
					ends_at: endUTC,
				},
			};

			if (currentJobTyped) {
				await logJobAudit(db, {
					...moveAuditParams,
					before: {
						starts_at: currentJobTyped.starts_at,
						ends_at: currentJobTyped.ends_at,
					},
				});
			} else {
				await logJobAudit(db, moveAuditParams);
			}

			// movedRowTyped already declared above
			return {
				id: movedRowTyped.id,
				title: movedRowTyped.title,
				description: movedRowTyped.description ?? "",
				start: movedRowTyped.starts_at ?? "",
				end: movedRowTyped.ends_at ?? "",
				employeeId: movedRowTyped.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: [], // TODO: Query job_assignees table for multi-assignee support
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
			const { orgId } = ctx.auth;
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
			const { orgId } = ctx.auth;
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

			// TODO: Add secondary assignees query when multi-assignee is fully implemented
			return {
				id: job.id,
				title: job.title,
				description: job.description ?? "",
				start: job.starts_at ?? "",
				end: job.ends_at ?? "",
				employeeId: job.employee_id ?? null,
				// Multi-assignee support via job_assignees table (migration 003)
				secondaryEmployeeIds: [], // TODO: Query job_assignees table for multi-assignee support
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
			const { orgId, userId } = ctx.auth;
			// TODO: derive employeeId from userId if needed; for now, restrict with role only.
			const { jobId, primaryEmployeeId } = input;

			// Get current job for permission check
			const { data: currentJob } = await db
				.from("jobs")
				.select("*")
				.eq("id", jobId)
				.eq("org_id", orgId)
				.maybeSingle();

			// Type assertion: currentJob should exist for valid updates
			const currentJobTyped = currentJob as unknown as Tables<"jobs">;

			// Permission check
			// TODO: Implement proper staff permission check once employee lookup is implemented
			// Currently allowing all org members to reassign jobs

			const beforeAssignee: string | null = currentJobTyped.employee_id;

			// Update primary assignee
			const { error } = await db
				.from("jobs")
				.update({
					employee_id: primaryEmployeeId ?? null,
					updated_at: Temporal.Now.instant().toString(),
				})
				.eq("id", jobId)
				.eq("org_id", orgId)
				.select()
				.maybeSingle();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update assignees",
				});
			}

			// Log assignee change
			await logJobAudit(db, {
				orgId,
				userId,
				action: "update",
				jobId,
				before: { employee_id: beforeAssignee },
				after: { employee_id: primaryEmployeeId ?? null },
			});

			// TODO: Handle secondary assignees when multi-assignee table is ready

			return { success: true };
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
			const { orgId, userId } = ctx.auth;
			// TODO: derive employeeId from userId if needed; for now, restrict with role only.
			const { jobId, starts_at, ends_at } = input;

			// Get current job for permission and audit
			const { data: currentJob } = await db
				.from("jobs")
				.select("*")
				.eq("id", jobId)
				.eq("org_id", orgId)
				.maybeSingle();

			// Type assertion: currentJob should exist for valid reschedule
			const currentJobTyped = currentJob as unknown as Tables<"jobs">;

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
				},
				after: {
					starts_at,
					ends_at,
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
				secondaryEmployeeIds: [], // TODO: Query job_assignees table for multi-assignee support
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
