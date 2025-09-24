// Invoice Flow Router - End-to-end Job → Invoice → Payment → WhatsApp flow
// Orchestrates invoice creation, provider issuance, and WhatsApp payment link delivery

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { parseZdt, zdtToISO } from "~/lib/time";
import type { InvoiceStatus } from "~/schema/invoice";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	type CreateDraftResult,
	createDraftFromJobSchema,
	getPaymentLinkSchema,
	type IssueInvoiceResult,
	issueInvoiceSchema,
	type PaymentLinkResult,
	type SendPaymentLinkResult,
	sendPaymentLinkSchema,
} from "~/server/dto/invoiceFlow";
import { sendPaymentLink } from "~/server/services/whatsapp/paymentLinkSender";

// Note: Using manual error handling instead of mustSingle for this router
const TZ = "Europe/Amsterdam";
const now = (): Temporal.ZonedDateTime => Temporal.Now.zonedDateTimeISO(TZ);
const SENDABLE_STATUSES: InvoiceStatus[] = ["sent", "overdue"];

export const invoiceFlowRouter = createTRPCRouter({
	/**
	 * Create invoice draft from completed job
	 */
	createDraftFromJob: protectedProcedure
		.input(createDraftFromJobSchema)
		.mutation(async ({ ctx, input }): Promise<CreateDraftResult> => {
			const { db, auth } = ctx;
			const { orgId } = auth;
			const { jobId } = input;

			if (orgId === "") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Get job details with customer info
			const { data: job, error: jobError } = await db
				.from("jobs")
				.select(
					`
					id,
					title,
					description,
					starts_at,
					ends_at,
					status,
					customer_id,
					customers!inner(
						id,
						name,
						phone,
						email,
						address,
						postal_code
					)
				`,
				)
				.eq("id", jobId)
				.eq("org_id", orgId)
				.eq("status", "completed")
				.single();

			if (jobError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found or not completed",
				});
			}

			// Calculate duration in hours for billing
			if (job.starts_at === null || job.ends_at === null) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Job must have start and end times",
				});
			}
			const startTime = parseZdt(job.starts_at);
			const endTime = parseZdt(job.ends_at);
			const durationHours = Math.ceil(startTime.until(endTime).total("hours"));

			// Create draft invoice
			const { data: invoice, error } = await db
				.from("invoices")
				.insert({
					org_id: orgId,
					customer_id: job.customer_id,
					job_id: jobId,
					number: `DRAFT-${now().epochMilliseconds}`, // Draft number uses timestamp until invoice_number_sequences is restored
					subtotal_ex_vat: durationHours * 75, // €75/hour
					vat_total: Math.round(durationHours * 75 * 0.21), // 21% BTW
					total_inc_vat: Math.round(durationHours * 75 * 1.21),
					status: "draft",
					due_at: zdtToISO(now().add({ days: 30 })), // 30 days
					notes: job.description ?? `Work performed: ${job.title}`,
				})
				.select("id")
				.single();

			if (error !== null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create invoice draft",
				});
			}

			return {
				invoiceId: invoice.id,
				status: "draft",
			};
		}),

	/**
	 * Issue invoice via provider (Moneybird first)
	 */
	issue: protectedProcedure
		.input(issueInvoiceSchema)
		.mutation(async ({ ctx, input }): Promise<IssueInvoiceResult> => {
			const { db, auth } = ctx;
			const { orgId } = auth;
			const { invoiceId } = input;

			if (orgId === "") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Get invoice details
			const { data: invoice, error: invoiceError } = await db
				.from("invoices")
				.select("*")
				.eq("id", invoiceId)
				.eq("org_id", orgId)
				.single();

			if (invoiceError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
				});
			}

			if (invoice.status !== "draft") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invoice must be in draft status",
				});
			}

			try {
				// For now, simulate provider integration
				// In production, this would call Moneybird API
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Update invoice status and add provider info
				await db
					.from("invoices")
					.update({
						status: "sent",
						provider: "moneybird",
						external_id: `MB-${now().epochMilliseconds}`,
						payment_url: `https://moneybird.example.com/pay/${invoiceId}`,
						pdf_url: `https://moneybird.example.com/pdf/${invoiceId}`,
						issued_at: zdtToISO(now()),
					})
					.eq("id", invoiceId)
					.eq("org_id", orgId);

				return {
					status: "sent",
					provider: "moneybird",
				};
			} catch (error) {
				console.error("Failed to issue invoice:", error);
				return {
					status: "failed",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	/**
	 * Get payment link for issued invoice
	 */
	getPaymentLink: protectedProcedure
		.input(getPaymentLinkSchema)
		.query(async ({ ctx, input }): Promise<PaymentLinkResult | null> => {
			const { db, auth } = ctx;
			const { orgId } = auth;
			const { invoiceId } = input;

			if (orgId === "") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			const { data: invoice, error: invoiceError } = await db
				.from("invoices")
				.select("payment_url, provider")
				.eq("id", invoiceId)
				.eq("org_id", orgId)
				.single();

			if (invoiceError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
				});
			}

			if (!invoice.payment_url) {
				return null;
			}

			return {
				url: invoice.payment_url,
				provider: invoice.provider
					? (invoice.provider as "moneybird" | "mollie")
					: "mollie",
			};
		}),

	/**
	 * List recently issued invoices for a customer that are eligible for payment links
	 */
	listSendableByCustomer: protectedProcedure
		.input(z.object({ customerId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const { orgId } = auth;

			if (orgId === "") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			const { data, error } = await db
				.from("invoices")
				.select(
					`
					id,
					number,
					status,
					provider,
					external_id,
					payment_url,
					mollie_checkout_url,
					total_cents,
					total_inc_vat,
					issued_at,
					due_at
				`,
				)
				.eq("org_id", orgId)
				.eq("customer_id", input.customerId)
				.in("status", SENDABLE_STATUSES)
				.order("issued_at", { ascending: false })
				.limit(5);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to load invoices",
					cause: error,
				});
			}

			const rows = Array.isArray(data) ? data : [];
			const invoices = rows.map((invoice) => {
				const totalCents =
					typeof invoice.total_cents === "number"
						? invoice.total_cents
						: Math.round(invoice.total_inc_vat * 100);

				return {
					id: invoice.id,
					number: invoice.number,
					status: invoice.status as InvoiceStatus,
					provider: invoice.provider,
					externalId: invoice.external_id,
					paymentUrl: invoice.payment_url,
					mollieCheckoutUrl: invoice.mollie_checkout_url,
					totalAmountCents: totalCents,
					issuedAt: invoice.issued_at,
					dueAt: invoice.due_at,
				};
			});

			return { invoices };
		}),

	/**
	 * Send payment link via WhatsApp
	 */
	sendPaymentLink: protectedProcedure
		.input(sendPaymentLinkSchema)
		.mutation(async ({ ctx, input }): Promise<SendPaymentLinkResult> => {
			const { db, auth } = ctx;
			const { orgId } = auth;
			const { invoiceId, phoneE164, url, locale } = input;

			if (orgId === "") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Verify invoice belongs to org and has payment URL
			const { data: invoice, error: invoiceError } = await db
				.from("invoices")
				.select("id, payment_url, mollie_checkout_url, status, provider")
				.eq("id", invoiceId)
				.eq("org_id", orgId)
				.single();

			if (invoiceError !== null) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
				});
			}

			if (invoice.status !== "sent") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invoice must be issued first",
				});
			}

			let linkUrl = url ?? invoice.payment_url ?? invoice.mollie_checkout_url;

			if (!linkUrl) {
				try {
					const { createPaymentForInvoice } = await import(
						"~/server/payments/mollie/adapter"
					);
					const { checkoutUrl } = await createPaymentForInvoice(db, invoiceId);
					linkUrl = checkoutUrl;
				} catch (creationError) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invoice has no payment URL",
						cause: creationError,
					});
				}
			}

			try {
				// Send via WhatsApp using our service
				const result = await sendPaymentLink(db, orgId, {
					phoneE164,
					url: linkUrl,
					locale,
				});

				// TODO: Add timeline logging when invoice_timeline table is available

				return result;
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: "Failed to send WhatsApp message",
				});
			}
		}),

	/**
	 * Create drafts from completed jobs since a specified date
	 * Prevents duplicate invoicing by checking existing invoices
	 */
	createDraftsFromCompletedJobsSince: protectedProcedure
		.input(
			z.object({
				sinceISO: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const { orgId } = auth;

			if (orgId === "") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Get completed jobs since the specified date
			// Note: We'll check for existing invoices separately since relationship is invoice.job_id
			const { data: jobs, error: jobsError } = await db
				.from("jobs")
				.select(`
					id,
					title,
					description,
					starts_at,
					ends_at,
					customer_id,
					customers!inner (
						id,
						name,
						email,
						phone
					)
				`)
				.eq("status", "completed")
				.gte("completed_at", input.sinceISO)
				.order("completed_at", { ascending: false });

			if (jobsError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch completed jobs",
					cause: jobsError,
				});
			}

			const createdInvoiceIds: string[] = [];
			const errors: Array<{ jobId: string; error: string }> = [];

			for (const job of jobs) {
				try {
					// Check if job already has an invoice
					const { data: existingInvoice } = await db
						.from("invoices")
						.select("id")
						.eq("job_id", job.id)
						.maybeSingle();

					if (existingInvoice) {
						// Skip jobs that already have invoices
						continue;
					}
					// Use the existing draft creation logic
					const invoiceData = {
						job_id: job.id,
						customer_id: job.customer_id,
						org_id: orgId,
						status: "draft" as const,
						is_legacy: false,
						number: `DRAFT-${job.id.slice(0, 8)}`, // Draft identifier format
						subtotal_ex_vat: 100, // Default placeholder - will be updated by provider
						vat_total: 21, // 21% Dutch VAT
						total_inc_vat: 121,
						subtotal_cents: 10000, // €100 in cents
						vat_amount_cents: 2100, // €21 in cents
						total_cents: 12100, // €121 in cents
						payment_terms: "30_days" as const,
						created_at: now().toString(),
						updated_at: now().toString(),
					};

					const { data: invoice, error: invoiceError } = await db
						.from("invoices")
						.insert(invoiceData)
						.select("id")
						.single();

					if (invoiceError !== null) {
						errors.push({
							jobId: job.id,
							error: "Failed to create invoice draft",
						});
						continue;
					}

					// Note: Job-to-invoice relationship is handled via invoice.job_id
					// No need to update jobs table as invoice already has job_id

					createdInvoiceIds.push(invoice.id);
				} catch (error) {
					errors.push({
						jobId: job.id,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return {
				created: createdInvoiceIds.length,
				invoiceIds: createdInvoiceIds,
				errors,
			};
		}),
});
