// V2 Invoice Router (S1) - Minimal implementation for provider-based invoicing
// This router replaces the legacy invoice system with a clean provider-focused approach

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { parseZdt } from "~/lib/time";
import type { Invoice } from "~/schema/invoice";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mustSingle } from "~/server/db/unwrap";
import { getProvider } from "~/server/providers/registry";
import type {
	InvoiceProviderId,
	ProviderDraftInput,
} from "~/server/providers/types";
import type { Tables } from "~/types/supabase";

// S1 Guard: Never assign internal numbers on send - provider owns post-send
// S4: Post-send lock enforced - no edits after invoice is sent/issued

// NOTE: Provider capability hints will be wired in S3+. Keeping router lean for S1/S2.

/**
 * Check if invoice is locked (post-send state)
 * Invoices are locked when issued_at is set OR provider_status indicates sent/paid states
 */
function isInvoiceLocked(invoice: {
	issued_at?: string | null;
	provider_status?: string | null;
}): boolean {
	if (invoice.issued_at != null) {
		return true;
	}

	const lockedStatuses = ["sent", "viewed", "paid", "overdue", "cancelled"];
	return (
		invoice.provider_status != null &&
		lockedStatuses.includes(invoice.provider_status)
	);
}

/**
 * V2 Invoice Router - Provider-based architecture
 *
 * Key principles:
 * - Providers (Moneybird, WeFact, e-Boekhouden, Peppol) own numbering and PDFs
 * - We store provider fields: external_id, status, payment_url, pdf_url, ubl_url
 * - Legacy invoices (is_legacy=true) are read-only
 * - New invoices never get internal numbers - only provider-assigned numbers
 */
export const invoicesRouter = createTRPCRouter({
	/**
	 * List all invoices (both legacy and provider-based)
	 * Returns provider fields for UI badge display
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const { data: invoices, error } = await ctx.db
			.from("invoices")
			.select(`
				id,
				org_id,
				customer_id,
				job_id,
				number,
				status,
				provider,
				external_id,
				provider_status,
				payment_url,
				pdf_url,
				ubl_url,
				is_legacy,
				issued_at,
				payment_terms,
				notes,
				message_ids,
				total_inc_vat,
				total_cents,
				subtotal_ex_vat,
				subtotal_cents,
				vat_total,
				vat_amount_cents,
				created_at,
				updated_at,
				customers!inner (
					id,
					name,
					email
				),
				jobs!inner (
					id,
					title
				)
			`)
			.order("created_at", { ascending: false });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch invoices",
				cause: error,
			});
		}

		// Map database results to DTO format (simplified for list view)
		return invoices.map((invoice) => ({
			id: invoice.id,
			orgId: invoice.org_id,
			customerId: invoice.customer_id,
			jobId: invoice.job_id,

			// Legacy vs provider numbering
			invoiceNumber: invoice.number,
			isLegacy: invoice.is_legacy ?? false,

			// Provider fields (S1)
			provider: invoice.provider as Invoice["provider"],
			externalId: invoice.external_id ?? undefined,
			providerStatus: invoice.provider_status ?? undefined,
			paymentUrl: invoice.payment_url ?? undefined,
			pdfUrl: invoice.pdf_url ?? undefined,
			ublUrl: invoice.ubl_url ?? undefined,
			messageIds: Array.isArray(invoice.message_ids)
				? (invoice.message_ids as string[])
				: [],
			issuedAt: invoice.issued_at,

			// Status and metadata
			status: invoice.status,
			paymentTerms: invoice.payment_terms,
			notes: invoice.notes ?? undefined,

			// Totals (prefer integer cents)
			subtotalExVat:
				invoice.subtotal_cents ?? Math.round(invoice.subtotal_ex_vat * 100),
			totalVatAmount:
				invoice.vat_amount_cents ?? Math.round(invoice.vat_total * 100),
			totalIncVat:
				invoice.total_cents ?? Math.round(invoice.total_inc_vat * 100),

			// Related entities
			customer: {
				id: invoice.customers.id,
				name: invoice.customers.name,
				email: invoice.customers.email ?? undefined,
			},
			job: {
				id: invoice.jobs.id,
				title: invoice.jobs.title,
			},

			// Audit fields
			createdAt: invoice.created_at!,
			updatedAt: invoice.updated_at!,
		}));
	}),

	/**
	 * Get a single invoice by ID
	 * Includes provider fields for status display
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const { data: invoice, error } = await ctx.db
				.from("invoices")
				.select(`
					*,
					customers (
						id,
						name,
						email,
						phone,
						address,
						postal_code
					),
					jobs (
						id,
						title,
						description
					)
				`)
				.eq("id", input.id)
				.single();

			if (error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
					cause: error,
				});
			}

			return mapDbInvoiceToDto(invoice);
		}),

	/**
	 * Get invoice statistics for dashboard
	 */
	getStats: protectedProcedure.query(async ({ ctx }) => {
		// Simple stats query - can be enhanced in later slices
		const { data: invoices, error } = await ctx.db
			.from("invoices")
			.select("total_cents, status, is_legacy, created_at");

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch invoice stats",
				cause: error,
			});
		}

		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const thisMonth = now.with({
			day: 1,
			hour: 0,
			minute: 0,
			second: 0,
			millisecond: 0,
			microsecond: 0,
			nanosecond: 0,
		});

		let totalOutstanding = 0;
		let thisMonthTotal = 0;
		let draftCount = 0;
		let issuedCount = 0;
		let overdue = 0;

		for (const invoice of invoices) {
			const total = invoice.total_cents ?? 0;
			const createdAt = parseZdt(invoice.created_at!);

			if (invoice.status === "draft") {
				draftCount++;
			} else {
				issuedCount++;
				totalOutstanding += total;
			}

			if (Temporal.ZonedDateTime.compare(createdAt, thisMonth) >= 0) {
				thisMonthTotal += total;
			}

			// Simple overdue logic - can be enhanced
			if (invoice.status === "sent" || invoice.status === "overdue") {
				overdue += total;
			}
		}

		return {
			totalOutstanding,
			thisMonth: thisMonthTotal,
			draftCount,
			issuedCount,
			overdue,
			averagePerInvoice:
				issuedCount > 0 ? Math.round(totalOutstanding / issuedCount) : 0,
		};
	}),

	/**
	 * List invoice drafts (legacy compatibility)
	 * For S1, this returns regular invoices with status=draft
	 */
	listDrafts: protectedProcedure.query(async ({ ctx }) => {
		const { data: invoices, error } = await ctx.db
			.from("invoices")
			.select(`
				id,
				org_id,
				customer_id,
				job_id,
				status,
				provider,
				provider_status,
				payment_url,
				pdf_url,
				is_legacy,
				message_ids,
				total_inc_vat,
				total_cents,
				subtotal_ex_vat,
				subtotal_cents,
				vat_total,
				vat_amount_cents,
				created_at,
				updated_at,
				customers (
					id,
					name
				),
				jobs (
					id,
					title
				)
			`)
			.eq("status", "draft")
			.order("created_at", { ascending: false });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch drafts",
				cause: error,
			});
		}

		return invoices.map((invoice) => ({
			id: invoice.id,
			orgId: invoice.org_id,
			customerId: invoice.customer_id,
			jobId: invoice.job_id,
			status: invoice.status as "draft",
			provider: invoice.provider as Invoice["provider"],
			providerStatus: invoice.provider_status ?? undefined,
			paymentUrl: invoice.payment_url ?? undefined,
			pdfUrl: invoice.pdf_url ?? undefined,
			isLegacy: invoice.is_legacy ?? false,
			messageIds: Array.isArray(invoice.message_ids)
				? (invoice.message_ids as string[])
				: [],
			paymentTerms: "30_days" as const, // Default for compatibility
			totalIncVat: invoice.total_cents ?? invoice.total_inc_vat * 100, // Prefer cents
			subtotalExVat:
				invoice.subtotal_cents ?? Math.round(invoice.subtotal_ex_vat * 100),
			totalVatAmount:
				invoice.vat_amount_cents ?? Math.round(invoice.vat_total * 100),
			items: [], // Empty for drafts compatibility
			customer: {
				id: invoice.customers.id,
				name: invoice.customers.name,
			},
			job: {
				id: invoice.jobs.id,
				title: invoice.jobs.title,
			},
			createdAt: invoice.created_at!,
			updatedAt: invoice.updated_at!,
		}));
	}),

	/**
	 * Create a draft invoice with a provider (S3 - Connector integration)
	 * Stores external_id from provider for later finalization
	 */
	createDraft: protectedProcedure
		.input(
			z.object({
				providerId: z.enum(["moneybird", "wefact", "eboekhouden", "peppol"]),
				invoiceId: z.uuid(),
				customerData: z.object({
					name: z.string().min(1),
					email: z.email().optional(),
					vatId: z.string().optional(),
					kvk: z.string().optional(),
					addressLine1: z.string().optional(),
					addressLine2: z.string().optional(),
					postalCode: z.string().optional(),
					city: z.string().optional(),
					country: z.string().optional(),
				}),
				lines: z.array(
					z.object({
						description: z.string().min(1),
						quantity: z.number().positive(),
						unitPriceCents: z.number().int().nonnegative(),
						vatRate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
					}),
				),
				currency: z.string().default("EUR"),
				totalExclCents: z.number().int().nonnegative(),
				totalVatCents: z.number().int().nonnegative(),
				totalInclCents: z.number().int().nonnegative(),
				issueDateISO: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const provider = await getProvider(
				input.providerId,
				ctx.db,
				ctx.auth.orgId,
				ctx.auth.userId,
			);

			const draftInput: ProviderDraftInput = {
				customer: input.customerData,
				lines: input.lines as Array<{
					description: string;
					quantity: number;
					unitPriceCents: number;
					vatRate: 0 | 9 | 21;
				}>,
				currency: input.currency,
				totalExclCents: input.totalExclCents,
				totalVatCents: input.totalVatCents,
				totalInclCents: input.totalInclCents,
				issueDateISO: input.issueDateISO ?? undefined,
				notes: input.notes ?? undefined,
			};

			const result = await provider.createDraft(draftInput);

			// Update database with external_id and provider info
			const { error: updateError } = await ctx.db
				.from("invoices")
				.update({
					provider: input.providerId,
					external_id: result.externalId,
					provider_status: "draft",
					updated_at:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				})
				.eq("id", input.invoiceId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update invoice with provider data",
					cause: updateError,
				});
			}

			return {
				externalId: result.externalId,
				provider: input.providerId,
			};
		}),

	/**
	 * Finalize and send invoice through provider (S3 - Connector integration)
	 * Updates status, URLs, and provider invoice number
	 */
	send: protectedProcedure
		.input(z.object({ invoiceId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Get invoice with provider info and lock status
			const { data: invoice, error: fetchError } = await ctx.db
				.from("invoices")
				.select(
					"id, provider, external_id, provider_status, issued_at, is_legacy",
				)
				.eq("id", input.invoiceId)
				.single();

			if (fetchError) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
					cause: fetchError,
				});
			}

			// S4: Check if already sent (prevent double-sending)
			if (isInvoiceLocked(invoice)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Invoice is already sent and locked. Provider is the source of truth.",
				});
			}

			// Legacy invoices use different send path
			if (invoice.is_legacy === true) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Legacy invoices cannot be sent via v2 API.",
				});
			}

			if (!invoice.provider || !invoice.external_id) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Invoice must have a provider and external_id to send",
				});
			}

			const provider = await getProvider(
				invoice.provider as InvoiceProviderId,
				ctx.db,
				ctx.auth.orgId,
				ctx.auth.userId,
			);

			const result = await provider.finalizeAndSend(invoice.external_id);

			// Update database with provider response
			const { error: updateError } = await ctx.db
				.from("invoices")
				.update({
					provider_status: result.status,
					pdf_url: result.pdfUrl ?? null,
					ubl_url: result.ublUrl ?? null,
					payment_url: result.paymentUrl ?? null,
					...(result.providerNumber && { number: result.providerNumber }), // Provider-assigned number
					status: "sent", // Internal status becomes sent
					issued_at:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
					updated_at:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				})
				.eq("id", input.invoiceId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update invoice after sending",
					cause: updateError,
				});
			}

			return {
				externalId: result.externalId,
				status: result.status,
				pdfUrl: result.pdfUrl,
				paymentUrl: result.paymentUrl,
				providerNumber: result.providerNumber,
			};
		}),

	/**
	 * Update invoice draft data (with post-send lock enforcement)
	 * Prevents modification of sent/paid invoices
	 */
	updateDraft: protectedProcedure
		.input(
			z.object({
				invoiceId: z.uuid(),
				// Allow updating basic fields that don't affect provider state
				notes: z.string().optional(),
				paymentTerms: z
					.enum(["immediate", "7_days", "14_days", "30_days", "60_days"])
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get current invoice state to check lock
			const { data: invoice, error: fetchError } = await ctx.db
				.from("invoices")
				.select("id, issued_at, provider_status, is_legacy")
				.eq("id", input.invoiceId)
				.single();

			if (fetchError) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
					cause: fetchError,
				});
			}

			// S4: Enforce post-send lock
			if (isInvoiceLocked(invoice)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Invoice is locked after send. Provider is now the source of truth.",
				});
			}

			// Legacy invoices use different update path
			if (invoice.is_legacy === true) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Legacy invoices cannot be modified via v2 API.",
				});
			}

			// Update allowed fields only
			const updateData: Partial<Tables<"invoices">> = {
				updated_at:
					Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
			};

			if (input.notes !== undefined) {
				updateData.notes = input.notes;
			}
			if (input.paymentTerms !== undefined) {
				updateData.payment_terms = input.paymentTerms;
			}

			const { error: updateError } = await ctx.db
				.from("invoices")
				.update(updateData)
				.eq("id", input.invoiceId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update invoice draft",
					cause: updateError,
				});
			}

			return { success: true };
		}),

	/**
	 * Delete invoice draft (with post-send lock enforcement)
	 * Only drafts that haven't been sent can be deleted
	 */
	deleteDraft: protectedProcedure
		.input(z.object({ invoiceId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Get current invoice state to check lock
			const { data: invoice, error: fetchError } = await ctx.db
				.from("invoices")
				.select("id, issued_at, provider_status, is_legacy, status")
				.eq("id", input.invoiceId)
				.single();

			if (fetchError) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
					cause: fetchError,
				});
			}

			// S4: Enforce post-send lock
			if (isInvoiceLocked(invoice)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Invoice is locked after send. Cannot delete sent invoices.",
				});
			}

			// Legacy invoices use different deletion path
			if (invoice.is_legacy === true) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Legacy invoices cannot be deleted via v2 API.",
				});
			}

			// Only allow deletion of draft status invoices
			if (invoice.status !== "draft") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only draft invoices can be deleted.",
				});
			}

			// Soft delete by updating status (preserve audit trail)
			const { error: updateError } = await ctx.db
				.from("invoices")
				.update({
					status: "cancelled",
					updated_at:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				})
				.eq("id", input.invoiceId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete invoice draft",
					cause: updateError,
				});
			}

			return { success: true };
		}),

	/**
	 * Refresh invoice status and URLs from provider (S3 - Connector integration)
	 * Syncs provider status with our local copy
	 */
	refreshSnapshot: protectedProcedure
		.input(z.object({ invoiceId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Get invoice with provider info
			const { data: invoice, error: fetchError } = await ctx.db
				.from("invoices")
				.select("id, provider, external_id")
				.eq("id", input.invoiceId)
				.single();

			if (fetchError) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
					cause: fetchError,
				});
			}

			if (!invoice.provider || !invoice.external_id) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Invoice must have a provider and external_id to refresh",
				});
			}

			const provider = await getProvider(
				invoice.provider as InvoiceProviderId,
				ctx.db,
				ctx.auth.orgId,
				ctx.auth.userId,
			);

			const snapshot = await provider.fetchSnapshot(invoice.external_id);

			// Update database with refreshed data
			const { error: updateError } = await ctx.db
				.from("invoices")
				.update({
					provider_status: snapshot.status,
					pdf_url: snapshot.pdfUrl ?? null,
					ubl_url: snapshot.ublUrl ?? null,
					payment_url: snapshot.paymentUrl ?? null,
					...(snapshot.providerNumber && { number: snapshot.providerNumber }),
					updated_at:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				})
				.eq("id", input.invoiceId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update invoice from provider snapshot",
					cause: updateError,
				});
			}

			return {
				externalId: snapshot.externalId,
				status: snapshot.status,
				pdfUrl: snapshot.pdfUrl,
				paymentUrl: snapshot.paymentUrl,
				providerNumber: snapshot.providerNumber,
			};
		}),

	/**
	 * Queue invoice for asynchronous status refresh (admin operation)
	 * Uses the background refresh queue system
	 */
	queueStatusRefresh: protectedProcedure
		.input(z.object({ invoiceId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Import the refresh function here to avoid circular dependencies
			const { refreshOne } = await import("~/server/jobs/status/refresh");

			try {
				const result = await refreshOne(ctx.db, input.invoiceId);
				return { success: true, result };
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: "Failed to queue status refresh",
					cause: error,
				});
			}
		}),

	/**
	 * Create payment link for an invoice (Mollie integration)
	 * Returns checkout URL for customer to pay the invoice
	 */
	createPaymentLink: protectedProcedure
		.input(
			z.object({
				invoiceId: z.uuid(),
				redirectUrl: z.url().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Import here to avoid circular dependencies
			const { createPaymentForInvoice } = await import(
				"~/server/payments/mollie/adapter"
			);

			try {
				const options = input.redirectUrl
					? { redirectUrl: input.redirectUrl }
					: {};

				const result = await createPaymentForInvoice(
					ctx.db,
					input.invoiceId,
					options,
				);

				return {
					success: true,
					checkoutUrl: result.checkoutUrl,
					molliePaymentId: result.molliePaymentId,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: "Failed to create payment link",
					cause: error,
				});
			}
		}),

	/**
	 * Get timeline events for a specific invoice (S10)
	 * Returns chronologically ordered events with RLS enforcement
	 */
	timeline: createTRPCRouter({
		getByInvoiceId: protectedProcedure.input(z.object({ id: z.uuid() })).query(
			async ({
				ctx,
				input,
			}): Promise<
				Array<{
					at: string;
					kind:
						| "created"
						| "sent"
						| "paid"
						| "reminder_sent"
						| "reminder_error"
						| "reminder_skipped"
						| "manual_follow_up";
					note?: string;
				}>
			> => {
				// First verify invoice exists and belongs to current org (RLS)
				try {
					mustSingle(
						await ctx.db
							.from("invoices")
							.select("id")
							.eq("id", input.id)
							.single(),
					);
				} catch {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Invoice not found",
					});
				}

				// Query timeline view (RLS inheritance ensures org filtering)
				const { data: timelineData, error } = await ctx.db
					.from("invoice_timeline")
					.select("*")
					.eq("invoice_id", input.id)
					.order("at", { ascending: false }); // DESC by time

				if (error) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to fetch timeline events",
					});
				}

				// Transform database records to frontend DTOs
				const timelineItems = timelineData
					.filter(
						(
							event,
						): event is NonNullable<typeof event> & {
							at: string;
							type: string;
						} => event.at != null && event.type != null,
					)
					.map((event) => {
						const meta = event.meta as Record<string, unknown>;

						// Map timeline view event types to frontend-friendly kinds
						let kind:
							| "created"
							| "sent"
							| "paid"
							| "reminder_sent"
							| "reminder_error"
							| "reminder_skipped"
							| "manual_follow_up";
						switch (event.type) {
							case "created":
								kind = "created";
								break;
							case "sent":
								kind = "sent";
								break;
							case "paid":
								kind = "paid";
								break;
							case "reminder_sent":
								kind = "reminder_sent";
								break;
							case "reminder_error":
								kind = "reminder_error";
								break;
							case "reminder_skipped":
								kind = "reminder_skipped";
								break;
							case "manual_follow_up":
								kind = "manual_follow_up";
								break;
							default:
								// Fallback for unknown types
								kind = "reminder_sent";
						}

						// Generate user-friendly note for timeline events
						let note: string | undefined;
						switch (event.type) {
							case "sent":
								note =
									"provider" in meta && typeof meta.provider === "string"
										? `Issued via ${meta.provider}`
										: "Invoice issued";
								break;
							case "paid":
								note =
									"payment_method" in meta &&
									typeof meta.payment_method === "string"
										? `Paid via ${meta.payment_method}`
										: "Payment received";
								break;
							case "reminder_sent":
								note =
									"channel" in meta && typeof meta.channel === "string"
										? `Reminder sent via ${meta.channel}`
										: "Reminder sent";
								break;
							case "reminder_error":
								note = "Reminder failed to send";
								break;
							case "reminder_skipped":
								note = "Customer opted out";
								break;
							case "manual_follow_up":
								note = "Manual follow-up required";
								break;
							default:
								note = undefined;
						}

						return {
							at: event.at,
							kind,
							...(note != null && { note }),
						};
					});

				return timelineItems;
			},
		),
	}),

	/**
	 * List ready draft invoices for supervisor review
	 * Returns V2 drafts only (is_legacy=false) with basic info for bulk selection
	 */
	listReadyDrafts: protectedProcedure
		.input(
			z.object({
				sinceISO: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Default to 7 days ago if no since date provided
			const sinceDate =
				input.sinceISO ??
				Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
					.subtract({ days: 7 })
					.toString();

			const { data: invoices, error } = await ctx.db
				.from("invoices")
				.select(`
					id,
					provider,
					total_cents,
					total_inc_vat,
					created_at,
					customers!inner (
						id,
						name,
						phone
					),
					jobs!inner (
						id,
						title
					)
				`)
				.eq("status", "draft")
				.eq("is_legacy", false)
				.gte("created_at", sinceDate)
				.order("created_at", { ascending: false });

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch ready drafts",
					cause: error,
				});
			}

			return invoices.map((invoice) => ({
				id: invoice.id,
				customerName: invoice.customers.name,
				...(invoice.customers.phone != null && {
					customerPhone: invoice.customers.phone,
				}),
				totalCents:
					invoice.total_cents ?? Math.round(invoice.total_inc_vat * 100),
				provider: invoice.provider as InvoiceProviderId | null,
				createdAtISO: invoice.created_at!,
				jobTitle: invoice.jobs.title,
			}));
		}),

	/**
	 * Bulk send selected draft invoices via their providers
	 * Handles provider finalization and optional WhatsApp payment link sending
	 */
	bulkSend: protectedProcedure
		.input(
			z.object({
				invoiceIds: z.array(z.uuid()),
				alsoWhatsApp: z.boolean().default(false),
				locale: z.enum(["en", "nl"]).default("nl"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const results = {
				total: input.invoiceIds.length,
				sent: 0,
				skipped: 0,
				withPaymentLinks: 0,
				errors: [] as Array<{ id: string; error: string }>,
			};

			for (const invoiceId of input.invoiceIds) {
				try {
					// Fetch invoice with lock check
					const { data: invoice, error: fetchError } = await ctx.db
						.from("invoices")
						.select(
							"id, provider, external_id, issued_at, provider_status, status",
						)
						.eq("id", invoiceId)
						.single();

					if (fetchError !== null) {
						results.errors.push({
							id: invoiceId,
							error: "Invoice not found",
						});
						continue;
					}

					// Skip if locked (already sent)
					if (isInvoiceLocked(invoice)) {
						results.skipped++;
						continue;
					}

					// Skip if not a draft or missing provider
					if (invoice.status !== "draft" || !invoice.provider) {
						results.skipped++;
						continue;
					}

					// Get provider instance
					const provider = await getProvider(
						invoice.provider as InvoiceProviderId,
						ctx.db,
						ctx.auth.orgId,
						ctx.auth.userId,
					);

					// Finalize and send via provider
					const sendResult = await provider.finalizeAndSend(
						invoice.external_id!,
					);

					// Update invoice with provider response
					const nowISO =
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString();
					const { error: updateError } = await ctx.db
						.from("invoices")
						.update({
							provider_status: sendResult.status,
							payment_url: sendResult.paymentUrl ?? null,
							pdf_url: sendResult.pdfUrl ?? null,
							ubl_url: sendResult.ublUrl ?? null,
							provider_number: sendResult.providerNumber ?? null,
							issued_at: nowISO,
							updated_at: nowISO,
						})
						.eq("id", invoiceId);

					if (updateError) {
						results.errors.push({
							id: invoiceId,
							error: "Failed to update invoice",
						});
						continue;
					}

					results.sent++;

					// TODO: Record timeline event for send action
					// TODO: Queue status refresh job

					// Optional WhatsApp payment link
					if (input.alsoWhatsApp && sendResult.paymentUrl) {
						// TODO: Call existing sendPaymentLink service
						// This would integrate with the WhatsApp payment sender
						results.withPaymentLinks++;
					}
				} catch (error) {
					results.errors.push({
						id: invoiceId,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return results;
		}),

	/**
	 * List draft invoices for daily approval workflow
	 * Returns minimal data needed for batch selection
	 */
	listDraftsForApproval: protectedProcedure
		.input(
			z.object({
				date: z.string().optional(), // ISO date string (YYYY-MM-DD)
			}),
		)
		.query(async ({ ctx, input }) => {
			// Default to today if no date provided
			const targetDate =
				input.date ??
				Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
					.toPlainDate()
					.toString();

			// Convert to full ISO datetime for the start of the day
			const startOfDay = Temporal.PlainDate.from(targetDate)
				.toZonedDateTime("Europe/Amsterdam")
				.toString();

			const endOfDay = Temporal.PlainDate.from(targetDate)
				.toZonedDateTime("Europe/Amsterdam")
				.with({ hour: 23, minute: 59, second: 59 })
				.toString();

			const { data: invoices, error } = await ctx.db
				.from("invoices")
				.select(`
					id,
					number,
					total_cents,
					total_inc_vat,
					created_at,
					customers!inner (
						id,
						name
					)
				`)
				.eq("status", "draft")
				.eq("is_legacy", false)
				.gte("created_at", startOfDay)
				.lte("created_at", endOfDay)
				.order("created_at", { ascending: false });

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch drafts for approval",
					cause: error,
				});
			}

			return invoices.map((invoice) => ({
				id: invoice.id,
				number: invoice.number,
				customerName: invoice.customers.name,
				totalCents:
					invoice.total_cents ?? Math.round(invoice.total_inc_vat * 100),
				createdAt: invoice.created_at!,
			}));
		}),

	/**
	 * Send multiple draft invoices in batch
	 * Simplified interface for daily approvals
	 */
	sendMany: protectedProcedure
		.input(
			z.object({
				invoiceIds: z.array(z.uuid()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Use the same logic as bulkSend but with simplified interface
			const results = {
				total: input.invoiceIds.length,
				sent: 0,
				skipped: 0,
				withPaymentLinks: 0,
				errors: [] as Array<{ id: string; error: string }>,
			};

			for (const invoiceId of input.invoiceIds) {
				try {
					// Fetch invoice with lock check
					const { data: invoice, error: fetchError } = await ctx.db
						.from("invoices")
						.select(
							"id, provider, external_id, issued_at, provider_status, status",
						)
						.eq("id", invoiceId)
						.single();

					if (fetchError !== null) {
						results.errors.push({
							id: invoiceId,
							error: "Invoice not found",
						});
						continue;
					}

					// Skip if locked (already sent)
					if (isInvoiceLocked(invoice)) {
						results.skipped++;
						continue;
					}

					// Skip if not a draft or missing provider
					if (invoice.status !== "draft" || !invoice.provider) {
						results.skipped++;
						continue;
					}

					// Get provider instance
					const provider = await getProvider(
						invoice.provider as InvoiceProviderId,
						ctx.db,
						ctx.auth.orgId,
						ctx.auth.userId,
					);

					// Finalize and send via provider
					const sendResult = await provider.finalizeAndSend(
						invoice.external_id!,
					);

					// Update invoice with provider response
					const nowISO =
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString();
					const { error: updateError } = await ctx.db
						.from("invoices")
						.update({
							provider_status: sendResult.status,
							payment_url: sendResult.paymentUrl ?? null,
							pdf_url: sendResult.pdfUrl ?? null,
							ubl_url: sendResult.ublUrl ?? null,
							provider_number: sendResult.providerNumber ?? null,
							issued_at: nowISO,
							updated_at: nowISO,
						})
						.eq("id", invoiceId);

					if (updateError) {
						results.errors.push({
							id: invoiceId,
							error: "Failed to update invoice",
						});
						continue;
					}

					results.sent++;
				} catch (error) {
					results.errors.push({
						id: invoiceId,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return results;
		}),
});

/**
 * Map database invoice row to DTO format
 * Handles both legacy and provider-based invoices
 */
function mapDbInvoiceToDto(
	invoice: Tables<"invoices"> & {
		customers?: { id: string; name: string; email?: string | null } | null;
		jobs?: { id: string; title: string } | null;
	},
): Omit<Invoice, "items"> & { items?: Invoice["items"] } {
	return {
		id: invoice.id,
		orgId: invoice.org_id,
		customerId: invoice.customer_id,
		jobId: invoice.job_id,

		// Legacy vs provider numbering
		invoiceNumber: invoice.number,
		isLegacy: invoice.is_legacy ?? false,

		// Provider fields (S1)
		provider: invoice.provider as Invoice["provider"],
		externalId: invoice.external_id ?? undefined,
		providerStatus: invoice.provider_status ?? undefined,
		paymentUrl: invoice.payment_url ?? undefined,
		pdfUrl: invoice.pdf_url ?? undefined,
		ublUrl: invoice.ubl_url ?? undefined,
		messageIds: Array.isArray(invoice.message_ids)
			? (invoice.message_ids as string[])
			: [],
		issuedAt: invoice.issued_at,

		// Status and metadata
		status: invoice.status as Invoice["status"],
		paymentTerms: invoice.payment_terms as Invoice["paymentTerms"],
		notes: invoice.notes ?? undefined,

		// Totals (prefer integer cents)
		subtotalExVat:
			invoice.subtotal_cents ?? Math.round(invoice.subtotal_ex_vat * 100),
		totalVatAmount:
			invoice.vat_amount_cents ?? Math.round(invoice.vat_total * 100),
		totalIncVat: invoice.total_cents ?? Math.round(invoice.total_inc_vat * 100),

		// Related entities
		customer:
			invoice.customers != null
				? {
						id: invoice.customers.id,
						name: invoice.customers.name,
						email: invoice.customers.email ?? undefined,
					}
				: undefined,
		job:
			invoice.jobs != null
				? {
						id: invoice.jobs.id,
						title: invoice.jobs.title,
					}
				: undefined,

		// Audit fields
		createdAt: invoice.created_at!, // string ISO from DB
		updatedAt: invoice.updated_at!,
	};
}
