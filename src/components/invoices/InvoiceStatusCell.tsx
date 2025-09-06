// V2 Invoice Status Cell - Enhanced status display with provider information
// Shows both invoice status and provider badges for comprehensive state visibility

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import type { InvoiceProvider } from "~/schema/invoice";
import ProviderBadge from "./ProviderBadge";

interface InvoiceStatusCellProps {
	status: string;
	provider?: InvoiceProvider | null;
	providerStatus?: string | null;
	isLegacy?: boolean;
	issuedAt?: string | null;
	paymentUrl?: string | null;
	pdfUrl?: string | null;
}

export function InvoiceStatusCell({
	status,
	provider,
	providerStatus,
	isLegacy = false,
	issuedAt,
	paymentUrl,
	pdfUrl,
}: InvoiceStatusCellProps): JSX.Element {
	const t = useTranslations("invoices");
	return (
		<div className="flex flex-col gap-1">
			{/* Primary Status Badge */}
			<ProviderBadge
				provider={provider}
				providerStatus={providerStatus ?? status}
				isLegacy={isLegacy}
				issuedAt={issuedAt}
			/>

			{/* Provider Actions (Future S4) */}
			{!isLegacy && (paymentUrl ?? pdfUrl) && (
				<div className="flex gap-1">
					{paymentUrl && (
						<a
							href={paymentUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-primary hover:underline"
						>
							{t("actions.pay")}
						</a>
					)}
					{pdfUrl && (
						<a
							href={pdfUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-muted-foreground hover:underline"
						>
							PDF
						</a>
					)}
				</div>
			)}
		</div>
	);
}
