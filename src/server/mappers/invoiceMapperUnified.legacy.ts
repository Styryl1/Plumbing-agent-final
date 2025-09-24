import { zdtToISO } from "~/lib/time";
import {
	type CreateInvoiceInput,
	type InvoiceLineInput,
} from "~/schema/invoice";

// === TOTALS COMPUTATION ===

export function computeTotalsCents(lines: InvoiceLineInput[]): {
	subtotalExVatCents: number;
	vatTotalCents: number;
	totalIncVatCents: number;
} {
	const subtotal = lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0);
	const vatAmount = lines.reduce((sum, l) => {
		const lineSubtotal = l.unitPriceCents * l.qty;
		return sum + Math.round(lineSubtotal * (l.vatRate / 100));
	}, 0);
	return {
		subtotalExVatCents: subtotal,
		vatTotalCents: vatAmount,
		totalIncVatCents: subtotal + vatAmount,
	};
}

// === DATABASE MAPPING ===

export function toDBInvoice(
	input: CreateInvoiceInput,
	orgId: string,
	customerId: string,
): {
	org_id: string;
	customer_id: string;
	job_id: string | null;
	status: string;
	subtotal_cents: number;
	vat_amount_cents: number;
	total_cents: number;
	number: string;
	notes: string | null;
	created_at: string;
} {
	// Always compute totals from lines for consistency
	const { subtotalExVatCents, vatTotalCents, totalIncVatCents } =
		computeTotalsCents(input.lines);

	return {
		org_id: orgId,
		customer_id: customerId,
		job_id: input.jobId ?? null,
		status: input.issueNow ? "sent" : "draft",
		subtotal_cents: subtotalExVatCents,
		vat_amount_cents: vatTotalCents,
		total_cents: totalIncVatCents,
		number: "", // Empty string for now - will be set when sending invoice
		notes: input.notes ?? null,
		created_at: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
	};
}

export function toDBLines(
	invoiceId: string,
	orgId: string,
	lines: InvoiceLineInput[],
): Array<{
	id: string;
	invoice_id: string;
	org_id: string;
	line_number: number;
	description: string;
	qty: number;
	unit_price_ex_vat: number;
	unit_price_cents: number;
	line_type: string;
	vat_rate: number;
	vat_amount: number;
	line_total_ex_vat: number;
	line_total_inc_vat: number;
	line_total_cents: number;
	created_at: string;
}> {
	return lines.map((l, idx) => {
		const lineSubtotalCents = l.unitPriceCents * l.qty;
		const vatAmountCents = Math.round(lineSubtotalCents * (l.vatRate / 100));
		const lineTotalCents = lineSubtotalCents + vatAmountCents;

		return {
			id: crypto.randomUUID(),
			invoice_id: invoiceId,
			org_id: orgId,
			line_number: idx + 1,
			description: l.description,
			qty: l.qty,
			unit_price_ex_vat: l.unitPriceCents / 100, // Convert to euros for database
			unit_price_cents: l.unitPriceCents,
			line_type: "labor", // Default line type
			vat_rate: l.vatRate,
			vat_amount: vatAmountCents / 100, // Convert to euros for database
			line_total_ex_vat: lineSubtotalCents / 100, // Convert to euros for database
			line_total_inc_vat: lineTotalCents / 100, // Convert to euros for database
			line_total_cents: lineTotalCents,
			created_at: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		};
	});
}
