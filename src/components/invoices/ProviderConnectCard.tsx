"use client";

import { AlertCircle, CheckCircle, Settings, XCircle } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useProviderHealth } from "~/hooks/useProviderHealth";
import { useT } from "~/i18n/client";

type InvoiceProviderId = "moneybird" | "wefact" | "eboekhouden" | "peppol";

interface ProviderConnectCardProps {
	id: InvoiceProviderId;
}

/**
 * Single provider connection card showing state and connect/fix actions
 * Displays provider health status with appropriate actions
 */
export default function ProviderConnectCard({
	id,
}: ProviderConnectCardProps): JSX.Element {
	const t = useT("providers");
	const health = useProviderHealth(id);

	// Provider metadata
	const providerConfig = {
		moneybird: {
			name: "Moneybird",
			description: t("moneybird.description"),
			connectUrl: "/api/providers/moneybird/oauth/start",
		},
		wefact: {
			name: "WeFact",
			description: t("wefact.description"),
			connectUrl: "/providers/wefact/setup", // Would be implemented later
		},
		eboekhouden: {
			name: "e-Boekhouden.nl",
			description: t("eboekhouden.description"),
			connectUrl: "/providers/eboekhouden/setup", // Would be implemented later
		},
		peppol: {
			name: "Peppol",
			description: t("peppol.description"),
			connectUrl: "/providers/peppol/setup", // Would be implemented later
		},
	};

	const config = providerConfig[id];

	// Determine connection state
	const getConnectionState = (): {
		state: "connected" | "needs_action" | "error";
		icon: JSX.Element;
		actionText: string;
	} => {
		if (health.ok) {
			return {
				state: "connected",
				icon: <CheckCircle className="h-5 w-5 text-green-600" />,
				actionText: t("actions.configure"),
			};
		}

		if (health.message === "Checking...") {
			return {
				state: "needs_action",
				icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
				actionText: t("actions.connect"),
			};
		}

		return {
			state: "error",
			icon: <XCircle className="h-5 w-5 text-red-600" />,
			actionText: t("actions.fix"),
		};
	};

	const { state, icon, actionText } = getConnectionState();

	// Map state values to i18n keys to avoid dynamic template literals
	const stateKeys: Record<"connected" | "needs_action" | "error", string> = {
		connected: "states.connected",
		needs_action: "states.needs_action",
		error: "states.error",
	};

	return (
		<Card className="transition-all hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">{config.name}</CardTitle>
						<CardDescription className="mt-1">
							{config.description}
						</CardDescription>
					</div>
					{icon}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-3">
					{/* Health status */}
					<div className="text-sm">
						<span className="font-medium">{t(stateKeys[state])}:</span>{" "}
						<span className="text-muted-foreground">{health.message}</span>
					</div>

					{/* Action button */}
					<Link href={config.connectUrl} className="w-full">
						<Button variant="outline" className="w-full" size="sm">
							<Settings className="mr-2 h-4 w-4" />
							{actionText}
						</Button>
					</Link>

					{/* Additional info for connected providers */}
					{state === "connected" && (
						<div className="text-xs text-muted-foreground">
							{t("connected.description")}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
