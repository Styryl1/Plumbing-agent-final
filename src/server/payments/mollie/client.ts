import "server-only";
import { z } from "zod";
import { serverOnlyEnv } from "~/lib/env";

/**
 * Mollie Payment Schema (Zod v4)
 * Based on Mollie API v2 payment object
 */
const MolliePaymentSchema = z.object({
	id: z.string(),
	status: z.enum([
		"open",
		"canceled",
		"pending",
		"authorized",
		"expired",
		"failed",
		"paid",
	]),
	amount: z.object({
		value: z.string(), // "10.25"
		currency: z.string(), // "EUR"
	}),
	description: z.string(),
	method: z.string().nullable(),
	metadata: z.record(z.string(), z.string()).nullable(),
	createdAt: z.string(),
	paidAt: z.string().nullable(),
	canceledAt: z.string().nullable(),
	expiresAt: z.string().nullable(),
	failedAt: z.string().nullable(),
	_links: z.object({
		checkout: z
			.object({
				href: z.url(),
			})
			.optional(),
	}),
});

export type MolliePayment = z.infer<typeof MolliePaymentSchema>;

/**
 * Create Payment Request Schema
 */
const CreatePaymentRequestSchema = z.object({
	amountCents: z.number().int().positive(),
	description: z.string().min(1).max(255),
	redirectUrl: z.url(),
	webhookUrl: z.url(),
	metadata: z.record(z.string(), z.string()).optional(),
});

export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

/**
 * Minimal Mollie HTTP client for payment operations
 * Uses fetch directly for better control and type safety
 */
export class MollieClient {
	private readonly apiKey: string;
	private readonly baseUrl = "https://api.mollie.com/v2";

	constructor() {
		if (!serverOnlyEnv.MOLLIE_API_KEY) {
			throw new Error("MOLLIE_API_KEY environment variable is required");
		}
		this.apiKey = serverOnlyEnv.MOLLIE_API_KEY;
	}

	/**
	 * Create a new payment
	 */
	async createPayment(request: CreatePaymentRequest): Promise<MolliePayment> {
		const validated = CreatePaymentRequestSchema.parse(request);

		// Convert cents to Mollie's decimal string format
		const amountValue = (validated.amountCents / 100).toFixed(2);

		const response = await fetch(`${this.baseUrl}/payments`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				amount: {
					value: amountValue,
					currency: "EUR",
				},
				description: validated.description,
				redirectUrl: validated.redirectUrl,
				webhookUrl: validated.webhookUrl,
				metadata: validated.metadata ?? {},
			}),
		});

		if (!response.ok) {
			const errorData = (await response.json().catch(() => ({}))) as {
				title?: string;
				detail?: string;
			};
			throw new Error(
				`Mollie API error: ${response.status} ${errorData.title ?? "Unknown"} - ${errorData.detail ?? response.statusText}`,
			);
		}

		const paymentData: unknown = await response.json();
		return MolliePaymentSchema.parse(paymentData);
	}

	/**
	 * Get payment details by ID
	 */
	async getPayment(paymentId: string): Promise<MolliePayment> {
		const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
			},
		});

		if (!response.ok) {
			const errorData = (await response.json().catch(() => ({}))) as {
				title?: string;
				detail?: string;
			};
			throw new Error(
				`Mollie API error: ${response.status} ${errorData.title ?? "Unknown"} - ${errorData.detail ?? response.statusText}`,
			);
		}

		const paymentData: unknown = await response.json();
		return MolliePaymentSchema.parse(paymentData);
	}
}
