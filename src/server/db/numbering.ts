import { useTranslations } from "next-intl";
// Invoice numbering service with atomic number generation
// Ensures unique invoice numbers per organization per year

import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { zdtToISO } from "~/lib/time";
import type { Database } from "~/types/supabase";

/**
 * Gets the next invoice number for an organization
 * Uses database function for atomic number generation
 */
export async function getNextInvoiceNumber(
	supabase: SupabaseClient<Database>,
	orgId: string,
	year?: number,
): Promise<{ number: number; formattedNumber: string }> {
	const currentYear = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").year;
	const { data, error } = await supabase.rpc("get_next_invoice_number", {
		p_org_id: orgId,
		p_year: year ?? currentYear,
	});

	if (error) {
		throw new Error(`Failed to get invoice number: ${error.message}`);
	}

	const invoiceNumber = data;
	const invoiceYear = year ?? currentYear;
	const formattedNumber = `${invoiceYear}-${String(invoiceNumber).padStart(4, "0")}`;

	return {
		number: invoiceNumber,
		formattedNumber,
	};
}

/**
 * Reserves an invoice number atomically
 * Called when transitioning from draft to sent status
 */
export async function reserveInvoiceNumber(
	supabase: SupabaseClient<Database>,
	orgId: string,
	invoiceId: string,
): Promise<{ number: number; year: number; formattedNumber: string }> {
	const year = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").year;

	// Get next number atomically
	const { number, formattedNumber } = await getNextInvoiceNumber(
		supabase,
		orgId,
		year,
	);

	// Update the invoice with the reserved number
	const { error: updateError } = await supabase
		.from("invoices")
		.update({
			number_int: number,
			year,
			status: "sent",
			sent_at: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		})
		.eq("id", invoiceId)
		.eq("org_id", orgId)
		.eq("status", "draft");

	if (updateError) {
		throw new Error(`Failed to assign invoice number: ${updateError.message}`);
	}

	return { number, year, formattedNumber };
}

/**
 * Validates that an invoice number hasn't been used
 * Used for import scenarios or manual number assignment
 */
export async function validateInvoiceNumber(
	supabase: SupabaseClient<Database>,
	orgId: string,
	number: number,
	year?: number,
): Promise<boolean> {
	const invoiceYear =
		year ?? Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").year;

	const { data, error } = await supabase
		.from("invoices")
		.select("id")
		.eq("org_id", orgId)
		.eq("year", invoiceYear)
		.eq("number_int", number)
		.limit(1);

	if (error) {
		throw new Error(`Failed to validate invoice number: ${error.message}`);
	}

	return data.length === 0;
}

/**
 * Gets the last used invoice number for an organization
 * Useful for displaying current sequence status
 * TODO: Re-implement when invoice_number_sequences table is restored
 */
export function getLastInvoiceNumber(): number | null {
	// TODO: Re-implement when invoice_number_sequences table is restored
	// Temporary: Return null until invoice_number_sequences table is restored
	// This will use the database function for numbering instead
	return null;
}
