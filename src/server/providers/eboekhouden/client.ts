import "server-only";
import { z } from "zod";
import "~/lib/time";
import { serverOnlyEnv } from "~/lib/env";

// e-Boekhouden API response schemas
const SessionResponseSchema = z.object({
	sessiontoken: z.string().min(1), // e-Boekhouden returns "sessiontoken"
});

const ContactSchema = z.object({
	ID: z.number(),
	Code: z.string(),
	Bedrijf: z.string().optional(), // Company name
	Contactpersoon: z.string().optional(), // Contact person
	Email: z.string().optional(),
	Adres: z.string().optional(),
	Postcode: z.string().optional(),
	Plaats: z.string().optional(), // City
	Land: z.string().optional(),
});

const InvoiceSchema = z.object({
	Factuurnummer: z.string(), // Invoice number
	Relatiecode: z.string(), // Customer code
	Datum: z.string(), // Invoice date
	Betalingstermijn: z.number(), // Payment terms in days
	Factuurbedrag: z.string(), // Total amount as decimal string
	FactuurbedragExcl: z.string(), // Amount excluding VAT
	FactuurbedragBTW: z.string(), // VAT amount
	Status: z.string(), // Invoice status
});

export const InvoiceLineSchema = z.object({
	Omschrijving: z.string(), // Description
	Aantal: z.number(), // Quantity
	Eenheidsprijs: z.string(), // Unit price as decimal string
	BTWPercentage: z.number(), // VAT percentage
	Totaal: z.string(), // Line total as decimal string
});

export type EBoekhoudenContact = z.infer<typeof ContactSchema>;
export type EBoekhoudenInvoice = z.infer<typeof InvoiceSchema>;
export type EBoekhoudenInvoiceLine = z.infer<typeof InvoiceLineSchema>;

interface CachedSession {
	token: string;
	expiresAt: Temporal.ZonedDateTime;
}

/**
 * e-Boekhouden REST API client with session token management
 * Implements TTL caching and single-flight refresh for session tokens
 */
export class EBoekhoudenClient {
	private sessionCache = new Map<string, CachedSession>(); // Per-org session cache
	private refreshPromises = new Map<string, Promise<string>>(); // Single-flight refresh

	constructor(private readonly orgId: string) {}

	/**
	 * Create a new session token via POST /v1/session
	 */
	private async createSession(): Promise<string> {
		if (!serverOnlyEnv.EBOEK_API_TOKEN) {
			throw new Error("EBOEK_API_TOKEN environment variable is required");
		}

		const baseUrl =
			serverOnlyEnv.EBOEK_BASE_URL ?? "https://api.e-boekhouden.nl";
		const response = await fetch(`${baseUrl}/v1/session`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				token: serverOnlyEnv.EBOEK_API_TOKEN,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(
				`e-Boekhouden session creation failed: ${response.status} ${error}`,
			);
		}

		const data = (await response.json()) as unknown;
		const parsed = SessionResponseSchema.parse(data);

		// Cache session with 50-minute TTL (sessions are valid for 60 minutes)
		const expiresAt = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").add({
			minutes: 50,
		});
		this.sessionCache.set(this.orgId, {
			token: parsed.sessiontoken,
			expiresAt,
		});

		return parsed.sessiontoken;
	}

	/**
	 * Get valid session token with TTL caching and single-flight refresh
	 */
	private async getSessionToken(): Promise<string> {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const cached = this.sessionCache.get(this.orgId);

		// Return cached token if still valid
		if (cached && Temporal.ZonedDateTime.compare(now, cached.expiresAt) < 0) {
			return cached.token;
		}

		// Check for in-flight refresh
		const existingRefresh = this.refreshPromises.get(this.orgId);
		if (existingRefresh) {
			return existingRefresh;
		}

		// Start new refresh
		const refreshPromise = this.createSession();
		this.refreshPromises.set(this.orgId, refreshPromise);

		try {
			const token = await refreshPromise;
			this.refreshPromises.delete(this.orgId);
			return token;
		} catch (error) {
			this.refreshPromises.delete(this.orgId);
			throw error;
		}
	}

	/**
	 * Make authenticated request with session token in Authorization header
	 */
	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {},
		schema: z.ZodType<T>,
	): Promise<T> {
		const sessionToken = await this.getSessionToken();
		const baseUrl =
			serverOnlyEnv.EBOEK_BASE_URL ?? "https://api.e-boekhouden.nl";

		const response = await fetch(`${baseUrl}${endpoint}`, {
			...options,
			headers: {
				Authorization: sessionToken,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`e-Boekhouden API error: ${response.status} ${error}`);
		}

		const data = (await response.json()) as unknown;
		return schema.parse(data);
	}

	/**
	 * Search contacts by email or company name
	 */
	async searchContacts(query: string): Promise<EBoekhoudenContact[]> {
		const ContactListSchema = z.array(ContactSchema);

		// e-Boekhouden search endpoint (exact endpoint TBD from API docs)
		return this.makeRequest(
			`/v1/relaties?search=${encodeURIComponent(query)}`,
			{ method: "GET" },
			ContactListSchema,
		);
	}

	/**
	 * Create new contact (relation/debtor)
	 */
	async createContact(contactData: {
		Bedrijf?: string;
		Contactpersoon?: string;
		Email?: string;
		Adres?: string;
		Postcode?: string;
		Plaats?: string;
		Land?: string;
	}): Promise<EBoekhoudenContact> {
		return this.makeRequest(
			"/v1/relaties",
			{
				method: "POST",
				body: JSON.stringify(contactData),
			},
			ContactSchema,
		);
	}

	/**
	 * Create draft invoice
	 */
	async createInvoice(invoiceData: {
		Relatiecode: string;
		Datum: string;
		Betalingstermijn: number;
		Regels: EBoekhoudenInvoiceLine[];
	}): Promise<EBoekhoudenInvoice> {
		return this.makeRequest(
			"/v1/facturen",
			{
				method: "POST",
				body: JSON.stringify(invoiceData),
			},
			InvoiceSchema,
		);
	}

	/**
	 * Send invoice by email
	 */
	async sendInvoice(invoiceNumber: string): Promise<void> {
		await this.makeRequest(
			`/v1/facturen/${encodeURIComponent(invoiceNumber)}/verstuur`,
			{ method: "POST" },
			z.object({}), // Empty success response
		);
	}

	/**
	 * Get invoice details
	 */
	async getInvoice(invoiceNumber: string): Promise<EBoekhoudenInvoice> {
		return this.makeRequest(
			`/v1/facturen/${encodeURIComponent(invoiceNumber)}`,
			{ method: "GET" },
			InvoiceSchema,
		);
	}

	/**
	 * Download invoice PDF (returns Base64 encoded PDF or URL)
	 */
	async downloadInvoicePdf(invoiceNumber: string): Promise<string> {
		const PdfResponseSchema = z.object({
			pdf: z.string(), // Base64 encoded PDF data
		});

		const result = await this.makeRequest(
			`/v1/facturen/${encodeURIComponent(invoiceNumber)}/pdf`,
			{ method: "GET" },
			PdfResponseSchema,
		);

		return result.pdf;
	}
}
