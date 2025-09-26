import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { logAuditEvent, logCustomerAudit, logJobAudit } from "~/lib/audit";
import { assertOrgRole } from "~/lib/authz";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mustSingle, rowsOrEmpty } from "~/server/db/unwrap";
import { formatDutchPostalCode } from "~/server/mappers/customerMapper";
import { toIntakeDetail, toIntakeSummary } from "~/server/mappers/intake";
import { signIntakeMedia } from "~/server/services/intake/media-signing";
import type { IntakeDetailDTO, IntakeSummaryDTO } from "~/types/intake";
import type { Tables, TablesInsert } from "~/types/supabase";

type IntakeWithUnscheduled = Tables<"intake_events"> & {
	unscheduled?: Array<
		Pick<Tables<"unscheduled_items">, "status" | "priority" | "id">
	> | null;
};

type UnscheduledSummary = Pick<
	Tables<"unscheduled_items">,
	"status" | "priority" | "id"
>;

const isUnscheduledSummary = (value: unknown): value is UnscheduledSummary => {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const candidate = value as Partial<UnscheduledSummary>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.status === "string" &&
		typeof candidate.priority === "string"
	);
};

const listInputSchema = z
	.object({
		status: z.enum(["pending", "applied", "dismissed"]).default("pending"),
		channel: z.enum(["whatsapp", "voice"]).optional(),
		limit: z.number().int().min(1).max(100).default(25),
		cursor: z.iso.datetime().optional(),
	})
	.optional();

const intakeSelect = `
	*,
	unscheduled:unscheduled_items(
		status,
		priority,
		id
	)
`;

const PRIORITY_VALUES = ["normal", "urgent", "emergency"] as const;

const jobApplySchema = z.object({
	title: z.string().min(1),
	description: z.string().max(2000).optional(),
	startIso: z.string(),
	durationMinutes: z
		.number()
		.int()
		.min(15)
		.max(8 * 60),
	priority: z.enum(PRIORITY_VALUES).default("normal"),
	employeeId: z.uuid().nullable().optional(),
});

const existingCustomerSchema = z.object({
	mode: z.literal("existing"),
	id: z.uuid(),
});

const newCustomerSchema = z.object({
	mode: z.literal("new"),
	name: z.string().min(1),
	phone: z.string().trim().min(6).max(32),
	email: z.email().optional(),
	language: z.enum(["nl", "en"]).optional(),
	street: z.string().optional(),
	houseNumber: z.string().optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
});

const customerApplySchema = z.discriminatedUnion("mode", [
	existingCustomerSchema,
	newCustomerSchema,
]);

const siteApplySchema = z
	.object({
		label: z.string().optional(),
		street: z.string().optional(),
		houseNumber: z.string().optional(),
		addition: z.string().optional(),
		postalCode: z.string().optional(),
		city: z.string().optional(),
	})
	.partial();

const applyIntakeInputSchema = z.object({
	intakeEventId: z.uuid(),
	suggestionId: z.uuid().optional(),
	job: jobApplySchema,
	customer: customerApplySchema,
	site: siteApplySchema.optional(),
	notes: z.string().max(2000).optional(),
});

const undoApplyInputSchema = z.object({
	undoToken: z.uuid(),
});

export const intakeRouter = createTRPCRouter({
	list: protectedProcedure
		.input(listInputSchema)
		.query(async ({ ctx, input }) => {
			const { db, auth, timezone } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);
			const orgId = auth.orgId;
			const limit = input?.limit ?? 25;
			let query = db
				.from("intake_events")
				.select(intakeSelect)
				.eq("org_id", orgId)
				.order("received_at", { ascending: false })
				.limit(limit + 1);

			if (typeof input?.status === "string") {
				query = query.eq("unscheduled_items.status", input.status);
			}

			if (typeof input?.channel === "string") {
				query = query.eq("channel", input.channel);
			}

			if (input?.cursor !== undefined) {
				query = query.lt("received_at", input.cursor);
			}

			const listResponse = await query;
			const rows = rowsOrEmpty<IntakeWithUnscheduled>({
				data: listResponse.data as IntakeWithUnscheduled[] | null,
				error: listResponse.error,
			});
			const hasMore = rows.length > limit;
			const rawSummaries: IntakeSummaryDTO[] = (
				hasMore ? rows.slice(0, limit) : rows
			).map((row) => toIntakeSummary(row, timezone));
			const nextCursor =
				hasMore && rawSummaries.length > 0
					? rawSummaries[rawSummaries.length - 1]!.receivedAtIso
					: null;
			const items = await Promise.all(
				rawSummaries.map(async (summary) => ({
					...summary,
					media: await signIntakeMedia(db, summary.media),
				})),
			);

			return {
				items,
				nextCursor,
			};
		}),

	get: protectedProcedure
		.input(z.object({ intakeEventId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const { db, auth, timezone } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);
			try {
				const singleResponse = await db
					.from("intake_events")
					.select(intakeSelect)
					.eq("org_id", auth.orgId)
					.eq("id", input.intakeEventId)
					.maybeSingle();
				const record = mustSingle<IntakeWithUnscheduled>({
					data: singleResponse.data as IntakeWithUnscheduled | null,
					error: singleResponse.error,
				});
				const detailDto: IntakeDetailDTO = toIntakeDetail(record, timezone);
				const signedMedia = await signIntakeMedia(db, detailDto.details.media);
				return {
					...detailDto,
					media: signedMedia,
					details: {
						...detailDto.details,
						media: signedMedia,
					},
				};
			} catch (error) {
				if (error instanceof Error && error.message === "Row not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Intake not found",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}),

	setStatus: protectedProcedure
		.input(
			z.object({
				intakeEventId: z.uuid(),
				status: z.enum(["pending", "applied", "dismissed"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);
			let unscheduledRow: Pick<Tables<"unscheduled_items">, "id">;
			try {
				const unscheduledResponse = await db
					.from("unscheduled_items")
					.select("id")
					.eq("org_id", auth.orgId)
					.eq("intake_event_id", input.intakeEventId)
					.maybeSingle();
				unscheduledRow = mustSingle<Pick<Tables<"unscheduled_items">, "id">>({
					data: unscheduledResponse.data as Pick<
						Tables<"unscheduled_items">,
						"id"
					> | null,
					error: unscheduledResponse.error,
				});
			} catch (error) {
				if (error instanceof Error && error.message === "Row not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Unscheduled item not found",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}

			const updatedAt = Temporal.Now.instant().toString();
			const updateResult = await db
				.from("unscheduled_items")
				.update({
					status: input.status,
					updated_at: updatedAt,
				})
				.eq("id", unscheduledRow.id);

			if (updateResult.error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: updateResult.error.message,
				});
			}

			try {
				const detailResponse = await db
					.from("intake_events")
					.select(intakeSelect)
					.eq("org_id", auth.orgId)
					.eq("id", input.intakeEventId)
					.maybeSingle();
				const detailRecord = mustSingle<IntakeWithUnscheduled>({
					data: detailResponse.data as IntakeWithUnscheduled | null,
					error: detailResponse.error,
				});
				const summary = toIntakeSummary(detailRecord);
				return {
					...summary,
					media: await signIntakeMedia(db, summary.media),
				};
			} catch (error) {
				if (error instanceof Error && error.message === "Row not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Intake not found",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}),

	applyIntake: protectedProcedure
		.input(applyIntakeInputSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);
			const { orgId, userId, role } = auth;

			const intakeResponse = await db
				.from("intake_events")
				.select(intakeSelect)
				.eq("org_id", orgId)
				.eq("id", input.intakeEventId)
				.maybeSingle();

			const intakeRecord = mustSingle<IntakeWithUnscheduled>({
				data: intakeResponse.data as IntakeWithUnscheduled | null,
				error: intakeResponse.error,
			});

			const unscheduledRaw = Array.isArray(intakeRecord.unscheduled)
				? (intakeRecord.unscheduled.find(isUnscheduledSummary) ?? null)
				: null;

			if (!unscheduledRaw) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "No pending intake item found to apply",
				});
			}

			if (unscheduledRaw.status !== "pending") {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Intake already processed",
				});
			}

			if (input.suggestionId) {
				const suggestionResponse = await db
					.from("wa_suggestions")
					.select("*")
					.eq("org_id", orgId)
					.eq("id", input.suggestionId)
					.maybeSingle();

				mustSingle<Tables<"wa_suggestions">>({
					data: suggestionResponse.data as Tables<"wa_suggestions"> | null,
					error: suggestionResponse.error,
				});
			}

			let customerId: string;
			let createdCustomerId: string | undefined;
			let createdCustomerAudit: { name: string; phone: string } | undefined;
			if (input.customer.mode === "existing") {
				const existingCustomer = await db
					.from("customers")
					.select("id")
					.eq("org_id", orgId)
					.eq("id", input.customer.id)
					.maybeSingle();

				const row = mustSingle<{ id: string }>({
					data: existingCustomer.data as { id: string } | null,
					error: existingCustomer.error,
				});
				customerId = row.id;
			} else {
				const newCustomer = input.customer;
				const trimmedPhone = newCustomer.phone.trim();
				const customerPhones = [trimmedPhone];
				const customerInsert: TablesInsert<"customers"> = {
					org_id: orgId,
					name: newCustomer.name.trim(),
					phones: customerPhones,
					phone: customerPhones[0] ?? null,
					email: newCustomer.email?.trim() ?? null,
					language: newCustomer.language ?? "nl",
					street: newCustomer.street?.trim() ?? null,
					house_number: newCustomer.houseNumber?.trim() ?? null,
					postal_code: newCustomer.postalCode
						? formatDutchPostalCode(newCustomer.postalCode)
						: null,
					city: newCustomer.city?.trim() ?? null,
				};

				const customerResponse = await db
					.from("customers")
					.insert(customerInsert)
					.select("id")
					.single();

				if (customerResponse.error !== null) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create customer",
					});
				}

				const customerRow = customerResponse.data as { id: string } | null;
				if (customerRow === null) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create customer",
					});
				}

				customerId = customerRow.id;
				createdCustomerId = customerId;
				createdCustomerAudit = {
					name: newCustomer.name.trim(),
					phone: trimmedPhone,
				};
			}

			const siteInput = input.site;
			const hasSiteInput = Boolean(
				siteInput &&
					[
						siteInput.label,
						siteInput.street,
						siteInput.houseNumber,
						siteInput.postalCode,
						siteInput.city,
						siteInput.addition,
					].some((field) => (field ?? "").toString().trim().length > 0),
			);

			let siteId: string | undefined;
			let createdSiteId: string | undefined;
			if (hasSiteInput && siteInput !== undefined) {
				const normalizedLabel = siteInput.label?.trim();
				const siteInsert: TablesInsert<"sites"> = {
					org_id: orgId,
					customer_id: customerId,
					label:
						normalizedLabel && normalizedLabel.length > 0
							? normalizedLabel
							: "Hoofdadres",
					address_line1: siteInput.street
						? `${siteInput.street.trim()} ${siteInput.houseNumber?.trim() ?? ""}
						${siteInput.addition?.trim() ?? ""}`.trim()
						: null,
					postal_code: siteInput.postalCode
						? formatDutchPostalCode(siteInput.postalCode)
						: null,
					city: siteInput.city?.trim() ?? null,
					country: "NL",
				};

				const siteResponse = await db
					.from("sites")
					.insert(siteInsert)
					.select("id")
					.single();

				if (siteResponse.error !== null) {
					if (createdCustomerId) {
						await db
							.from("customers")
							.delete()
							.eq("id", createdCustomerId)
							.eq("org_id", orgId);
					}
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create site",
					});
				}

				const siteRow = siteResponse.data as { id: string } | null;
				if (siteRow === null) {
					if (createdCustomerId) {
						await db
							.from("customers")
							.delete()
							.eq("id", createdCustomerId)
							.eq("org_id", orgId);
					}
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create site",
					});
				}

				siteId = siteRow.id;
				createdSiteId = siteId;
			}

			const parseStart = (value: string): Temporal.Instant => {
				try {
					return Temporal.ZonedDateTime.from(value).toInstant();
				} catch {
					return Temporal.Instant.from(value);
				}
			};

			let startInstant: Temporal.Instant;
			try {
				startInstant = parseStart(input.job.startIso);
			} catch {
				if (createdSiteId) {
					await db.from("sites").delete().eq("id", createdSiteId);
				}
				if (createdCustomerId) {
					await db
						.from("customers")
						.delete()
						.eq("id", createdCustomerId)
						.eq("org_id", orgId);
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid start time",
				});
			}

			const startIso = startInstant.toString();
			const endIso = startInstant
				.add({ minutes: input.job.durationMinutes })
				.toString();

			const buildAddressString = (): string | null => {
				if (siteInput === undefined) {
					return null;
				}
				const lineParts: string[] = [];
				if (siteInput.street) {
					const houseNumber = siteInput.houseNumber
						? ` ${siteInput.houseNumber}${siteInput.addition ?? ""}`
						: "";
					lineParts.push(`${siteInput.street.trim()}${houseNumber}`.trim());
				}
				const locality =
					`${siteInput.postalCode ?? ""} ${siteInput.city ?? ""}`.trim();
				if (locality.length > 0) {
					lineParts.push(locality);
				}
				return lineParts.length > 0 ? lineParts.join(", ") : null;
			};

			const jobInsert: TablesInsert<"jobs"> = {
				org_id: orgId,
				customer_id: customerId,
				title: input.job.title,
				description: input.job.description ?? null,
				starts_at: startIso,
				ends_at: endIso,
				status: "planned",
				priority: input.job.priority,
				address: buildAddressString(),
				postal_code: siteInput?.postalCode
					? formatDutchPostalCode(siteInput.postalCode)
					: null,
				site_id: siteId ?? null,
				...(input.job.employeeId ? { employee_id: input.job.employeeId } : {}),
			};

			const jobResponse = await db
				.from("jobs")
				.insert(jobInsert)
				.select("id, title, starts_at, ends_at, status")
				.single();

			if (jobResponse.error !== null) {
				if (createdSiteId) {
					await db.from("sites").delete().eq("id", createdSiteId);
				}
				if (createdCustomerId) {
					await db
						.from("customers")
						.delete()
						.eq("id", createdCustomerId)
						.eq("org_id", orgId);
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create job",
				});
			}

			const jobRow = jobResponse.data as { id: string } | null;
			if (jobRow === null) {
				if (createdSiteId) {
					await db.from("sites").delete().eq("id", createdSiteId);
				}
				if (createdCustomerId) {
					await db
						.from("customers")
						.delete()
						.eq("id", createdCustomerId)
						.eq("org_id", orgId);
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create job",
				});
			}

			const jobId = jobRow.id;
			const nowIso = Temporal.Now.instant().toString();

			if (input.suggestionId) {
				await db
					.from("wa_suggestions")
					.update({
						status: "approved",
						approved_at: nowIso,
						approved_by: userId,
						job_id: jobId,
					})
					.eq("org_id", orgId)
					.eq("id", input.suggestionId);
			}

			const unscheduledUpdate = await db
				.from("unscheduled_items")
				.update({
					status: "applied",
					job_id: jobId,
					updated_at: nowIso,
				})
				.eq("id", unscheduledRaw.id)
				.eq("org_id", orgId)
				.eq("status", "pending")
				.select("id")
				.maybeSingle();

			if (unscheduledUpdate.error !== null) {
				await db.from("jobs").delete().eq("id", jobId).eq("org_id", orgId);
				if (createdSiteId) {
					await db.from("sites").delete().eq("id", createdSiteId);
				}
				if (createdCustomerId) {
					await db
						.from("customers")
						.delete()
						.eq("id", createdCustomerId)
						.eq("org_id", orgId);
				}
				throw new TRPCError({
					code: "CONFLICT",
					message: "Intake already processed",
				});
			}

			const unscheduledRow = unscheduledUpdate.data as { id: string } | null;
			if (unscheduledRow === null) {
				await db.from("jobs").delete().eq("id", jobId).eq("org_id", orgId);
				if (createdSiteId) {
					await db.from("sites").delete().eq("id", createdSiteId);
				}
				if (createdCustomerId) {
					await db
						.from("customers")
						.delete()
						.eq("id", createdCustomerId)
						.eq("org_id", orgId);
				}
				throw new TRPCError({
					code: "CONFLICT",
					message: "Intake already processed",
				});
			}

			await db
				.from("intake_events")
				.update({
					status: "scheduled",
					updated_at: nowIso,
				})
				.eq("id", input.intakeEventId)
				.eq("org_id", orgId);

			const undoToken = randomUUID();
			const undoExpiresAt = Temporal.Now.instant().add({ hours: 1 }).toString();

			await db.from("intake_apply_actions").insert({
				org_id: orgId,
				intake_event_id: input.intakeEventId,
				unscheduled_item_id: unscheduledRaw.id,
				job_id: jobId,
				created_customer_id: createdCustomerId ?? null,
				created_site_id: createdSiteId ?? null,
				undo_token: undoToken,
				expires_at: undoExpiresAt,
				created_by: userId,
				payload: {
					job: input.job,
					customer: input.customer,
					site: input.site ?? null,
					suggestionId: input.suggestionId ?? null,
				},
			});

			await logAuditEvent(db, {
				orgId,
				userId,
				actorRole: role,
				resource: "intake_event",
				resourceId: input.intakeEventId,
				action: "update",
				summary: "intake_event.applied",
				metadata: {
					jobId,
					suggestionId: input.suggestionId ?? null,
				},
				before: { status: intakeRecord.status },
				after: { status: "scheduled" },
			});

			if (input.suggestionId) {
				await logAuditEvent(db, {
					orgId,
					userId,
					actorRole: role,
					action: "update",
					resource: "ai_recommendation",
					resourceId: input.suggestionId,
					summary: "ai.recommendation.applied",
					metadata: {
						intakeEventId: input.intakeEventId,
						jobId,
					},
				});
			}

			await logJobAudit(db, {
				orgId,
				userId,
				action: "create",
				jobId,
				after: {
					title: input.job.title,
					starts_at: startIso,
					ends_at: endIso,
					priority: input.job.priority,
				},
			});

			if (createdCustomerId && createdCustomerAudit) {
				await logCustomerAudit(db, {
					orgId,
					userId,
					action: "create",
					customerId: createdCustomerId,
					after: {
						name: createdCustomerAudit.name,
						phone: createdCustomerAudit.phone,
					},
				});
			}

			return {
				jobId,
				undoToken,
				undoExpiresAt,
			};
		}),

	undoApply: protectedProcedure
		.input(undoApplyInputSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);
			const { orgId, userId, role } = auth;

			const actionResponse = await db
				.from("intake_apply_actions")
				.select("*")
				.eq("org_id", orgId)
				.eq("undo_token", input.undoToken)
				.maybeSingle();

			const actionRow = mustSingle<Tables<"intake_apply_actions">>({
				data: actionResponse.data as Tables<"intake_apply_actions"> | null,
				error: actionResponse.error,
			});

			if (actionRow.undone_at) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Apply action already undone",
				});
			}

			const expiresAt = Temporal.Instant.from(actionRow.expires_at);
			if (
				Temporal.Now.instant().epochMilliseconds > expiresAt.epochMilliseconds
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Undo window expired",
				});
			}

			await db
				.from("jobs")
				.delete()
				.eq("id", actionRow.job_id)
				.eq("org_id", orgId);

			await db
				.from("unscheduled_items")
				.update({
					status: "pending",
					job_id: null,
					updated_at: Temporal.Now.instant().toString(),
				})
				.eq("id", actionRow.unscheduled_item_id)
				.eq("org_id", orgId);

			await db
				.from("intake_events")
				.update({
					status: "pending",
					updated_at: Temporal.Now.instant().toString(),
				})
				.eq("id", actionRow.intake_event_id)
				.eq("org_id", orgId);

			if (actionRow.created_site_id) {
				await db
					.from("sites")
					.delete()
					.eq("id", actionRow.created_site_id)
					.eq("org_id", orgId);
			}

			await db
				.from("intake_apply_actions")
				.update({ undone_at: Temporal.Now.instant().toString() })
				.eq("id", actionRow.id);

			await logAuditEvent(db, {
				orgId,
				userId,
				actorRole: role,
				resource: "intake_event",
				resourceId: actionRow.intake_event_id,
				action: "update",
				summary: "intake_event.undo_apply",
				metadata: {
					jobId: actionRow.job_id,
					undoToken: input.undoToken,
				},
			});

			return { success: true };
		}),
});
