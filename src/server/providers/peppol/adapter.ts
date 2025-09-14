import { useTranslations } from "next-intl";
import type {
	CreateDraftResult,
	FinalizeSendResult,
	InvoiceProvider,
	ProviderDraftInput,
	ProviderInvoiceSnapshot,
} from "../types";
import { ProviderInvoiceStatus } from "../types";

export class PeppolProvider implements InvoiceProvider {
	readonly id = "peppol" as const;
	supportsPaymentUrl = false;
	supportsUbl = true;

	async createDraft(input: ProviderDraftInput): Promise<CreateDraftResult> {
		const timestamp = Temporal.Now.instant().epochMilliseconds;
		// S2: input ignored in stub, will be used in S3+ for real provider integration
		void input;
		return Promise.resolve({ externalId: `stub:peppol:${timestamp}` });
	}

	async finalizeAndSend(externalId: string): Promise<FinalizeSendResult> {
		return Promise.resolve({
			externalId,
			status: ProviderInvoiceStatus.enum.sent,
			pdfUrl: null,
			ublUrl: null,
			paymentUrl: null,
			providerNumber: null,
		});
	}

	async fetchSnapshot(externalId: string): Promise<ProviderInvoiceSnapshot> {
		return Promise.resolve({
			externalId,
			status: ProviderInvoiceStatus.enum.draft,
			pdfUrl: null,
			ublUrl: null,
			paymentUrl: null,
			providerNumber: null,
		});
	}
}
