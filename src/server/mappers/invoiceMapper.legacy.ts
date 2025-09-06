// Invoice mapper layer - Transforms between database types and application DTOs
// Handles snake_case ↔ camelCase conversion and type safety boundaries
// Ensures UI never imports raw database types directly

import { zdtToISO } from "~/lib/time";
import {
	computeTotalsCents,
	eurosToCents,
	type Invoice,
	type InvoiceCustomer,
	type InvoiceItem,
	InvoiceItemSchema,
	type InvoiceJob,
	InvoiceSchema,
	type UpdateInvoiceInput,
} from "~/schema/invoice";
import type { Database, Json } from "~/types/supabase";

// === TYPE ALIASES FOR DATABASE LAYER ===

type DbInvoiceDraft = Database["public"]["Tables"]["invoice_drafts"]["Row"];
type DbInvoiceDraftUpdate =
	Database["public"]["Tables"]["invoice_drafts"]["Update"];
type DbCustomer = Database["public"]["Tables"]["customers"]["Row"];
type DbJob = Database["public"]["Tables"]["jobs"]["Row"];

// JSON structure for invoice draft lines (stored in JSONB column)
interface DbInvoiceLine {
	id?: string | null;
	line_type: string;
	description: string;
	qty: number;
	unit_price_ex_vat: number;
	vat_rate: number;
	line_total_ex_vat: number;
	vat_amount: number;
	line_total_inc_vat: number;
}

// === DATABASE TO DTO MAPPERS ===

/**
 * Transform database invoice line (from JSONB) to DTO InvoiceItem
 */
export function mapDbLineToDto(dbLine: DbInvoiceLine): InvoiceItem {
	try {
		console.debug("DEBUG mapDbLineToDto: START - function entered");
		console.debug(
			"DEBUG mapDbLineToDto: input dbLine =",
			JSON.stringify(dbLine),
		);

		// The JSONB data uses camelCase field names, not snake_case
		// Handle both camelCase (from JSONB) and snake_case (from interface) safely
		interface JsonbLineFormat {
			id?: string | null;
			lineType?: string;
			description?: string;
			qty?: number;
			unitPriceExVat?: number;
			vatRate?: number;
			lineTotalExVat?: number;
			vatAmount?: number;
			lineTotalIncVat?: number;
		}

		const jsonbLine = dbLine as unknown as JsonbLineFormat;

		// Convert vatRate safely, defaulting to 21% if invalid
		const vatRateNum = Number(jsonbLine.vatRate ?? dbLine.vat_rate);
		const vatRate = Number.isNaN(vatRateNum)
			? 21
			: [0, 9, 21].includes(vatRateNum)
				? vatRateNum
				: 21;

		// Map lineType to kind for new schema
		const lineType = jsonbLine.lineType ?? dbLine.line_type;
		const kind =
			lineType === "labor"
				? "labor"
				: lineType === "material"
					? "material"
					: "other";

		// Safe conversion for unitPriceExVat - handle both camelCase and snake_case
		const unitPriceExVatNum = Number(
			jsonbLine.unitPriceExVat ?? dbLine.unit_price_ex_vat,
		);
		const unitPriceExVat = Number.isNaN(unitPriceExVatNum)
			? 0
			: unitPriceExVatNum;
		const unitPriceCents = Math.round(unitPriceExVat * 100);

		// Helper to safely convert to number with fallback
		const safeNumber = (value: unknown, fallback = 0): number => {
			if (value === null || value === undefined) return fallback;
			const num = Number(value);
			if (Number.isNaN(num) || !Number.isFinite(num)) {
				console.warn("DEBUG mapDbLineToDto: Invalid number detected:", value);
				return fallback;
			}
			return num;
		};

		// Calculate totals if missing from legacy data
		const qty = safeNumber(jsonbLine.qty ?? dbLine.qty, 1); // Default to 1 if missing

		const lineTotalExVat =
			jsonbLine.lineTotalExVat !== undefined
				? safeNumber(jsonbLine.lineTotalExVat, 0)
				: dbLine.line_total_ex_vat !== undefined
					? safeNumber(dbLine.line_total_ex_vat, 0)
					: qty * unitPriceExVat; // Calculate from qty and unit price

		const vatAmount =
			jsonbLine.vatAmount !== undefined
				? safeNumber(jsonbLine.vatAmount, 0)
				: dbLine.vat_amount !== undefined
					? safeNumber(dbLine.vat_amount, 0)
					: Math.round(lineTotalExVat * (vatRate / 100)); // Calculate VAT amount

		const lineTotalIncVat =
			jsonbLine.lineTotalIncVat !== undefined
				? safeNumber(jsonbLine.lineTotalIncVat, 0)
				: dbLine.line_total_inc_vat !== undefined
					? safeNumber(dbLine.line_total_inc_vat, 0)
					: lineTotalExVat + vatAmount; // Calculate total including VAT

		// Debug logging
		console.debug("DEBUG mapDbLineToDto:", {
			qty,
			unitPriceExVat,
			vatRate,
			lineTotalExVat,
			vatAmount,
			lineTotalIncVat,
			jsonbLine,
			dbLine,
		});

		const mapped = {
			id: jsonbLine.id ?? dbLine.id,
			lineType: lineType as InvoiceItem["lineType"], // Legacy field
			description: jsonbLine.description ?? dbLine.description,
			qty,
			unitPriceExVat: unitPriceExVat, // Legacy field (safe)
			unitPriceCents: unitPriceCents, // New required field (safe)
			vatRate: vatRate as 0 | 9 | 21, // Ensure valid VAT rate
			kind: kind satisfies "labor" | "material" | "other", // New required field
			lineTotalExVat,
			vatAmount,
			lineTotalIncVat,
		};

		console.debug("DEBUG mapDbLineToDto: about to validate with schema");
		// Validate with schema
		const result = InvoiceItemSchema.parse(mapped);
		console.debug(
			"DEBUG mapDbLineToDto: validation successful, returning result",
		);
		return result;
	} catch (error) {
		console.error("ERROR mapDbLineToDto: caught exception:", error);
		console.error("ERROR mapDbLineToDto: dbLine =", dbLine);
		throw error; // Re-throw to maintain error flow
	}
}

/**
 * Transform database customer row to DTO InvoiceCustomer
 */
export function mapDbCustomerToDto(dbCustomer: DbCustomer): InvoiceCustomer {
	return {
		id: dbCustomer.id,
		name: dbCustomer.name,
		email: dbCustomer.email ?? undefined,
		phone: dbCustomer.phone ?? undefined,
		// Parse address field - customers table uses single address field
		street: dbCustomer.address ?? undefined,
		houseNumber: undefined, // Not stored separately in current schema
		postalCode: dbCustomer.postal_code ?? undefined,
		city: undefined, // Not stored separately in current schema
	};
}

/**
 * Transform database job row to DTO InvoiceJob
 */
export function mapDbJobToDto(dbJob: DbJob): InvoiceJob {
	// Ensure date is in valid ISO format or undefined
	let completedAt: string | undefined = undefined;
	if (dbJob.updated_at) {
		try {
			// Try to parse and reformat the date to ensure valid ISO format
			const date = new globalThis.Date(dbJob.updated_at);
			if (!Number.isNaN(date.getTime())) {
				completedAt = date.toISOString();
			}
		} catch {
			// If date parsing fails, leave as undefined
		}
	}

	return {
		id: dbJob.id,
		title: dbJob.title,
		completedAt,
	};
}

/**
 * Transform complete database invoice draft with relations to DTO Invoice
 */
export function mapDbInvoiceDraftToDto(
	dbDraft: DbInvoiceDraft,
	dbCustomer?: DbCustomer | null,
	dbJob?: DbJob | null,
): Invoice {
	try {
		console.debug("DEBUG mapDbInvoiceDraftToDto: START - function entered");

		// Parse lines from JSONB
		const linesJson = dbDraft.lines as unknown as DbInvoiceLine[];
		console.debug(
			"DEBUG mapDbInvoiceDraftToDto: linesJson =",
			JSON.stringify(linesJson),
		);

		if (!Array.isArray(linesJson)) {
			console.debug(
				"DEBUG mapDbInvoiceDraftToDto: linesJson is not array, using empty array",
			);
		}

		const items = Array.isArray(linesJson) ? linesJson.map(mapDbLineToDto) : [];
		console.debug(
			"DEBUG mapDbInvoiceDraftToDto: mapped items count =",
			items.length,
		);

		// Map related entities
		const customer = dbCustomer ? mapDbCustomerToDto(dbCustomer) : undefined;
		const job = dbJob ? mapDbJobToDto(dbJob) : undefined;

		// Helper function to safely convert to cents
		const toCents = (value: unknown): number => {
			if (value === null || value === undefined) return 0;
			const num = Number(value);
			if (Number.isNaN(num) || !Number.isFinite(num)) {
				console.warn(
					"DEBUG mapDbInvoiceDraftToDto: Invalid amount detected:",
					value,
				);
				return 0;
			}
			return Math.round(num * 100); // Convert to cents
		};

		const mapped = {
			id: dbDraft.id,
			orgId: dbDraft.org_id,
			jobId: dbDraft.job_id ?? undefined,
			customerId: dbDraft.customer_id,
			invoiceNumber: undefined, // Drafts don't have numbers yet
			status: dbDraft.is_confirmed ? ("approved" as const) : ("draft" as const),
			paymentTerms: dbDraft.payment_terms as Invoice["paymentTerms"],
			dueDate: undefined, // Calculated when approved
			items,
			notes: dbDraft.notes ?? undefined,
			subtotalExVat: toCents(dbDraft.subtotal_ex_vat),
			totalVatAmount: toCents(dbDraft.vat_total),
			totalIncVat: toCents(dbDraft.total_inc_vat),
			customer,
			job,
			createdAt: (() => {
				if (dbDraft.created_at) {
					try {
						const date = new globalThis.Date(dbDraft.created_at);
						return !Number.isNaN(date.getTime())
							? date.toISOString()
							: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
					} catch {
						return zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
					}
				}
				return zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
			})(),
			updatedAt: (() => {
				if (dbDraft.updated_at) {
					try {
						const date = new globalThis.Date(dbDraft.updated_at);
						return !Number.isNaN(date.getTime())
							? date.toISOString()
							: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
					} catch {
						return zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
					}
				}
				return zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
			})(),
		};

		// Validate with schema
		return InvoiceSchema.parse(mapped);
	} catch (error) {
		console.error("ERROR mapDbInvoiceDraftToDto: caught exception:", error);
		console.error("ERROR mapDbInvoiceDraftToDto: dbDraft =", dbDraft);
		throw error; // Re-throw to maintain error flow
	}
}

// === DTO TO DATABASE MAPPERS ===

/**
 * Transform InvoiceItem DTO to database line format (for JSONB storage)
 */
export function mapDtoLineToDb(item: InvoiceItem): DbInvoiceLine {
	return {
		id: item.id ?? null,
		line_type: item.lineType ?? mapKindToLineType(item.kind),
		description: item.description,
		qty: item.qty,
		unit_price_ex_vat: item.unitPriceExVat ?? item.unitPriceCents / 100,
		vat_rate: item.vatRate <= 1 ? item.vatRate : item.vatRate / 100, // Handle both formats
		line_total_ex_vat:
			item.lineTotalExVat ?? (item.lineTotalExVatCents ?? 0) / 100,
		vat_amount: item.vatAmount ?? (item.vatAmountCents ?? 0) / 100,
		line_total_inc_vat:
			item.lineTotalIncVat ?? (item.lineTotalIncVatCents ?? 0) / 100,
	};
}

// REMOVED: mapCreateInvoiceDtoToDb function - replaced by unified system
// This function used deprecated JSONB invoice_drafts table

/**
 * Transform UpdateInvoiceInput to database update format
 */
export function mapUpdateInvoiceDtoToDb(
	input: UpdateInvoiceInput,
): DbInvoiceDraftUpdate {
	const update: DbInvoiceDraftUpdate = {};

	// Update payment terms if provided
	if (input.paymentTerms !== undefined) {
		update.payment_terms = input.paymentTerms;
	}

	// Update notes if provided
	if (input.notes !== undefined) {
		update.notes = input.notes ?? null;
	}

	// Process items if provided
	if (input.items) {
		// Input items are already in unified schema format (InvoiceLineDraft)
		const processedItems = input.items;

		// Calculate new invoice totals using unified function
		const invoiceTotals = computeTotalsCents(processedItems);

		// Update invoice totals
		update.subtotal_ex_vat = invoiceTotals.subtotalExVatCents / 100; // Convert to euros
		update.vat_total = invoiceTotals.vatTotalCents / 100; // Convert to euros
		update.total_inc_vat = invoiceTotals.totalIncVatCents / 100; // Convert to euros

		// Update lines JSONB
		const dbLines = processedItems.map(mapDtoLineToDb);
		update.lines = dbLines as unknown as Json; // JSONB storage
	}

	return update;
}

// === UTILITY FUNCTIONS ===

/**
 * Map new kind field to legacy lineType
 */
function mapKindToLineType(kind: "labor" | "material" | "other"): string {
	switch (kind) {
		case "labor":
			return "labor";
		case "material":
			return "materials";
		case "other":
			return "travel"; // Default for other types
	}
}

/**
 * Validate invoice draft status transition
 */
export function isValidStatusTransition(
	currentStatus: Invoice["status"],
	newStatus: Invoice["status"],
): boolean {
	const validTransitions: Record<Invoice["status"], Invoice["status"][]> = {
		draft: ["pending", "cancelled"],
		pending: ["approved", "cancelled", "draft"],
		approved: ["sent", "cancelled"],
		sent: ["paid", "cancelled"],
		paid: [], // Final state
		cancelled: ["draft"], // Can restart as draft
	};

	// currentStatus is a valid key; transitions is non-null.
	const transitions = validTransitions[currentStatus];
	return transitions.includes(newStatus);
}

/**
 * Check if invoice can be edited (only drafts and pending can be modified)
 */
export function canEditInvoice(status: Invoice["status"]): boolean {
	return status === "draft" || status === "pending";
}

/**
 * Generate invoice number from organization prefix and sequence
 */
export function generateInvoiceNumber(
	prefix: string,
	year: number,
	sequence: number,
): string {
	const paddedSequence = sequence.toString().padStart(3, "0");
	return `${prefix}-${year}-${paddedSequence}`;
}

/**
 * Parse voice input price to cents (handles Dutch decimal format)
 */
export function parseVoicePriceInput(input: string): number {
	// Handle Dutch decimal format: "12,34" or "12.34"
	const cleaned = input
		.replace(/[^\d,.-]/g, "") // Remove non-numeric chars
		.replace(",", "."); // Convert comma to dot

	const euros = Number.parseFloat(cleaned);
	return eurosToCents(Number.isNaN(euros) ? 0 : euros);
}

/**
 * Format line item for voice confirmation
 */
export function formatLineItemForVoice(item: InvoiceItem): string {
	const price = ((item.unitPriceExVat ?? 0) / 100).toLocaleString("nl-NL", {
		style: "currency",
		currency: "EUR",
	});

	const total = ((item.lineTotalIncVat ?? 0) / 100).toLocaleString("nl-NL", {
		style: "currency",
		currency: "EUR",
	});

	return `${item.qty} x ${item.description} voor ${price} per stuk = ${total}`;
}

/**
 * Convert database status to DTO status
 */
export function mapDbStatusToDto(
	isConfirmed: boolean,
	voiceConfirmedAt?: string | null,
): Invoice["status"] {
	if (
		isConfirmed ||
		(voiceConfirmedAt !== null && voiceConfirmedAt !== undefined)
	) {
		return "approved";
	}
	return "draft";
}

/**
 * Add line item to existing JSONB lines
 */
export function addLineToJsonbLines(
	existingLines: unknown,
	newItem: InvoiceItem,
): DbInvoiceLine[] {
	const currentLines = Array.isArray(existingLines)
		? (existingLines as DbInvoiceLine[])
		: [];

	const newDbLine = mapDtoLineToDb(newItem);
	return [...currentLines, newDbLine];
}
