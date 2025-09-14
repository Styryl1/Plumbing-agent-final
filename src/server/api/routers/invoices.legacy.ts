import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { useTranslations } from "next-intl";
import { ZodError, z } from "zod";
import { assertNonNullish } from "~/lib/assert";
import { E } from "~/lib/i18n/errors";
import { zMsg } from "~/lib/i18n/zodMessage";
import { logger } from "~/lib/log";
import { zdtToISO } from "~/lib/time";
// Import unified schemas and mappers
import {
	CreateInvoiceInputSchema,
	type Invoice,
	UpdateDraftInput,
	VoiceApprovalSchema,
	VoiceLineItemSchema,
} from "~/schema/invoice";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { writeAudit } from "~/server/db/invoice-audit";
import {
	addLineToJsonbLines,
	canEditInvoice,
	mapDbInvoiceDraftToDto,
	mapUpdateInvoiceDtoToDb,
	parseVoicePriceInput,
} from "~/server/mappers/invoiceMapper";
import {
	computeTotalsCents,
	toDBInvoice,
	toDBLines,
} from "~/server/mappers/invoiceMapperUnified";
import type { Database, Json, Tables } from "~/types/supabase";

/**
 * Helper function to check if customer has address and email when needed
 */
async function validateCustomerRequirements(
	db: SupabaseClient<Database>,
	customerId: string,
	orgId: string,
	options: { requireAddress?: boolean; requireEmail?: boolean } = {},
): Promise<void> {
	const { data: customer } = await db
		.from("customers")
		.select("address, postal_code, email")
		.eq("id", customerId)
		.eq("org_id", orgId)
		.maybeSingle();

	if (customer === null) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Customer not found",
		});
	}

	// Check address requirement
	if (options.requireAddress) {
		const hasLegacy = (customer.address ?? "").trim().length > 0;
		const hasPostal = (customer.postal_code ?? "").trim().length > 0;
		const hasAddress = [hasLegacy, hasPostal].some(Boolean);

		if (!hasAddress) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				cause: new ZodError([
					{
						code: "custom",
						path: ["address"],
						message: zMsg(E.addressRequired),
					},
				]),
			});
		}
	}

	// Check email requirement
	if (options.requireEmail) {
		if (
			(customer.email ?? "").trim().length === 0 ||
			!customer.email?.includes("@")
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				cause: new ZodError([
					{
						code: "custom",
						path: ["email"],
						message: zMsg(E.emailInvalid),
					},
				]),
			});
		}
	}
}

export const invoicesRouter = createTRPCRouter({
	/**
	 * Create new invoice using unified normalized architecture
	 * Writes to invoices + invoice_lines tables (cents-only money)
	 */
	createUnified: protectedProcedure
		.input(CreateInvoiceInputSchema)
		.mutation(async ({ ctx, input }) => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Explicit non-empty check to satisfy strict-boolean-expressions
			if (orgId.trim().length === 0) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required (empty org id)",
				});
			}

			const invoiceId = crypto.randomUUID();

			// Always compute totals from lines for consistency
			const { subtotalExVatCents, vatTotalCents, totalIncVatCents } =
				computeTotalsCents(input.lines);

			// Insert invoice
			const invoiceData = toDBInvoice(
				{
					...input,
					subtotalCents: subtotalExVatCents,
					vatAmountCents: vatTotalCents,
					totalCents: totalIncVatCents,
				},
				orgId,
				input.customerId,
			);

			const { data: createdInvoice, error: invoiceError } = await db
				.from("invoices")
				.insert(invoiceData)
				.select("id")
				.single();

			// Explicit null checks satisfy strict-boolean-expressions and avoid || coalescing heuristics
			const hasInvoiceError = invoiceError !== null;
			const missingInvoice = createdInvoice === null;
			if (hasInvoiceError || missingInvoice) {
				logger.error("Failed to insert invoice", {
					error: invoiceError,
					orgId,
				});
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create invoice",
					cause: invoiceError,
				});
			}

			// Insert lines using the actual created invoice ID
			if (input.lines.length > 0) {
				const linesData = toDBLines(createdInvoice.id, orgId, input.lines);
				const { error: linesError } = await db
					.from("invoice_lines")
					.insert(linesData);

				if (linesError) {
					logger.error("Failed to insert invoice lines", {
						error: linesError,
						orgId,
					});
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create invoice lines",
						cause: linesError,
					});
				}
			}

			// If issuing now, allocate number
			if (input.issueNow) {
				const year = new globalThis.Date().getFullYear();
				// Call our unified numbering function
				const { data: numberResult, error: numberError } = await db.rpc(
					"get_next_invoice_number",
					{ p_org_id: orgId, p_year: year },
				);

				if (numberError) {
					logger.error("Failed to get invoice number", {
						error: numberError,
						orgId,
					});
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to allocate invoice number",
						cause: numberError,
					});
				}

				const number = numberResult;
				const { error: updateError } = await db
					.from("invoices")
					.update({
						year,
						number_int: number,
						status: "sent",
					})
					.eq("id", invoiceId);

				if (updateError) {
					logger.error("Failed to update invoice with number", {
						error: updateError,
						orgId,
					});
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to finalize invoice",
						cause: updateError,
					});
				}
			}

			logger.info("Created unified invoice", {
				invoiceId,
				orgId,
				status: input.issueNow ? "sent" : "draft",
			});

			return { id: createdInvoice.id };
		}),

	/**
	 * Get invoice draft by ID with all related data
	 */
	getDraft: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }): Promise<Invoice> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Get invoice draft with related data
			const { data: draft, error: draftError } = await db
				.from("invoice_drafts")
				.select(`
					*,
					customers (*),
					jobs (*)
				`)
				.eq("id", input.id)
				.eq("org_id", orgId)
				.single();

			if (draftError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice draft not found",
					cause: draftError,
				});
			}

			return mapDbInvoiceDraftToDto(draft, draft.customers, draft.jobs);
		}),

	/**
	 * List all invoice drafts for organization
	 */
	listDrafts: protectedProcedure
		.input(
			z
				.object({
					customerId: z.uuid().optional(),
					limit: z.number().min(1).max(100).default(20),
					offset: z.number().min(0).default(0),
				})
				.optional(),
		)
		.query(async ({ ctx, input = {} }): Promise<Invoice[]> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { customerId, limit, offset } = input;

			let query = db
				.from("invoices")
				.select(`
					*,
					customers (*),
					jobs (*)
				`)
				.eq("org_id", orgId)
				.eq("status", "draft")
				.order("updated_at", { ascending: false })
				.range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

			// Apply filters
			if (customerId) {
				query = query.eq("customer_id", customerId);
			}

			const { data: invoices, error } = await query;

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch draft invoices",
					cause: error,
				});
			}

			// Temporary: return empty array to test if query works
			if (!invoices || invoices.length === 0) {
				return [];
			}

			// TODO: Need to create a mapper for unified invoices table
			// For now, return empty to avoid mapping errors
			return [];
		}),

	/**
	 * Create invoice draft from completed job
	 */
	createFromJob: protectedProcedure
		.input(z.object({ jobId: z.uuid() }))
		.mutation(async ({ ctx, input }): Promise<{ id: string }> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			logger.warn("invoice.createFromJob looking for job", {
				jobId: input.jobId,
				orgId,
				hasDb: Boolean(db),
			});

			// Get job data with customer information (employees not needed for invoice creation)
			const { data: job, error: jobError } = await db
				.from("jobs")
				.select(`
					*,
					customers (*)
				`)
				.eq("id", input.jobId)
				.eq("org_id", orgId)
				.single();

			logger.warn("invoice.createFromJob job query result", {
				job: job ? { id: job.id, title: job.title, org_id: job.org_id } : null,
				error: jobError,
				errorCode: jobError?.code,
				errorMessage: jobError?.message,
			});

			if (jobError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found",
					cause: jobError,
				});
			}

			// Verify job is completed (use DB status format)
			if (job.status !== "completed") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Can only create invoices from completed jobs",
				});
			}

			// Customer validation happens during address requirement check

			// Address gating: require address for invoice creation
			await validateCustomerRequirements(db, job.customer_id, orgId, {
				requireAddress: true,
			});

			// Get default payment terms from org settings
			const { data: orgSettings } = await db
				.from("org_settings")
				.select("default_payment_terms")
				.eq("org_id", orgId)
				.single();

			const defaultPaymentTerms =
				orgSettings?.default_payment_terms ?? "30_days";

			// Create default invoice items based on job
			const items: Array<{
				id: string;
				description: string;
				qty: number;
				unit: string;
				unitPriceCents: number;
				vatRate: 0 | 9 | 21;
				kind: "labor" | "material" | "other";
			}> = [
				{
					id: crypto.randomUUID(),
					description: job.title,
					qty: 1,
					unit: "stuks",
					unitPriceCents: 7500, // Default rate in cents (€75.00)
					vatRate: 21,
					kind: "labor",
				},
			];

			// If job has description, add them as an additional service item
			if (job.description && job.description.trim().length > 0) {
				items.push({
					id: crypto.randomUUID(),
					description: `Additional work: ${job.description}`,
					qty: 1,
					unit: "stuks",
					unitPriceCents: 5000, // Default additional work rate in cents (€50.00)
					vatRate: 21,
					kind: "other",
				});
			}

			// Server-side totals computation
			const { subtotalExVatCents, vatTotalCents, totalIncVatCents } =
				computeTotalsCents(items);

			// Create invoice draft
			const invoice = {
				id: crypto.randomUUID(),
				org_id: orgId,
				customer_id: job.customer_id,
				job_id: job.id,
				number: null, // Will be assigned when sent
				issued_at: null,
				due_at: null,
				status: "draft" as const,
				payment_terms: defaultPaymentTerms as Invoice["paymentTerms"],
				notes: job.description
					? `Created from job: ${job.title}\n\n${job.description}`
					: `Created from job: ${job.title}`,
				is_confirmed: false,
				voice_confirmed_at: null,
				subtotal_ex_vat: subtotalExVatCents / 100,
				vat_total: vatTotalCents / 100,
				total_inc_vat: totalIncVatCents / 100,
				lines: items.map((item) => {
					const unitPriceEuros = item.unitPriceCents / 100;
					// (unused variables removed)

					// Use DTO format expected by validation function
					return {
						id: item.id,
						description: item.description,
						qty: item.qty,
						unitPriceExVat: unitPriceEuros, // Frontend field name expected by validation
						vatRate: item.vatRate, // Expected by validation function
						lineType: item.kind === "labor" ? "labor" : "material", // Map kind to valid lineType values (other→material)
					};
				}),
				created_at: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
				updated_at: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
			};

			logger.warn("invoice.createFromJob about to insert draft", {
				itemsCount: items.length,
			});

			const { data: createdDraft, error: draftError } = await db
				.from("invoice_drafts")
				.insert(invoice)
				.select("id")
				.single();

			logger.warn("invoice.createFromJob insert result", { ok: !draftError });

			if (draftError !== null) {
				logger.error("invoice.createFromJob insert error", {
					error: draftError,
				});
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create invoice draft from job",
					cause: draftError,
				});
			}

			// Audit log the creation
			await writeAudit({
				entity: "invoice",
				entityId: createdDraft.id,
				action: "created",
				actorId: ctx.auth.userId,
				meta: {
					customerId: job.customer_id,
					jobId: input.jobId,
					source: "job",
					itemCount: items.length,
				},
				db,
				orgId,
			});

			return { id: createdDraft.id };
		}),

	// REMOVED: Legacy createDraft endpoint - replaced by createUnified
	// This endpoint used deprecated invoice_drafts table and problematic mappers

	/**
	 * Update existing invoice draft
	 */
	updateDraft: protectedProcedure
		.input(UpdateDraftInput)
		.mutation(async ({ ctx, input }): Promise<Invoice> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { id, ...updateData } = input;

			// Verify invoice exists and belongs to org
			const { data: existingDraft, error: fetchError } = await db
				.from("invoice_drafts")
				.select("*")
				.eq("id", id)
				.eq("org_id", orgId)
				.single();

			if (fetchError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice draft not found",
					cause: fetchError,
				});
			}

			// Check if invoice can be edited
			if (!canEditInvoice(existingDraft.is_confirmed ? "approved" : "draft")) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invoice cannot be edited in current status",
				});
			}

			// Transform update to database format
			const dbUpdate = mapUpdateInvoiceDtoToDb(updateData);

			// Server-side totals recomputation if items are updated
			if (updateData.items) {
				const { subtotalExVatCents, vatTotalCents, totalIncVatCents } =
					computeTotalsCents(updateData.items);
				// Override totals with server-computed values (convert cents to euros for DB)
				dbUpdate.subtotal_ex_vat = subtotalExVatCents / 100;
				dbUpdate.vat_total = vatTotalCents / 100;
				dbUpdate.total_inc_vat = totalIncVatCents / 100;
			}

			// Update invoice draft
			const { data: updatedDraft, error: updateError } = await db
				.from("invoice_drafts")
				.update(dbUpdate)
				.eq("id", id)
				.select(`
					*,
					customers (*),
					jobs (*)
				`)
				.single();

			if (updateError !== null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update invoice draft",
					cause: updateError,
				});
			}

			// Audit log the update
			await writeAudit({
				entity: "invoice",
				entityId: id,
				action: "updated",
				actorId: ctx.auth.userId,
				meta: { fieldsUpdated: Object.keys(updateData) },
				db,
				orgId,
			});

			return mapDbInvoiceDraftToDto(
				updatedDraft,
				updatedDraft.customers,
				updatedDraft.jobs,
			);
		}),

	/**
	 * Confirm/approve invoice draft
	 */
	confirmDraft: protectedProcedure
		.input(z.object({ id: z.uuid(), confirmed: z.boolean() }))
		.mutation(async ({ ctx, input }): Promise<Invoice> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Update confirmation status
			const { data: updatedDraft, error: updateError } = await db
				.from("invoice_drafts")
				.update({
					is_confirmed: input.confirmed,
					voice_confirmed_at: input.confirmed
						? zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"))
						: null,
				})
				.eq("id", input.id)
				.eq("org_id", orgId)
				.select(`
					*,
					customers (*),
					jobs (*)
				`)
				.single();

			if (updateError !== null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to confirm invoice draft",
					cause: updateError,
				});
			}

			return mapDbInvoiceDraftToDto(
				updatedDraft,
				updatedDraft.customers,
				updatedDraft.jobs,
			);
		}),

	/**
	 * Delete invoice draft (only if not confirmed)
	 */
	deleteDraft: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Check if invoice can be deleted
			const { data: draft, error: fetchError } = await db
				.from("invoice_drafts")
				.select("is_confirmed")
				.eq("id", input.id)
				.eq("org_id", orgId)
				.single();

			if (fetchError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice draft not found",
				});
			}

			if (draft.is_confirmed) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot delete confirmed invoice draft",
				});
			}

			// Delete invoice draft
			const { error: deleteError } = await db
				.from("invoice_drafts")
				.delete()
				.eq("id", input.id);

			if (deleteError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete invoice draft",
					cause: deleteError,
				});
			}

			return { success: true };
		}),

	/**
	 * Voice Mode: Add line item from voice input
	 */
	addVoiceLineItem: protectedProcedure
		.input(
			z.object({
				invoiceId: z.uuid(),
				voiceInput: VoiceLineItemSchema,
			}),
		)
		.mutation(
			async ({
				ctx,
				input,
			}): Promise<{ success: boolean; message: string }> => {
				const { db } = ctx;
				const { orgId } = ctx.auth;

				// Get existing draft
				const { data: draft, error: draftError } = await db
					.from("invoice_drafts")
					.select("*")
					.eq("id", input.invoiceId)
					.eq("org_id", orgId)
					.single();

				if (draftError !== null) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Invoice draft not found",
					});
				}

				if (draft.is_confirmed) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot edit confirmed invoice",
					});
				}

				// Convert voice input to invoice item
				const voiceItem = input.voiceInput;
				const unitPriceExVat = parseVoicePriceInput(voiceItem.price.toString());

				// Calculate totals
				const lineTotalExVat = Math.round(voiceItem.quantity * unitPriceExVat);
				const vatAmount = Math.round(lineTotalExVat * 0.21); // Dutch VAT
				const lineTotalIncVat = lineTotalExVat + vatAmount;

				const newItem = {
					id: crypto.randomUUID(),
					description: voiceItem.description,
					qty: voiceItem.quantity,
					unit: "stuks", // Default unit
					unitPriceCents: unitPriceExVat,
					vatRate: 21 as const, // Integer percentage for unified schema (also supports decimal via union)
					kind:
						voiceItem.type === "materials"
							? ("material" as const)
							: voiceItem.type === "labor"
								? ("labor" as const)
								: ("other" as const),
					// Calculated fields
					lineTotalExVatCents: lineTotalExVat,
					vatAmountCents: vatAmount,
					lineTotalIncVatCents: lineTotalIncVat,
					// Legacy fields for backward compatibility
					lineType: voiceItem.type,
					unitPriceExVat,
					lineTotalExVat,
					vatAmount,
					lineTotalIncVat,
				};

				// Add to existing lines
				const updatedLines = addLineToJsonbLines(draft.lines, newItem);

				// Recalculate totals
				const subtotalExVat = updatedLines.reduce(
					(sum, line) => sum + line.line_total_ex_vat,
					0,
				);
				const vatTotal = updatedLines.reduce(
					(sum, line) => sum + line.vat_amount,
					0,
				);
				const totalIncVat = subtotalExVat + vatTotal;

				// Update draft with new line and totals
				const { error: updateError } = await db
					.from("invoice_drafts")
					.update({
						lines: updatedLines as unknown as Json,
						subtotal_ex_vat: subtotalExVat / 100, // Convert to euros
						vat_total: vatTotal / 100, // Convert to euros
						total_inc_vat: totalIncVat / 100, // Convert to euros
					})
					.eq("id", input.invoiceId);

				if (updateError) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to add voice line item",
						cause: updateError,
					});
				}

				return {
					success: true,
					message: `Toegevoegd: ${voiceItem.description}`,
				};
			},
		),

	/**
	 * Wrapper for updateDraft for frontend compatibility
	 */
	saveDraft: protectedProcedure
		.input(UpdateDraftInput)
		.mutation(async ({ ctx, input }): Promise<Invoice> => {
			// Duplicate logic from updateDraft
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { id, ...updateData } = input;

			// Verify invoice exists and belongs to org
			const { data: existingDraft, error: fetchError } = await db
				.from("invoice_drafts")
				.select("*")
				.eq("id", id)
				.eq("org_id", orgId)
				.single();

			if (fetchError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice draft not found",
					cause: fetchError,
				});
			}

			// Check if invoice can be edited
			if (!canEditInvoice(existingDraft.is_confirmed ? "approved" : "draft")) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invoice cannot be edited in current status",
				});
			}

			// Transform update to database format
			const dbUpdate = mapUpdateInvoiceDtoToDb(updateData);

			// Server-side totals recomputation if items are updated
			if (updateData.items) {
				const { subtotalExVatCents, vatTotalCents, totalIncVatCents } =
					computeTotalsCents(updateData.items);
				// Override totals with server-computed values (convert cents to euros for DB)
				dbUpdate.subtotal_ex_vat = subtotalExVatCents / 100;
				dbUpdate.vat_total = vatTotalCents / 100;
				dbUpdate.total_inc_vat = totalIncVatCents / 100;
			}

			// Update invoice draft
			const { data: updatedDraft, error: updateError } = await db
				.from("invoice_drafts")
				.update(dbUpdate)
				.eq("id", id)
				.select(`
					*,
					customers (*),
					jobs (*)
				`)
				.single();

			if (updateError !== null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update invoice draft",
					cause: updateError,
				});
			}

			// Audit log the update
			await writeAudit({
				entity: "invoice",
				entityId: id,
				action: "updated",
				actorId: ctx.auth.userId,
				meta: { fieldsUpdated: Object.keys(updateData) },
				db,
				orgId,
			});

			return mapDbInvoiceDraftToDto(
				updatedDraft,
				updatedDraft.customers,
				updatedDraft.jobs,
			);
		}),

	/**
	 * Wrapper for addVoiceLineItem for frontend compatibility
	 */
	voiceConfirmLine: protectedProcedure
		.input(
			z.object({
				invoiceId: z.uuid(),
				voiceInput: VoiceLineItemSchema,
			}),
		)
		.mutation(
			async ({
				ctx,
				input,
			}): Promise<{ success: boolean; message: string }> => {
				// Delegate by calling same logic as addVoiceLineItem
				const { db } = ctx;
				const { orgId } = ctx.auth;

				// Get existing draft
				const { data: draft, error: draftError } = await db
					.from("invoice_drafts")
					.select("*")
					.eq("id", input.invoiceId)
					.eq("org_id", orgId)
					.single();

				if (draftError !== null) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Invoice draft not found",
					});
				}

				if (draft.is_confirmed) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot edit confirmed invoice",
					});
				}

				// Convert voice input to invoice item
				const voiceItem = input.voiceInput;
				const unitPriceExVat = parseVoicePriceInput(voiceItem.price.toString());

				// Calculate totals
				const lineTotalExVat = Math.round(voiceItem.quantity * unitPriceExVat);
				const vatAmount = Math.round(lineTotalExVat * 0.21); // Dutch VAT
				const lineTotalIncVat = lineTotalExVat + vatAmount;

				const newItem = {
					id: crypto.randomUUID(),
					description: voiceItem.description,
					qty: voiceItem.quantity,
					unit: "stuks", // Default unit
					unitPriceCents: unitPriceExVat,
					vatRate: 21 as const, // Integer percentage for unified schema (also supports decimal via union)
					kind:
						voiceItem.type === "materials"
							? ("material" as const)
							: voiceItem.type === "labor"
								? ("labor" as const)
								: ("other" as const),
					// Calculated fields
					lineTotalExVatCents: lineTotalExVat,
					vatAmountCents: vatAmount,
					lineTotalIncVatCents: lineTotalIncVat,
					// Legacy fields for backward compatibility
					lineType: voiceItem.type,
					unitPriceExVat,
					lineTotalExVat,
					vatAmount,
					lineTotalIncVat,
				};

				// Add to existing lines
				const updatedLines = addLineToJsonbLines(draft.lines, newItem);

				// Recalculate totals
				const subtotalExVat = updatedLines.reduce(
					(sum, line) => sum + line.line_total_ex_vat,
					0,
				);
				const vatTotal = updatedLines.reduce(
					(sum, line) => sum + line.vat_amount,
					0,
				);
				const totalIncVat = subtotalExVat + vatTotal;

				// Update draft with new line and totals
				const { error: updateError } = await db
					.from("invoice_drafts")
					.update({
						lines: updatedLines as unknown as Json,
						subtotal_ex_vat: subtotalExVat / 100, // Convert to euros
						vat_total: vatTotal / 100, // Convert to euros
						total_inc_vat: totalIncVat / 100, // Convert to euros
					})
					.eq("id", input.invoiceId);

				if (updateError) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to add voice line item",
						cause: updateError,
					});
				}

				return {
					success: true,
					message: `Toegevoegd: ${voiceItem.description}`,
				};
			},
		),

	/**
	 * Wrapper for voiceApproval for frontend compatibility
	 */
	voiceSummaryConfirm: protectedProcedure
		.input(VoiceApprovalSchema)
		.mutation(
			async ({
				ctx,
				input,
			}): Promise<{ success: boolean; message: string }> => {
				// Same logic as voiceApproval
				const { db } = ctx;
				const { orgId } = ctx.auth;

				// Get invoice details
				const { data: draft } = await db
					.from("invoice_drafts")
					.select("*")
					.eq("id", input.invoiceId)
					.eq("org_id", orgId)
					.single();

				if (draft === null) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Invoice not found",
					});
				}

				if (input.approved) {
					// Voice approval
					await db
						.from("invoice_drafts")
						.update({
							is_confirmed: true,
							voice_confirmed_at: zdtToISO(
								Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"),
							),
						})
						.eq("id", input.invoiceId);

					return {
						success: true,
						message: "Factuur goedgekeurd via spraakcommando",
					};
				} else {
					// Voice rejection - add feedback and keep unconfirmed
					const updateData: Record<string, unknown> = { is_confirmed: false };
					if (input.feedback) {
						updateData.notes = `${draft.notes ?? ""}

Spraakopmerkingen: ${input.feedback}`.trim();
					}

					await db
						.from("invoice_drafts")
						.update(updateData)
						.eq("id", input.invoiceId);

					return {
						success: true,
						message: "Factuur teruggestuurd voor aanpassingen",
					};
				}
			},
		),

	/**
	 * Voice Mode: Approve/reject invoice with voice command
	 */
	voiceApproval: protectedProcedure
		.input(VoiceApprovalSchema)
		.mutation(
			async ({
				ctx,
				input,
			}): Promise<{ success: boolean; message: string }> => {
				const { db } = ctx;
				const { orgId } = ctx.auth;

				// Get invoice details
				const { data: draft } = await db
					.from("invoice_drafts")
					.select("*")
					.eq("id", input.invoiceId)
					.eq("org_id", orgId)
					.single();

				if (draft === null) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Invoice not found",
					});
				}

				if (input.approved) {
					// Voice approval
					await db
						.from("invoice_drafts")
						.update({
							is_confirmed: true,
							voice_confirmed_at: zdtToISO(
								Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"),
							),
						})
						.eq("id", input.invoiceId);

					return {
						success: true,
						message: "Factuur goedgekeurd via spraakcommando",
					};
				} else {
					// Voice rejection - add feedback and keep unconfirmed
					const updateData: Record<string, unknown> = { is_confirmed: false };
					if (input.feedback) {
						updateData.notes =
							`${draft.notes ?? ""}\n\nSpraakopmerkingen: ${input.feedback}`.trim();
					}

					await db
						.from("invoice_drafts")
						.update(updateData)
						.eq("id", input.invoiceId);

					return {
						success: true,
						message: "Factuur teruggestuurd voor aanpassingen",
					};
				}
			},
		),

	/**
	 * Send invoice (transform draft to issued invoice) - Atomic implementation
	 * TODO: Switch to RPC after migration 004_issue_invoice_rpc.sql is applied
	 */
	send: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(
		async ({
			ctx,
			input,
		}): Promise<{
			id: string;
			number: string;
			issued_at: string;
			due_at: string | null;
		}> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Use atomic RPC for race-condition-free invoice creation
			const { data: invoice, error: rpcError } = await db.rpc("issue_invoice", {
				p_invoice_id: input.id,
			});

			if (rpcError !== null) {
				logger.error("Failed to issue invoice via RPC", {
					draftId: input.id,
					orgId,
					error: rpcError,
				});

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to issue invoice",
					cause: rpcError,
				});
			}

			assertNonNullish(invoice, "Invoice missing after successful RPC call");

			logger.info("Invoice issued successfully", {
				invoiceId: invoice.id,
				invoiceNumber: invoice.number,
				draftId: input.id,
			});

			return {
				id: invoice.id,
				number: invoice.number,
				issued_at: invoice.issued_at,
				due_at: invoice.due_at,
			};
		},
	),

	/**
	 * Get invoice statistics for the organization
	 */
	getStats: protectedProcedure.query(
		async ({
			ctx,
		}): Promise<{
			totalOutstanding: number;
			thisMonth: number;
			overdue: number;
			averagePerInvoice: number;
			draftCount: number;
			issuedCount: number;
		}> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
			const startOfMonth = now.with({ day: 1, hour: 0, minute: 0, second: 0 });
			const startOfMonthISO = zdtToISO(startOfMonth);

			// Get draft invoices stats
			const { data: drafts, error: draftsError } = await db
				.from("invoice_drafts")
				.select("total_inc_vat, is_confirmed")
				.eq("org_id", orgId);

			if (draftsError) {
				logger.error("Failed to get invoice drafts stats", {
					error: draftsError.message,
				});
			}

			// Get issued invoices stats (when they exist)
			const { data: issued, error: issuedError } = await db
				.from("invoices")
				.select("total_inc_vat, paid_at, due_at, issued_at")
				.eq("org_id", orgId);

			if (issuedError) {
				logger.error("Failed to get issued invoices stats", {
					error: issuedError.message,
				});
			}

			// Calculate statistics - handle potential undefined fields safely
			const draftCount = drafts?.length ?? 0;
			const issuedCount = issued?.length ?? 0;

			// Type the query results properly
			const draftRows = (drafts ?? []) as Array<
				Pick<Tables<"invoice_drafts">, "total_inc_vat" | "is_confirmed">
			>;
			const issuedRows = (issued ?? []) as Array<
				Pick<
					Tables<"invoices">,
					"total_inc_vat" | "paid_at" | "due_at" | "issued_at"
				>
			>;

			// Helper function to safely get numeric value
			const safeAmount = (value: unknown): number => {
				if (value === null || value === undefined) return 0;
				const num = Number(value);
				if (Number.isNaN(num) || !Number.isFinite(num)) {
					console.warn("DEBUG getStats: Invalid amount detected:", value);
					return 0;
				}
				return num;
			};

			// Total outstanding (unpaid issued invoices + draft invoices)
			const totalOutstanding =
				draftRows.reduce((sum, d) => sum + safeAmount(d.total_inc_vat), 0) +
				issuedRows
					.filter((i) => i.paid_at === null)
					.reduce((sum, i) => sum + safeAmount(i.total_inc_vat), 0);

			// This month's invoices (confirmed drafts + issued invoices this month)
			const thisMonth =
				draftRows
					.filter((d) => d.is_confirmed)
					.reduce((sum, d) => sum + safeAmount(d.total_inc_vat), 0) +
				issuedRows
					.filter((i) => i.issued_at >= startOfMonthISO)
					.reduce((sum, i) => sum + safeAmount(i.total_inc_vat), 0);

			// Overdue invoices (issued invoices past due date)
			const overdue = issuedRows
				.filter(
					(i) =>
						i.paid_at === null &&
						i.due_at !== null &&
						i.due_at < now.toInstant().toString(),
				)
				.reduce((sum, i) => sum + safeAmount(i.total_inc_vat), 0);

			// Average per invoice this year
			const totalInvoices = draftCount + issuedCount;
			const totalAmount = totalOutstanding;
			const averagePerInvoice =
				totalInvoices > 0 ? Math.round(totalAmount / totalInvoices) : 0;

			return {
				totalOutstanding,
				thisMonth,
				overdue,
				averagePerInvoice,
				draftCount,
				issuedCount,
			};
		},
	),
});

export type InvoicesRouter = typeof invoicesRouter;
