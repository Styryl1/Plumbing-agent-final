// Invoice Data Transfer Object (DTO) schemas - Single source of truth for invoice system
// These DTOs define the application-layer contracts, separate from database transport types
// Money is stored as integer cents to avoid floating-point precision issues
// All dates are ISO strings, timezone handling is done at display layer

import { z } from "zod";

// === ENUMS AND CONSTANTS ===

// Provider enum for external invoice providers (S1)
export const InvoiceProviderSchema = z.enum([
	"moneybird",
	"wefact",
	"eboekhouden",
	"peppol",
]);

// VAT rates as integer percentages for precise calculations
export const VATRate = z.union([z.literal(0), z.literal(9), z.literal(21)]);

// Payment terms enum matching org_settings schema
export const PaymentTerms = z.enum([
	"immediate",
	"14_days",
	"30_days",
	"60_days",
	"on_completion",
]);

// Money stored as integer cents for precision
export const MoneyCents = z.number().int().nonnegative();

// Invoice line kinds for business logic
export const InvoiceLineKind = z.enum(["labor", "material", "other"]);

// Invoice status enum - camelCase for application layer
export const InvoiceStatusSchema = z.enum([
	"draft",
	"pending",
	"approved",
	"sent",
	"paid",
	"cancelled",
]);

// Line item types - Dutch business context
export const LineItemTypeSchema = z.enum([
	"labor",
	"materials",
	"travel",
	"emergency_surcharge",
	"weekend_surcharge",
	"evening_surcharge",
]);

// Voice detection results for Voice Mode integration
export const VoiceDetectionSchema = z.enum([
	"approved",
	"needs_revision",
	"unclear",
	"error",
]);

// === CORE DTO SCHEMAS ===

// Unified invoice line item draft schema
export const InvoiceLineDraft = z.object({
	id: z.uuid().optional(), // Optional for new items
	description: z.string().min(1).max(500),
	qty: z.number().min(0).max(9999.99), // Support fractional quantities (e.g., 2.5 hours)
	unit: z.string().default("stuks"),
	unitPriceCents: MoneyCents, // In cents for precision
	vatRate: VATRate, // Integer: 0, 9, or 21
	kind: InvoiceLineKind,
	// Calculated fields (computed from above values)
	lineTotalExVatCents: MoneyCents.optional(), // qty * unitPriceCents
	vatAmountCents: MoneyCents.optional(), // lineTotalExVatCents * (vatRate/100)
	lineTotalIncVatCents: MoneyCents.optional(), // lineTotalExVatCents + vatAmountCents
});

// Individual invoice line item (for backward compatibility)
export const InvoiceItemSchema = InvoiceLineDraft.extend({
	lineType: LineItemTypeSchema.optional(), // Legacy field
	unitPriceExVat: z.number().int().min(0).optional(), // Legacy field
	vatRate: z.union([VATRate, z.number().min(0).max(1)]), // Support both formats
	lineTotalExVat: z.number().int().min(0).optional(), // Legacy field
	vatAmount: z.number().int().min(0).optional(), // Legacy field
	lineTotalIncVat: z.number().int().min(0).optional(), // Legacy field
});

// Customer information for invoice
export const InvoiceCustomerSchema = z.object({
	id: z.uuid(),
	name: z.string().min(1),
	email: z.email().optional(),
	phone: z.string().optional(),
	// Dutch address format
	street: z.string().optional(),
	houseNumber: z.string().optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
});

// Job reference for invoice context
export const InvoiceJobSchema = z.object({
	id: z.uuid(),
	title: z.string().min(1),
	completedAt: z.iso.datetime().optional(), // ISO string
});

// Complete invoice draft DTO
export const InvoiceSchema = z.object({
	id: z.uuid().optional(), // Optional for new drafts
	orgId: z.string(), // Organization context
	jobId: z.uuid().optional(), // Optional job association
	customerId: z.uuid(),

	// Invoice metadata
	invoiceNumber: z.string().optional(), // Generated when approved (legacy)
	status: InvoiceStatusSchema,

	// Provider fields (S1) - external invoice providers own the truth post-send
	provider: InvoiceProviderSchema.optional(), // Which provider issued this invoice
	externalId: z.string().optional(), // Provider's internal ID for this invoice
	providerStatus: z.string().optional(), // Provider-specific status
	paymentUrl: z.url().optional(), // Provider's payment URL (iDEAL, etc.)
	pdfUrl: z.url().optional(), // Provider's official PDF URL
	ublUrl: z.url().optional(), // Provider's UBL (structured data) URL
	messageIds: z.array(z.string()).default([]), // Message IDs for tracking (Peppol, etc.)
	issuedAt: z.iso.datetime().optional(), // When provider issued the invoice
	isLegacy: z.boolean().default(false), // True for invoices with internal numbering

	// Dutch business information
	paymentTerms: PaymentTerms,
	dueDate: z.iso.datetime().optional(), // ISO string

	// Content
	items: z.array(InvoiceItemSchema).min(1).max(50), // Max 50 line items
	notes: z.string().max(1000).optional(),

	// Calculated totals (in cents)
	subtotalExVat: z.number().int().min(0),
	totalVatAmount: z.number().int().min(0),
	totalIncVat: z.number().int().min(0),

	// Related data (denormalized for UI efficiency)
	customer: InvoiceCustomerSchema.optional(),
	job: InvoiceJobSchema.optional(),

	// Audit fields
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

// === INPUT/OUTPUT SCHEMAS ===

// Unified invoice draft schema
export const InvoiceDraft = z.object({
	customerId: z.uuid(),
	jobId: z.uuid().optional(),
	paymentTerms: PaymentTerms.optional(), // Falls back to org default
	items: z.array(InvoiceLineDraft).min(1),
	notes: z.string().max(1000).optional(),
});

// Schema for creating new invoice drafts
export const CreateInvoiceSchema = InvoiceDraft;
export const CreateDraftInput = CreateInvoiceSchema;

// Schema for updating invoice drafts
export const UpdateInvoiceSchema = InvoiceDraft.partial();
export const UpdateDraftInput = UpdateInvoiceSchema.extend({ id: z.uuid() });

// Schema for Voice Mode line item input
export const VoiceLineItemSchema = z.object({
	description: z.string().min(1),
	quantity: z.number().min(0).optional().default(1),
	price: z.number().min(0), // In euros (converted to cents in mapper)
	type: LineItemTypeSchema.optional().default("labor"),
});

// Schema for Voice Mode invoice approval
export const VoiceApprovalSchema = z.object({
	invoiceId: z.uuid(),
	approved: z.boolean(),
	feedback: z.string().optional(),
	detectionConfidence: z.number().min(0).max(1).optional(),
});

// === TYPE EXPORTS ===

// Export TypeScript types for use throughout application
export type InvoiceProvider = z.infer<typeof InvoiceProviderSchema>;
export type PaymentTerms = z.infer<typeof PaymentTerms>;
export type VATRateType = z.infer<typeof VATRate>;
export type MoneyCentsType = z.infer<typeof MoneyCents>;
export type InvoiceLineKindType = z.infer<typeof InvoiceLineKind>;
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type LineItemType = z.infer<typeof LineItemTypeSchema>;

// === UNIFIED INPUT SCHEMAS (Batch B1) ===

export interface InvoiceLineInput {
	unitPriceCents: number;
	qty: number;
	description: string;
	vatRate: 0 | 9 | 21;
}

export interface CreateInvoiceInput {
	customerId: string;
	lines: InvoiceLineInput[];
	subtotalCents: number;
	vatAmountCents: number;
	totalCents: number;
	notes?: string | undefined;
	issueNow?: boolean | undefined; // if true, allocate number & set status='sent'
}

// Zod schema for tRPC input validation
export const CreateInvoiceInputSchema = z.object({
	customerId: z.uuid(),
	lines: z
		.array(
			z.object({
				unitPriceCents: z.number().int().min(0),
				qty: z.number().min(0),
				description: z.string().min(1).max(500),
				vatRate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
			}),
		)
		.min(1),
	subtotalCents: z.number().int().min(0).optional(),
	vatAmountCents: z.number().int().min(0).optional(),
	totalCents: z.number().int().min(0).optional(),
	notes: z.string().max(1000).optional(),
	issueNow: z.boolean().optional(),
});
export type VoiceDetection = z.infer<typeof VoiceDetectionSchema>;

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type InvoiceLineDraftType = z.infer<typeof InvoiceLineDraft>;
export type InvoiceDraftType = z.infer<typeof InvoiceDraft>;
export type InvoiceCustomer = z.infer<typeof InvoiceCustomerSchema>;
export type InvoiceJob = z.infer<typeof InvoiceJobSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;

// CreateInvoiceInput is defined as interface above - using that instead of inferred type
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type CreateDraftInputType = z.infer<typeof CreateDraftInput>;
export type CreateDraftInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateDraftInputType = z.infer<typeof UpdateDraftInput>;
export type VoiceLineItemInput = z.infer<typeof VoiceLineItemSchema>;
export type VoiceApprovalInput = z.infer<typeof VoiceApprovalSchema>;

// === UTILITY FUNCTIONS ===

/**
 * Calculate line item totals from base values in integer cents
 * Money calculations in cents to avoid floating-point errors
 */
export function calculateLineItemTotals(
	item: Pick<InvoiceLineDraftType, "qty" | "unitPriceCents" | "vatRate">,
): {
	lineTotalExVatCents: number;
	vatAmountCents: number;
	lineTotalIncVatCents: number;
} {
	const lineTotalExVatCents = Math.round(item.qty * item.unitPriceCents);
	const vatAmountCents = Math.round(lineTotalExVatCents * (item.vatRate / 100));
	const lineTotalIncVatCents = lineTotalExVatCents + vatAmountCents;

	return {
		lineTotalExVatCents,
		vatAmountCents,
		lineTotalIncVatCents,
	};
}

/**
 * Calculate invoice totals from line items in integer cents
 */
export function calculateInvoiceTotals(
	items: Array<{
		lineTotalExVatCents?: number;
		vatAmountCents?: number;
	}>,
): {
	subtotalExVatCents: number;
	vatTotalCents: number;
	totalIncVatCents: number;
} {
	const subtotalExVatCents = items.reduce(
		(sum, item) => sum + (item.lineTotalExVatCents ?? 0),
		0,
	);
	const vatTotalCents = items.reduce(
		(sum, item) => sum + (item.vatAmountCents ?? 0),
		0,
	);
	const totalIncVatCents = subtotalExVatCents + vatTotalCents;

	return {
		subtotalExVatCents,
		vatTotalCents,
		totalIncVatCents,
	};
}

/**
 * Server-side totals computation with integer cents precision
 */
export function computeTotalsCents(items: InvoiceLineDraftType[]): {
	subtotalExVatCents: number;
	vatTotalCents: number;
	totalIncVatCents: number;
} {
	let subtotalExVatCents = 0;
	let vatTotalCents = 0;

	for (const item of items) {
		const lineEx = Math.round(item.qty * item.unitPriceCents);
		const lineVat = Math.round(lineEx * (item.vatRate / 100));
		subtotalExVatCents += lineEx;
		vatTotalCents += lineVat;
	}

	const totalIncVatCents = subtotalExVatCents + vatTotalCents;

	return {
		subtotalExVatCents,
		vatTotalCents,
		totalIncVatCents,
	};
}

/**
 * Convert euros to cents for storage
 */
export function eurosToCents(euros: number): number {
	return Math.round(euros * 100);
}

/**
 * Convert cents to euros for display
 */
export function centsToEuros(cents: number): number {
	return cents / 100;
}

/**
 * Validate Dutch postal code format (1234 AB)
 */
export function isValidDutchPostalCode(postalCode: string): boolean {
	const regex = /^\d{4}\s?[A-Z]{2}$/i;
	return regex.test(postalCode.trim());
}

/**
 * Generate due date based on payment terms
 */
export function calculateDueDate(
	invoiceDate: Temporal.ZonedDateTime,
	paymentTerms: PaymentTerms,
): Temporal.ZonedDateTime {
	let dueDate = invoiceDate;

	switch (paymentTerms) {
		case "14_days":
			dueDate = invoiceDate.add({ days: 14 });
			break;
		case "30_days":
			dueDate = invoiceDate.add({ days: 30 });
			break;
		case "immediate":
			// Due immediately
			break;
		case "on_completion":
			// Due on job completion - handled separately
			break;
	}

	return dueDate;
}
