import { useTranslations } from "next-intl";
import "server-only";
import { z } from "zod";
import "~/lib/time";
import { serverOnlyEnv } from "~/lib/env";

// Moneybird API response schemas
const AdministrationSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	country: z.string().optional(),
	currency: z.string().optional(),
});

const ContactSchema = z.object({
	id: z.string().min(1),
	company_name: z.string().optional(),
	firstname: z.string().optional(),
	lastname: z.string().optional(),
	email: z.email().optional(),
	phone: z.string().optional(),
	address1: z.string().optional(),
	zipcode: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
});

const TaxRateSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	percentage: z.string(), // e.g., "21.0" for 21%
	type: z.string().optional(),
	active: z.boolean().optional(),
});

const SalesInvoiceSchema = z.object({
	id: z.string().min(1),
	invoice_id: z.string().optional(),
	state: z.string(),
	invoice_date: z.string().optional(),
	due_date: z.string().optional(),
	sent_at: z.string().optional(),
	paid_at: z.string().optional(),
	url: z.url().optional(),
	payment_url: z.url().optional(),
	pdf_url: z.url().optional(),
	total_price_excl_tax: z.string().optional(),
	total_price_incl_tax: z.string().optional(),
	contact_id: z.string().optional(),
	contact: ContactSchema.optional(),
});

const TokenRefreshResponseSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	expires_in: z.number().positive(),
	token_type: z.literal("Bearer"),
});

export type MoneyBirdAdministration = z.infer<typeof AdministrationSchema>;
export type MoneyBirdContact = z.infer<typeof ContactSchema>;
export type MoneyBirdTaxRate = z.infer<typeof TaxRateSchema>;
export type MoneyBirdSalesInvoice = z.infer<typeof SalesInvoiceSchema>;

/**
 * Moneybird HTTP client with automatic token refresh
 */
export class MoneyBirdClient {
	private accessToken: string;
	private refreshToken: string;
	private expiresAt: Temporal.ZonedDateTime;

	constructor(
		accessToken: string,
		refreshToken: string,
		expiresAt: Temporal.ZonedDateTime | string,
	) {
		this.accessToken = accessToken;
		this.refreshToken = refreshToken;
		this.expiresAt =
			typeof expiresAt === "string"
				? Temporal.Instant.from(expiresAt).toZonedDateTimeISO(
						"Europe/Amsterdam",
					)
				: expiresAt;
	}

	/**
	 * Make authenticated API request with automatic token refresh
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
		schema?: z.ZodType<T>,
	): Promise<T> {
		// Refresh token if expired
		await this.ensureValidToken();

		const url = `https://moneybird.com/api/v2${endpoint}`;
		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				Accept: "application/json",
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Moneybird API error: ${response.status} ${errorText}`);
		}

		const data: unknown = await response.json();

		if (schema) {
			return schema.parse(data);
		}

		return data as T;
	}

	/**
	 * Ensure access token is valid, refresh if necessary
	 */
	private async ensureValidToken(): Promise<void> {
		// Check if token expires within the next 5 minutes
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const bufferMinutes = 5;
		const expiryWithBuffer = this.expiresAt.subtract({
			minutes: bufferMinutes,
		});

		if (Temporal.ZonedDateTime.compare(now, expiryWithBuffer) >= 0) {
			await this.refreshAccessToken();
		}
	}

	/**
	 * Refresh the access token using the refresh token
	 */
	private async refreshAccessToken(): Promise<void> {
		const clientId = serverOnlyEnv.MONEYBIRD_CLIENT_ID;
		const clientSecret = serverOnlyEnv.MONEYBIRD_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			throw new Error("Moneybird OAuth2 credentials not configured");
		}

		const response = await fetch("https://moneybird.com/oauth/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: this.refreshToken,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
		}

		const tokenData = TokenRefreshResponseSchema.parse(await response.json());

		// Update tokens and expiry
		this.accessToken = tokenData.access_token;
		this.refreshToken = tokenData.refresh_token;
		this.expiresAt = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").add({
			seconds: tokenData.expires_in,
		});
	}

	/**
	 * Get current token information for credential updates
	 */
	getTokenInfo(): {
		accessToken: string;
		refreshToken: string;
		expiresAt: string;
	} {
		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			expiresAt: this.expiresAt.toString(),
		};
	}

	/**
	 * Fetch available administrations
	 */
	async getAdministrations(): Promise<MoneyBirdAdministration[]> {
		return this.request("/administrations", {}, z.array(AdministrationSchema));
	}

	/**
	 * Create a contact (customer)
	 */
	async createContact(
		administrationId: string,
		contactData: {
			company_name?: string;
			firstname?: string;
			lastname?: string;
			email?: string;
			phone?: string;
			address1?: string;
			zipcode?: string;
			city?: string;
			country?: string;
		},
	): Promise<MoneyBirdContact> {
		return this.request(
			`/administrations/${administrationId}/contacts`,
			{
				method: "POST",
				body: JSON.stringify({ contact: contactData }),
			},
			ContactSchema,
		);
	}

	/**
	 * Create a sales invoice
	 */
	async createSalesInvoice(
		administrationId: string,
		invoiceData: {
			contact_id?: string | undefined;
			invoice_date?: string | undefined;
			due_date?: string | undefined;
			details_attributes: Array<{
				description: string;
				amount: string; // Amount in euros as string (e.g., "123.45")
				tax_rate_id?: string;
			}>;
		},
	): Promise<MoneyBirdSalesInvoice> {
		return this.request(
			`/administrations/${administrationId}/sales_invoices`,
			{
				method: "POST",
				body: JSON.stringify({ sales_invoice: invoiceData }),
			},
			SalesInvoiceSchema,
		);
	}

	/**
	 * Send (finalize) a sales invoice
	 */
	async sendSalesInvoice(
		administrationId: string,
		invoiceId: string,
		deliveryMethod: "Email" | "Simulated" = "Email",
	): Promise<MoneyBirdSalesInvoice> {
		return this.request(
			`/administrations/${administrationId}/sales_invoices/${invoiceId}/send_invoice`,
			{
				method: "PATCH",
				body: JSON.stringify({
					sales_invoice_sending: {
						delivery_method: deliveryMethod,
					},
				}),
			},
			SalesInvoiceSchema,
		);
	}

	/**
	 * Fetch a specific sales invoice
	 */
	async getSalesInvoice(
		administrationId: string,
		invoiceId: string,
	): Promise<MoneyBirdSalesInvoice> {
		return this.request(
			`/administrations/${administrationId}/sales_invoices/${invoiceId}`,
			{},
			SalesInvoiceSchema,
		);
	}

	/**
	 * List available tax rates for an administration
	 */
	async listTaxRates(administrationId: string): Promise<MoneyBirdTaxRate[]> {
		return this.request(
			`/administrations/${administrationId}/tax_rates`,
			{},
			z.array(TaxRateSchema),
		);
	}

	/**
	 * Search contacts by query (email or name)
	 */
	async searchContacts(
		administrationId: string,
		query: string,
	): Promise<MoneyBirdContact[]> {
		const searchParams = new URLSearchParams({ query });
		return this.request(
			`/administrations/${administrationId}/contacts?${searchParams}`,
			{},
			z.array(ContactSchema),
		);
	}
}
