import { useTranslations } from "next-intl";
import "server-only";
import type { ProviderCredential } from "~/server/db/provider-credentials";
import type {
	CreateDraftResult,
	FinalizeSendResult,
	InvoiceProvider,
	ProviderDraftInput,
	ProviderInvoiceSnapshot,
	ProviderInvoiceStatus,
} from "../types";
import type { MoneyBirdClient } from "./client";
import { taxRateCache } from "./taxRateCache";

/**
 * Moneybird provider implementation with real API integration
 */
export class MoneybirdProvider implements InvoiceProvider {
	readonly id = "moneybird" as const;
	supportsPaymentUrl = true;
	supportsUbl = false; // Moneybird doesn't support UBL export directly
	supportsPdf = true;

	constructor(
		private client: MoneyBirdClient,
		private credentials: ProviderCredential,
	) {}

	/**
	 * Create draft invoice in Moneybird
	 */
	async createDraft(input: ProviderDraftInput): Promise<CreateDraftResult> {
		if (!this.credentials.administration_id) {
			throw new Error("No Moneybird administration selected");
		}

		// Find or create contact
		let contactId: string | undefined;

		if (input.customer.email) {
			// First, search for existing contact by email
			const existingContacts = await this.client.searchContacts(
				this.credentials.administration_id,
				input.customer.email,
			);

			// Use existing contact if found
			if (existingContacts.length > 0) {
				contactId = existingContacts[0]!.id;
			} else {
				// Fallback: search by name + zipcode if no email match
				if (input.customer.postalCode) {
					const nameSearch = await this.client.searchContacts(
						this.credentials.administration_id,
						input.customer.name,
					);

					// Check if any result matches zipcode
					const zipMatch = nameSearch.find(
						(c) => c.zipcode === input.customer.postalCode,
					);

					if (zipMatch) {
						contactId = zipMatch.id;
					}
				}

				// Create new contact only if no matches found
				if (!contactId) {
					const contactData: Record<string, string> = {
						company_name: input.customer.name,
						email: input.customer.email,
						country: "NL", // Default to Netherlands
					};

					// Only add optional fields if they have actual values
					if (input.customer.addressLine1) {
						contactData.address1 = input.customer.addressLine1;
					}
					if (input.customer.postalCode) {
						contactData.zipcode = input.customer.postalCode;
					}
					if (input.customer.city) {
						contactData.city = input.customer.city;
					}

					const contact = await this.client.createContact(
						this.credentials.administration_id,
						contactData,
					);
					contactId = contact.id;
				}
			}
		}

		// Get available tax rates for VAT mapping
		const taxRates = await taxRateCache.getTaxRates(
			this.client,
			this.credentials.administration_id,
		);

		// Convert line items to Moneybird format with VAT mapping
		const detailsAttributes = input.lines.map((line) => {
			const lineVatRate = line.vatRate; // Already typed as 0 | 9 | 21, no default needed
			const taxRateId = taxRateCache.mapVatPercentageToTaxRateId(
				taxRates,
				lineVatRate,
			);

			const detail: {
				description: string;
				amount: string;
				tax_rate_id?: string;
			} = {
				description: line.description,
				// Convert cents to euro string for Moneybird API
				amount: (line.unitPriceCents / 100).toFixed(2),
			};

			// Only add tax_rate_id if we found a matching rate
			if (taxRateId) {
				detail.tax_rate_id = taxRateId;
			}

			return detail;
		});

		// Create draft invoice
		const invoiceData: {
			contact_id?: string;
			invoice_date?: string | undefined;
			due_date?: string | undefined;
			details_attributes: Array<{
				description: string;
				amount: string;
				tax_rate_id?: string;
			}>;
		} = {
			details_attributes: detailsAttributes,
		};

		// Only add optional fields if they have actual values
		if (contactId) {
			invoiceData.contact_id = contactId;
		}
		if (input.issueDateISO) {
			invoiceData.invoice_date = input.issueDateISO.split("T")[0]; // Convert to YYYY-MM-DD
		}

		const invoice = await this.client.createSalesInvoice(
			this.credentials.administration_id,
			invoiceData,
		);

		return {
			externalId: invoice.id,
		};
	}

	/**
	 * Finalize and send invoice in Moneybird
	 */
	async finalizeAndSend(externalId: string): Promise<FinalizeSendResult> {
		if (!this.credentials.administration_id) {
			throw new Error("No Moneybird administration selected");
		}

		// Send the invoice via email
		const invoice = await this.client.sendSalesInvoice(
			this.credentials.administration_id,
			externalId,
			"Email",
		);

		// Map Moneybird status to our internal status
		let status: ProviderInvoiceStatus = "sent";
		switch (invoice.state) {
			case "draft":
				status = "draft";
				break;
			case "open":
			case "pending":
				status = "sent";
				break;
			case "paid":
				status = "paid";
				break;
			case "late":
				status = "overdue";
				break;
			default:
				status = "sent";
		}

		return {
			externalId: invoice.id,
			status,
			pdfUrl: invoice.pdf_url ?? null,
			ublUrl: null, // Moneybird doesn't support UBL
			paymentUrl: invoice.payment_url ?? null,
			providerNumber: invoice.invoice_id ?? null,
		};
	}

	/**
	 * Fetch current invoice status and URLs from Moneybird
	 */
	async fetchSnapshot(externalId: string): Promise<ProviderInvoiceSnapshot> {
		if (!this.credentials.administration_id) {
			throw new Error("No Moneybird administration selected");
		}

		const invoice = await this.client.getSalesInvoice(
			this.credentials.administration_id,
			externalId,
		);

		// Map Moneybird status to our internal status
		let status: ProviderInvoiceStatus = "sent";
		switch (invoice.state) {
			case "draft":
				status = "draft";
				break;
			case "open":
			case "pending":
				status = "sent";
				break;
			case "paid":
				status = "paid";
				break;
			case "late":
				status = "overdue";
				break;
			default:
				status = "sent";
		}

		return {
			externalId: invoice.id,
			status,
			pdfUrl: invoice.pdf_url ?? null,
			ublUrl: null, // Moneybird doesn't support UBL
			paymentUrl: invoice.payment_url ?? null,
			providerNumber: invoice.invoice_id ?? null,
		};
	}
}
