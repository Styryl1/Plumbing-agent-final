import { useTranslations } from "next-intl";

// Invoice DTOs - Barrel export from unified schema
// This preserves existing imports while eliminating divergence

// Legacy type aliases for backward compatibility (deprecated - prefer schema/invoice.ts exports)
export type {
	CreateDraftInputType as CreateInvoiceDraftInput,
	InvoiceLineDraftType as InvoiceLineInput,
	UpdateDraftInputType as UpdateInvoiceDraftInput,
} from "~/schema/invoice";
// Re-export everything from the unified schema
export * from "~/schema/invoice";

// Legacy constants for backward compatibility (deprecated)
export const INVOICE_STATUS = [
	"draft",
	"sent",
	"paid",
	"overdue",
	"cancelled",
	"refunded",
] as const;

export const PAYMENT_TERMS = [
	"immediate",
	"14_days",
	"30_days",
	"60_days",
	"on_completion",
] as const;

export const PAYMENT_METHOD = [
	"ideal",
	"banktransfer",
	"cash",
	"card",
	"manual",
] as const;

export const LINE_TYPE = [
	"labor",
	"material",
	"travel",
	"discount",
	"deposit",
] as const;

export const VAT_RATES = [0, 9, 21] as const;

// Legacy interfaces (deprecated - prefer schema/invoice.ts types)
export interface InvoiceListItemDTO {
	id: string;
	formattedNumber: string;
	customerName: string;
	status: (typeof INVOICE_STATUS)[number];
	totalCents: number;
	issueDate: string;
	dueDate: string;
	paidAt?: string;
	isOverdue: boolean;
}

export interface PaymentDTO {
	id: string;
	invoiceId: string;
	amountCents: number;
	paymentMethod: (typeof PAYMENT_METHOD)[number];
	status: "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded";
	provider?: "mollie" | "manual";
	providerPaymentId?: string;
	providerCheckoutUrl?: string;
	createdAt: string;
	paidAt?: string;
	failedAt?: string;
}

export interface AuditLogEntryDTO {
	id: string;
	resourceType: "invoice" | "payment" | "reminder" | "credit_note";
	resourceId: string;
	action: string;
	actorId: string;
	actorRole?: string;
	changes: Record<string, unknown>;
	metadata: Record<string, unknown>;
	createdAt: string;
}
