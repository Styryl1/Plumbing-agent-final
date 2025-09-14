import { useTranslations } from "next-intl";
import "server-only";
import "~/lib/time";
import type {
	CreateDraftResult,
	FinalizeSendResult,
	InvoiceProvider,
	ProviderDraftInput,
	ProviderInvoiceSnapshot,
} from "../types";
import { WeFactClient, type WeFactDebtor } from "./client";
import { mapWeFactStatus } from "./status-map";

export class WeFactProvider implements InvoiceProvider {
	readonly id = "wefact" as const;
	supportsPaymentUrl = false; // WeFact doesn't provide payment URLs directly
	supportsUbl = false; // WeFact doesn't support UBL export

	private client: WeFactClient;

	constructor(apiKey: string, baseUrl?: string) {
		this.client = new WeFactClient({
			apiKey,
			baseUrl: baseUrl ?? "https://api.mijnwefact.nl/v2/",
		});
	}

	/**
	 * Create or find contact (debtor) in WeFact
	 */
	private async createOrFindContact(
		customer: ProviderDraftInput["customer"],
	): Promise<WeFactDebtor> {
		// First try to find existing debtor by email
		if (customer.email) {
			const existingDebtors = await this.client.searchDebtors(customer.email);
			if (existingDebtors.length > 0) {
				return existingDebtors[0]!;
			}
		}

		// If no email or not found, try searching by company name
		if (customer.name.length > 0) {
			const existingDebtors = await this.client.searchDebtors(customer.name);
			if (existingDebtors.length > 0) {
				// Check if email matches if provided
				const matchingDebtor =
					customer.email && customer.email.length > 0
						? existingDebtors.find(
								(d) =>
									d.EmailAddress?.toLowerCase() ===
									customer.email?.toLowerCase(),
							)
						: existingDebtors[0];

				if (matchingDebtor) {
					return matchingDebtor;
				}
			}
		}

		// No existing debtor found, create new one
		let newDebtorData: {
			CompanyName?: string;
			FirstName?: string;
			SurName?: string;
			EmailAddress?: string;
			Address?: string;
			ZipCode?: string;
			City?: string;
			Country?: string;
		};

		// If customer name looks like a person name, split it
		if (
			customer.name.length > 0 &&
			!customer.name.includes(" BV") &&
			!customer.name.includes(" B.V.") &&
			!customer.name.includes(" VOF") &&
			!customer.name.includes(" CV") &&
			customer.name.includes(" ") &&
			customer.name.split(" ").length === 2
		) {
			const [firstName, surname] = customer.name.split(" ");
			newDebtorData = {
				...(firstName && firstName.length > 0 && { FirstName: firstName }),
				...(surname && surname.length > 0 && { SurName: surname }),
				...(customer.email &&
					customer.email.length > 0 && { EmailAddress: customer.email }),
				...(customer.addressLine1 &&
					customer.addressLine1.length > 0 && {
						Address: customer.addressLine1,
					}),
				...(customer.postalCode &&
					customer.postalCode.length > 0 && { ZipCode: customer.postalCode }),
				...(customer.city &&
					customer.city.length > 0 && { City: customer.city }),
				Country:
					customer.country && customer.country.length > 0
						? customer.country
						: "NL",
			};
		} else {
			newDebtorData = {
				...(customer.name.length > 0 && { CompanyName: customer.name }),
				...(customer.email &&
					customer.email.length > 0 && { EmailAddress: customer.email }),
				...(customer.addressLine1 &&
					customer.addressLine1.length > 0 && {
						Address: customer.addressLine1,
					}),
				...(customer.postalCode &&
					customer.postalCode.length > 0 && { ZipCode: customer.postalCode }),
				...(customer.city &&
					customer.city.length > 0 && { City: customer.city }),
				Country:
					customer.country && customer.country.length > 0
						? customer.country
						: "NL", // Default to Netherlands
			};
		}

		return await this.client.createDebtor(newDebtorData);
	}

	/**
	 * Create draft invoice in WeFact
	 */
	async createDraft(input: ProviderDraftInput): Promise<CreateDraftResult> {
		// Find or create the debtor
		const debtor = await this.createOrFindContact(input.customer);

		// Convert lines from cents to decimal euros (WeFact expects decimal)
		const invoiceLines = input.lines.map((line) => ({
			Description: line.description,
			PriceExcl: line.unitPriceCents / 100, // Convert cents to euros
			TaxPercentage: line.vatRate, // Direct mapping (0, 9, or 21)
			Periods: line.quantity,
		}));

		// Create invoice with current date if not specified
		const invoiceDate = input.issueDateISO
			? input.issueDateISO.split("T")[0]! // Extract date part, guaranteed to exist
			: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
					.toPlainDate()
					.toString();

		const invoiceData = {
			Debtor: debtor.Identifier,
			InvoiceLines: invoiceLines,
			Date: invoiceDate,
			Term: 30, // 30-day payment terms (standard Dutch practice)
		};

		const invoice = await this.client.createInvoice(invoiceData);

		return {
			externalId: invoice.Identifier.toString(),
		};
	}

	/**
	 * Send invoice via WeFact
	 */
	async finalizeAndSend(externalId: string): Promise<FinalizeSendResult> {
		const identifier = parseInt(externalId, 10);
		if (isNaN(identifier)) {
			throw new Error(`Invalid WeFact invoice identifier: ${externalId}`);
		}

		// Send invoice by email
		await this.client.sendInvoiceByEmail(identifier);

		// Fetch updated invoice to get current status and metadata
		const invoice = await this.client.getInvoice(identifier);
		if (!invoice) {
			throw new Error(`Invoice not found after send: ${externalId}`);
		}

		// Download PDF and create storage URL (simplified for now)
		let pdfUrl: string | null = null;
		try {
			const pdfBase64 = await this.client.downloadInvoicePdf(identifier);
			// TODO: Upload to storage service and return signed URL
			// For now, we'll indicate PDF is available but not provide URL
			pdfUrl = pdfBase64.length > 0 ? "wefact:pdf-available" : null;
		} catch (error) {
			// PDF download failure shouldn't block send operation
			console.warn("Failed to download WeFact PDF:", error);
		}

		return {
			externalId,
			status: mapWeFactStatus(invoice.Status),
			pdfUrl,
			ublUrl: null, // WeFact doesn't support UBL
			paymentUrl: null, // WeFact doesn't provide direct payment URLs
			providerNumber:
				invoice.InvoiceCode.length > 0 ? invoice.InvoiceCode : null,
		};
	}

	/**
	 * Fetch current status and metadata from WeFact
	 */
	async fetchSnapshot(externalId: string): Promise<ProviderInvoiceSnapshot> {
		const identifier = parseInt(externalId, 10);
		if (isNaN(identifier)) {
			throw new Error(`Invalid WeFact invoice identifier: ${externalId}`);
		}

		const invoice = await this.client.getInvoice(identifier);
		if (!invoice) {
			throw new Error(`WeFact invoice not found: ${externalId}`);
		}

		// Check if PDF is available
		let pdfUrl: string | null = null;
		try {
			const pdfBase64 = await this.client.downloadInvoicePdf(identifier);
			pdfUrl = pdfBase64.length > 0 ? "wefact:pdf-available" : null;
		} catch {
			// PDF not available or error occurred
			pdfUrl = null;
		}

		return {
			externalId,
			status: mapWeFactStatus(invoice.Status),
			pdfUrl,
			ublUrl: null,
			paymentUrl: null,
			providerNumber:
				invoice.InvoiceCode.length > 0 ? invoice.InvoiceCode : null,
		};
	}
}
