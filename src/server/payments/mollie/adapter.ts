import { useTranslations } from "next-intl";
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import "~/lib/time";
import { env, serverOnlyEnv } from "~/lib/env";
import type { Database } from "~/types/supabase";
import { MollieClient, type MolliePayment } from "./client";

export interface CreatePaymentOptions {
	redirectUrl?: string;
	webhookToken?: string;
}

export interface PaymentLinkResult {
	checkoutUrl: string;
	molliePaymentId: string;
}

/**
 * Create payment link for an invoice
 * Persists mollie_payment_id and mollie_checkout_url to the invoice
 */
export async function createPaymentForInvoice(
	db: SupabaseClient<Database>,
	invoiceId: string,
	options: CreatePaymentOptions = {},
): Promise<PaymentLinkResult> {
	// Get invoice details
	const { data: invoice, error: invoiceError } = await db
		.from("invoices")
		.select("id, org_id, total_inc_vat, number, customer_id, mollie_payment_id")
		.eq("id", invoiceId)
		.single();

	if (invoiceError) {
		throw new Error(`Invoice not found: ${invoiceError.message}`);
	}

	// Check if payment already exists
	if (invoice.mollie_payment_id) {
		throw new Error(
			`Invoice ${invoiceId} already has a Mollie payment: ${invoice.mollie_payment_id}`,
		);
	}

	// Get customer details for payment description
	const { data: customer, error: customerError } = await db
		.from("customers")
		.select("name")
		.eq("id", invoice.customer_id)
		.single();

	if (customerError) {
		throw new Error(`Customer not found: ${customerError.message}`);
	}

	// Convert total to cents (already in euros in DB)
	const totalCents = Math.round(invoice.total_inc_vat * 100);

	// Create payment with Mollie
	const mollieClient = new MollieClient();

	// Build webhook URL with verification token
	const webhookToken =
		options.webhookToken ?? serverOnlyEnv.MOLLIE_WEBHOOK_TOKEN;
	const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const webhookUrl = `${baseUrl}/api/webhooks/mollie?token=${webhookToken}`;

	// Default redirect to invoice page (could be success page later)
	const redirectUrl = options.redirectUrl ?? `${baseUrl}/invoices/${invoiceId}`;

	const payment = await mollieClient.createPayment({
		amountCents: totalCents,
		description: `Invoice ${invoice.number} - ${customer.name}`,
		redirectUrl,
		webhookUrl,
		metadata: {
			invoiceId,
			orgId: invoice.org_id,
		},
	});

	// Extract checkout URL
	const checkoutUrl = payment._links.checkout?.href;
	if (!checkoutUrl) {
		throw new Error("Mollie payment created but no checkout URL returned");
	}

	// Update invoice with Mollie payment details
	const { error: updateError } = await db
		.from("invoices")
		.update({
			mollie_payment_id: payment.id,
			mollie_checkout_url: checkoutUrl,
		})
		.eq("id", invoiceId);

	if (updateError) {
		throw new Error(`Failed to update invoice: ${updateError.message}`);
	}

	return {
		checkoutUrl,
		molliePaymentId: payment.id,
	};
}

/**
 * Reconcile payment status from Mollie webhook
 * Maps Mollie status to our payment system
 */
export async function reconcileFromPayment(
	db: SupabaseClient<Database>,
	payment: MolliePayment,
): Promise<boolean> {
	// Find invoice by payment ID or metadata
	let invoiceId = payment.metadata?.invoiceId;

	if (!invoiceId) {
		// Fallback: lookup by mollie_payment_id
		const { data: invoice, error } = await db
			.from("invoices")
			.select("id")
			.eq("mollie_payment_id", payment.id)
			.single();

		if (error != null) {
			throw new Error(`Invoice not found for Mollie payment ${payment.id}`);
		}
		invoiceId = invoice.id;
	}

	// Map Mollie status to our payment fields
	const updateData: {
		payment_method?: string;
		paid_at?: string | null;
	} = {};

	// Set payment method if available
	if (payment.method) {
		updateData.payment_method = payment.method;
	}

	// Handle status-specific updates
	switch (payment.status) {
		case "paid": {
			// Payment successful
			updateData.paid_at =
				payment.paidAt ??
				Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString();
			break;
		}
		case "failed":
		case "canceled":
		case "expired": {
			// Payment failed - ensure paid_at is null
			updateData.paid_at = null;
			break;
		}
		case "open":
		case "pending":
		case "authorized": {
			// Payment in progress - no paid_at yet
			updateData.paid_at = null;
			break;
		}
		default: {
			// Unknown status - log but don't update
			console.warn(
				`Unknown Mollie payment status: ${payment.status as string}`,
			);
			return false;
		}
	}

	// Update invoice
	const { error: updateError } = await db
		.from("invoices")
		.update(updateData)
		.eq("id", invoiceId);

	if (updateError) {
		throw new Error(`Failed to update invoice: ${updateError.message}`);
	}

	// Log successful reconciliation
	console.warn(
		`Reconciled Mollie payment ${payment.id} (${payment.status}) for invoice ${invoiceId}`,
	);

	return true;
}
