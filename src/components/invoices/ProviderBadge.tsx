// V2 Invoice Provider Badge - provider label/status chip with lock indicator
// NOTE: uses next-intl to avoid i18n literal strings
"use client";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import type { InvoiceProvider } from "~/schema/invoice";

interface ProviderBadgeProps {
	provider?: InvoiceProvider | null | undefined;
	providerStatus?: string | null | undefined;
	isLegacy?: boolean;
	issuedAt?: string | null | undefined;
	className?: string;
}

/**
 * Check if invoice is locked (post-send state)
 * Same logic as server-side isInvoiceLocked function
 */
function isInvoiceLocked(
	issuedAt?: string | null,
	providerStatus?: string | null,
): boolean {
	if (issuedAt != null) {
		return true;
	}

	const lockedStatuses = ["sent", "viewed", "paid", "overdue", "cancelled"];
	return providerStatus != null && lockedStatuses.includes(providerStatus);
}

// Labels come from translation files
// invoices.providers.moneybird | wefact | eboekhouden | peppol

export default function ProviderBadge({
	provider,
	providerStatus,
	isLegacy,
	issuedAt,
	className,
}: ProviderBadgeProps): React.JSX.Element {
	const t = useTranslations("invoices");
	const isLocked = isInvoiceLocked(issuedAt, providerStatus);

	if (isLegacy) {
		return (
			<Badge variant="outline" className={className ?? ""}>
				{t("badges.legacy")}
			</Badge>
		);
	}

	const providerLabel =
		provider != null ? t(`providers.${provider}`) : t("status.draft");
	// Allowed variants only; color nuance via className
	const variant: React.ComponentProps<typeof Badge>["variant"] =
		providerStatus === "paid" ? "secondary" : "default";

	const paidClassName =
		providerStatus === "paid"
			? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
			: "";

	const badge = (
		<Badge
			variant={variant}
			className={`${paidClassName} ${className ?? ""} ${isLocked ? "pl-2" : ""}`}
		>
			{isLocked && <Lock className="mr-1 h-3 w-3" />}
			{providerLabel}
			{providerStatus && ` • ${providerStatus}`}
		</Badge>
	);

	// S4: Show lock tooltip for locked invoices
	if (isLocked) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{badge}</TooltipTrigger>
					<TooltipContent>
						<p>{t("badges.locked_tooltip")}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return badge;
}
