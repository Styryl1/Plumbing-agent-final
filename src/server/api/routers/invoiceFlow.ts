// Invoice Flow Router - End-to-end Job → Invoice → Payment → WhatsApp flow
// Orchestrates invoice creation, provider issuance, and WhatsApp payment link delivery

import { TRPCError } from "@trpc/server";
import { parseZdt, zdtToISO } from "~/lib/time";
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
				.select("id, payment_url, status")
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

			if (!invoice.payment_url) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invoice has no payment URL",
				});
			}

			try {
				// Send via WhatsApp using our service
				const result = await sendPaymentLink(db, orgId, {
					phoneE164,
					url,
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
});
