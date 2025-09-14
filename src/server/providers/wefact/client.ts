import { useTranslations } from "next-intl";
import "server-only";
import { z } from "zod";
import "~/lib/time";

// WeFact API response schemas
const WeFactBaseResponseSchema = z.object({
	controller: z.string(),
	action: z.string(),
	status: z.string(),
	date: z.string().optional(),
});

const WeFactErrorResponseSchema = WeFactBaseResponseSchema.extend({
	status: z.literal("error"),
	errors: z.array(z.string()).optional(),
});

const WeFactSuccessResponseSchema = WeFactBaseResponseSchema.extend({
	status: z.literal("success"),
});

// Debtor (customer) schemas
const DebtorSchema = z.object({
	Identifier: z.number(),
	DebtorCode: z.string(),
	CompanyName: z.string().optional(),
	Sex: z.string().optional(),
	FirstName: z.string().optional(),
	SurName: z.string().optional(),
	Address: z.string().optional(),
	ZipCode: z.string().optional(),
	City: z.string().optional(),
	Country: z.string().optional(),
	EmailAddress: z.string().optional(),
	PhoneNumber: z.string().optional(),
	MobileNumber: z.string().optional(),
});

// Invoice schemas
const InvoiceSchema = z.object({
	Identifier: z.number(),
	InvoiceCode: z.string(),
	Debtor: z.number(),
	DebtorCode: z.string().optional(),
	Date: z.string(),
	Term: z.number().optional(),
	PaymentMethod: z.string().optional(),
	Status: z.string(),
	InvoiceLines: z
		.array(
			z.object({
				Identifier: z.number().optional(),
				Number: z.number().optional(),
				ProductCode: z.string().optional(),
				Description: z.string(),
				PriceExcl: z.number(),
				TaxPercentage: z.number(),
				Periods: z.number(),
				Periodic: z.string().optional(),
				StartPeriod: z.string().optional(),
				EndPeriod: z.string().optional(),
			}),
		)
		.optional(),
	Discount: z.number().optional(),
	Paid: z.number().optional(),
	InvoiceSum: z.number().optional(),
	InvoiceSumVat: z.number().optional(),
	InvoiceSumIncl: z.number().optional(),
});

type DebtorListResponse = z.infer<typeof WeFactSuccessResponseSchema> & {
	Debtors?: z.infer<typeof DebtorSchema>[];
};

type DebtorShowResponse = z.infer<typeof WeFactSuccessResponseSchema> & {
	Debtor?: z.infer<typeof DebtorSchema>;
};

type InvoiceShowResponse = z.infer<typeof WeFactSuccessResponseSchema> & {
	Invoice?: z.infer<typeof InvoiceSchema>;
};

type InvoiceAddResponse = z.infer<typeof WeFactSuccessResponseSchema> & {
	Invoice?: z.infer<typeof InvoiceSchema>;
};

type InvoiceSendResponse = z.infer<typeof WeFactSuccessResponseSchema>;

type PdfDownloadResponse = z.infer<typeof WeFactSuccessResponseSchema> & {
	download: string; // Base64 encoded PDF
};

export type WeFactDebtor = z.infer<typeof DebtorSchema>;
export type WeFactInvoice = z.infer<typeof InvoiceSchema>;

// Export schemas for runtime validation
export { DebtorSchema, InvoiceSchema, WeFactSuccessResponseSchema };

export class WeFactProviderError extends Error {
	constructor(
		public controller: string,
		public action: string,
		public statusCode: number,
		public errors: string[] = [],
		message?: string,
	) {
		super(
			message ?? `WeFact ${controller}/${action} failed: ${errors.join(", ")}`,
		);
		this.name = "WeFactProviderError";
	}
}

export interface WeFactClientOptions {
	apiKey: string;
	baseUrl?: string;
}

export class WeFactClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: WeFactClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.mijnwefact.nl/v2/";
	}

	/**
	 * Make a request to the WeFact API
	 */
	private async request<T>(
		controller: string,
		action: string,
		params: Record<string, unknown> = {},
	): Promise<T> {
		const body = {
			api_key: this.apiKey,
			controller,
			action,
			...params,
		};

		const response = await fetch(this.baseUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "PlumbingAgent/1.0",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new WeFactProviderError(
				controller,
				action,
				response.status,
				[],
				`HTTP ${response.status}: ${response.statusText}`,
			);
		}

		const data: unknown = await response.json();

		// Check for WeFact API errors
		const errorCheck = WeFactErrorResponseSchema.safeParse(data);
		if (errorCheck.success) {
			throw new WeFactProviderError(
				controller,
				action,
				response.status,
				errorCheck.data.errors ?? ["Unknown WeFact error"],
			);
		}

		return data as T;
	}

	/**
	 * Search debtors by email or company name
	 */
	async searchDebtors(query: string): Promise<WeFactDebtor[]> {
		const response = await this.request<DebtorListResponse>("debtor", "list", {
			searchfor: query,
		});

		return response.Debtors ?? [];
	}

	/**
	 * Get debtor by identifier or code
	 */
	async getDebtor(identifier: number | string): Promise<WeFactDebtor | null> {
		const params =
			typeof identifier === "number"
				? { Identifier: identifier }
				: { DebtorCode: identifier };

		const response = await this.request<DebtorShowResponse>(
			"debtor",
			"show",
			params,
		);

		return response.Debtor ?? null;
	}

	/**
	 * Create new debtor
	 */
	async createDebtor(debtorData: {
		CompanyName?: string;
		FirstName?: string;
		SurName?: string;
		EmailAddress?: string;
		Address?: string;
		ZipCode?: string;
		City?: string;
		Country?: string;
		PhoneNumber?: string;
	}): Promise<WeFactDebtor> {
		const response = await this.request<DebtorShowResponse>(
			"debtor",
			"add",
			debtorData,
		);

		if (!response.Debtor) {
			throw new WeFactProviderError("debtor", "add", 500, [
				"No debtor returned",
			]);
		}

		return response.Debtor;
	}

	/**
	 * Create new invoice
	 */
	async createInvoice(invoiceData: {
		Debtor: number;
		InvoiceLines: Array<{
			Description: string;
			PriceExcl: number;
			TaxPercentage: number;
			Periods: number;
		}>;
		Date?: string;
		Term?: number;
	}): Promise<WeFactInvoice> {
		const response = await this.request<InvoiceAddResponse>(
			"invoice",
			"add",
			invoiceData,
		);

		if (!response.Invoice) {
			throw new WeFactProviderError("invoice", "add", 500, [
				"No invoice returned",
			]);
		}

		return response.Invoice;
	}

	/**
	 * Get invoice by identifier or code
	 */
	async getInvoice(identifier: number | string): Promise<WeFactInvoice | null> {
		const params =
			typeof identifier === "number"
				? { Identifier: identifier }
				: { InvoiceCode: identifier };

		const response = await this.request<InvoiceShowResponse>(
			"invoice",
			"show",
			params,
		);

		return response.Invoice ?? null;
	}

	/**
	 * Send invoice by email
	 */
	async sendInvoiceByEmail(identifier: number | string): Promise<void> {
		const params =
			typeof identifier === "number"
				? { Identifier: identifier }
				: { InvoiceCode: identifier };

		await this.request<InvoiceSendResponse>("invoice", "sendbyemail", params);
	}

	/**
	 * Download invoice PDF as Base64
	 */
	async downloadInvoicePdf(identifier: number | string): Promise<string> {
		const params =
			typeof identifier === "number"
				? { Identifier: identifier }
				: { InvoiceCode: identifier };

		const response = await this.request<PdfDownloadResponse>(
			"invoice",
			"download",
			params,
		);

		if (response.download.length === 0) {
			throw new WeFactProviderError("invoice", "download", 500, [
				"No PDF data returned",
			]);
		}

		return response.download;
	}
}
