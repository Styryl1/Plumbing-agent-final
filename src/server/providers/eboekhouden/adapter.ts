import "server-only";
import "~/lib/time";
import type {
	CreateDraftResult,
	FinalizeSendResult,
	InvoiceProvider,
	ProviderDraftInput,
	ProviderInvoiceSnapshot,
} from "../types";
import { EBoekhoudenClient, type EBoekhoudenContact } from "./client";
import { mapEBoekhoudenStatus } from "./status-map";

export class EBoekhoudenProvider implements InvoiceProvider {
	readonly id = "eboekhouden" as const;
	supportsPaymentUrl = false; // e-Boekhouden doesn't provide direct payment URLs
	supportsUbl = false; // e-Boekhouden doesn't support UBL export

	constructor(
		private readonly orgId: string,
		private readonly userId: string,
	) {}

	/**
	 * Create or find contact (relatie/debtor) in e-Boekhouden
	 */
	private async createOrFindContact(
		customer: ProviderDraftInput["customer"],
	): Promise<EBoekhoudenContact> {
		const client = new EBoekhoudenClient(this.orgId);

		// First try to find existing contact by email
		if (customer.email && customer.email.length > 0) {
			try {
				const existingContacts = await client.searchContacts(customer.email);
				if (existingContacts.length > 0) {
					return existingContacts[0]!;
				}
			} catch (error) {
				// Search failed, continue to create new contact
				console.warn("e-Boekhouden contact search by email failed:", error);
			}
		}

		// Try searching by company name
		if (customer.name.length > 0) {
			try {
				const existingContacts = await client.searchContacts(customer.name);
				if (existingContacts.length > 0) {
					// Check for email match if provided
					const matchingContact =
						customer.email && customer.email.length > 0
							? existingContacts.find(
									(c) =>
										c.Email?.toLowerCase() === customer.email?.toLowerCase(),
								)
							: existingContacts[0];

					if (matchingContact) {
						return matchingContact;
					}
				}
			} catch (error) {
				// Search failed, continue to create new contact
				console.warn("e-Boekhouden contact search by name failed:", error);
			}
		}

		// No existing contact found, create new one
		const contactData: Parameters<typeof client.createContact>[0] = {};

		// Only add defined values to satisfy exactOptionalPropertyTypes
		if (customer.name.length > 0) contactData.Bedrijf = customer.name;
		if (customer.email && customer.email.length > 0)
			contactData.Email = customer.email;
		if (customer.addressLine1 && customer.addressLine1.length > 0)
			contactData.Adres = customer.addressLine1;
		if (customer.postalCode && customer.postalCode.length > 0)
			contactData.Postcode = customer.postalCode;
		if (customer.city && customer.city.length > 0)
			contactData.Plaats = customer.city;
		contactData.Land =
			customer.country && customer.country.length > 0 ? customer.country : "NL"; // Default to Netherlands

		const newContact = await client.createContact(contactData);

		return newContact;
	}

	/**
	 * Create draft invoice in e-Boekhouden
	 */
	async createDraft(input: ProviderDraftInput): Promise<CreateDraftResult> {
		// Find or create the contact
		const contact = await this.createOrFindContact(input.customer);

		// Convert lines from cents to decimal euros (e-Boekhouden expects decimal strings)
		const invoiceLines = input.lines.map((line) => ({
			Omschrijving: line.description,
			Aantal: line.quantity,
			Eenheidsprijs: (line.unitPriceCents / 100).toFixed(2), // Convert cents to euros with 2 decimals
			BTWPercentage: line.vatRate, // Direct mapping (0, 9, or 21)
			Totaal: ((line.quantity * line.unitPriceCents) / 100).toFixed(2), // Line total
		}));

		// Use current date if not specified
		const invoiceDate = input.issueDateISO
			? input.issueDateISO.split("T")[0]! // Extract date part, guaranteed to exist
			: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
					.toPlainDate()
					.toString();

		const invoiceData = {
			Relatiecode: contact.Code,
			Datum: invoiceDate,
			Betalingstermijn: 30, // 30-day payment terms (standard Dutch practice)
			Regels: invoiceLines,
		};

		const client = new EBoekhoudenClient(this.orgId);
		const invoice = await client.createInvoice(invoiceData);

		return {
			externalId: invoice.Factuurnummer,
		};
	}

	/**
	 * Send invoice via e-Boekhouden
	 */
	async finalizeAndSend(externalId: string): Promise<FinalizeSendResult> {
		const client = new EBoekhoudenClient(this.orgId);

		// Send invoice by email
		await client.sendInvoice(externalId);

		// Fetch updated invoice to get current status and metadata
		const invoice = await client.getInvoice(externalId);

		// Download PDF and create storage URL (simplified for now)
		let pdfUrl: string | null = null;
		try {
			const pdfBase64 = await client.downloadInvoicePdf(externalId);
			// TODO: Upload to storage service and return signed URL
			// For now, we'll indicate PDF is available but not provide URL
			pdfUrl = pdfBase64.length > 0 ? "eboekhouden:pdf-available" : null;
		} catch (error) {
			// PDF download failure shouldn't block send operation
			console.warn("Failed to download e-Boekhouden PDF:", error);
		}

		return {
			externalId,
			status: mapEBoekhoudenStatus(invoice.Status),
			pdfUrl,
			ublUrl: null, // e-Boekhouden doesn't support UBL
			paymentUrl: null, // e-Boekhouden doesn't provide direct payment URLs
			providerNumber:
				invoice.Factuurnummer.length > 0 ? invoice.Factuurnummer : null,
		};
	}

	/**
	 * Fetch current status and metadata from e-Boekhouden
	 */
	async fetchSnapshot(externalId: string): Promise<ProviderInvoiceSnapshot> {
		const client = new EBoekhoudenClient(this.orgId);
		const invoice = await client.getInvoice(externalId);

		// Check if PDF is available
		let pdfUrl: string | null = null;
		try {
			const pdfBase64 = await client.downloadInvoicePdf(externalId);
			pdfUrl = pdfBase64.length > 0 ? "eboekhouden:pdf-available" : null;
		} catch {
			// PDF not available or error occurred
			pdfUrl = null;
		}

		return {
			externalId,
			status: mapEBoekhoudenStatus(invoice.Status),
			pdfUrl,
			ublUrl: null,
			paymentUrl: null,
			providerNumber:
				invoice.Factuurnummer.length > 0 ? invoice.Factuurnummer : null,
		};
	}
}
