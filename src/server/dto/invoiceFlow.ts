// Invoice Flow DTOs - Type definitions for Job → Invoice → Payment → WhatsApp flow
// Enforces strict typing for end-to-end payment processing

import { z } from "zod";

// === INPUT SCHEMAS ===

export const createDraftFromJobSchema = z.object({
	jobId: z.uuid(),
});

export const issueInvoiceSchema = z.object({
	invoiceId: z.uuid(),
});

export const getPaymentLinkSchema = z.object({
	invoiceId: z.uuid(),
});

export const sendPaymentLinkSchema = z.object({
	invoiceId: z.uuid(),
	phoneE164: z.string().regex(/^\+\d{10,15}$/),
	url: z.url(),
	locale: z.enum(["nl", "en"]).default("nl"),
});

// === DTO TYPES ===

export type CreateDraftResult = {
	invoiceId: string;
	status: "draft";
};

export type IssueInvoiceResult = {
	status: "sent" | "failed";
	provider?: string;
	error?: string;
};

export type PaymentLinkResult = {
	url: string;
	provider: "moneybird" | "mollie";
};

export type SendPaymentLinkResult = {
	messageId: string;
	mode: "session" | "template";
};

// === TYPE EXPORTS ===

export type CreateDraftFromJobInput = z.infer<typeof createDraftFromJobSchema>;
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>;
export type GetPaymentLinkInput = z.infer<typeof getPaymentLinkSchema>;
export type SendPaymentLinkInput = z.infer<typeof sendPaymentLinkSchema>;
