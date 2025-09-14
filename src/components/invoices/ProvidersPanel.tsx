import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import ProviderConnectCard from "./ProviderConnectCard";

("use client");

type InvoiceProviderId = "moneybird" | "wefact" | "eboekhouden" | "peppol";

/**
 * Providers panel showing connection status for all invoice providers
 * Displays 4 providers with their connection state and action buttons
 */
export default function ProvidersPanel(): JSX.Element {
	const t = useTranslations();

	// Fixed list of supported providers for S1
	const providers: InvoiceProviderId[] = [
		"moneybird",
		"wefact",
		"eboekhouden",
		"peppol",
	];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Zap className="h-5 w-5 text-primary" />
					<div>
						<CardTitle>{t("providers.panel.title")}</CardTitle>
						<CardDescription>
							{t("providers.panel.description")}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					{providers.map((providerId) => (
						<ProviderConnectCard key={providerId} id={providerId} />
					))}
				</div>

				{/* Info note */}
				<div className="mt-4 p-3 rounded-lg bg-muted/50">
					<p className="text-sm text-muted-foreground">
						{t("providers.panel.note")}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
