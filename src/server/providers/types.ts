import { useTranslations } from "next-intl";
import { z } from "zod";

// Keep aligned with S1 schema; provider list is fixed for now.
export const InvoiceProviderId = z.enum([
	"moneybird",
	"wefact",
	"eboekhouden",
	"peppol",
]);
export type InvoiceProviderId = z.infer<typeof InvoiceProviderId>;

// Narrow, provider-agnostic status signals we surface in UI (not the provider's raw strings).
export const ProviderInvoiceStatus = z.enum([
	"draft",
	"sent",
	"viewed",
	"paid",
	"overdue",
	"cancelled",
	"unknown",
]);
export type ProviderInvoiceStatus = z.infer<typeof ProviderInvoiceStatus>;

// Minimal DTO shape we need at provider boundary (no UI types here).
// Keep amounts in integer cents and ISO strings for dates.
export interface ProviderDraftInput {
	// External-facing, already mapped from our internal DTO.
	// Keep small: customer fields, lines, totals_cents, currency, vat schema hints (0/9/21), issue_date ISO.
	customer: {
		name: string;
		email?: string | null | undefined;
		vatId?: string | null | undefined;
		kvk?: string | null | undefined;
		addressLine1?: string | null | undefined;
		addressLine2?: string | null | undefined;
		postalCode?: string | null | undefined;
		city?: string | null | undefined;
		country?: string | null | undefined;
	};
	lines: Array<{
		description: string;
		quantity: number; // unit count, not money
		unitPriceCents: number; // integer cents
		vatRate: 0 | 9 | 21; // NL-specific for now
	}>;
	currency: string; // "EUR"
	totalExclCents: number;
	totalVatCents: number;
	totalInclCents: number;
	issueDateISO?: string | null | undefined;
	notes?: string | null | undefined;
}

// Standardized results (we never invent legal numbers; providers will assign later).
export interface CreateDraftResult {
	externalId: string; // provider identifier for the draft
}

export interface FinalizeSendResult {
	externalId: string;
	status: ProviderInvoiceStatus; // likely "sent"
	pdfUrl?: string | null | undefined;
	ublUrl?: string | null | undefined;
	paymentUrl?: string | null | undefined;
	providerNumber?: string | null | undefined; // their legal number (when available)
}

export interface ProviderInvoiceSnapshot {
	externalId: string;
	status: ProviderInvoiceStatus;
	pdfUrl?: string | null | undefined;
	ublUrl?: string | null | undefined;
	paymentUrl?: string | null | undefined;
	providerNumber?: string | null | undefined;
}

export interface WebhookDescriptor {
	event: "invoice.sent" | "invoice.viewed" | "invoice.paid" | "invoice.overdue";
	url: string;
}

export interface InvoiceProvider {
	readonly id: InvoiceProviderId;

	// Draft & send lifecycle (no network in S2; just method signatures).
	createDraft(input: ProviderDraftInput): Promise<CreateDraftResult>;
	finalizeAndSend(externalId: string): Promise<FinalizeSendResult>;

	// Fetch/sync surfaces
	fetchSnapshot(externalId: string): Promise<ProviderInvoiceSnapshot>;
	listWebhooks?(): Promise<WebhookDescriptor[]>; // optional
	setupWebhooks?(d: WebhookDescriptor[]): Promise<void>;

	// Capability flags (compile-time ergonomics; runtime will be set in S3+)
	supportsPaymentUrl: boolean;
	supportsUbl: boolean;
}
