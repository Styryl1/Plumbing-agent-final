"use client";
import { AlertTriangle, ExternalLink, Lock, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { api } from "~/lib/trpc/client";

interface IssueActionsProps {
	invoiceId: string;
	status: string;
	provider?: string | null | undefined;
	externalId?: string | null | undefined;
	issuedAt?: string | null | undefined;
}

/**
 * Component for issuing invoices via Moneybird
 * Shows "Issue via Moneybird" button for draft invoices
 */
export function IssueActions({
	invoiceId,
	status,
	provider,
	externalId,
	issuedAt,
}: IssueActionsProps): JSX.Element {
	const t = useTranslations();
	const [isIssuing, setIsIssuing] = useState(false);

	const utils = api.useUtils();

	// Get provider health status
	const { data: providerHealth, isLoading: isLoadingHealth } =
		api.providers.getHealth.useQuery(
			{ provider: provider as "moneybird" | "wefact" | "eboekhouden" },
			{
				enabled:
					!!provider &&
					["moneybird", "wefact", "eboekhouden"].includes(provider),
			},
		);

	// Use existing send mutation
	const sendMutation = api.invoices.send.useMutation({
		onSuccess: () => {
			toast.success(t("invoices.issuedSuccessfully"));
			// Revalidate invoice data
			void utils.invoices.getById.invalidate({ id: invoiceId });
		},
		onError: (error) => {
			toast.error(t("invoices.issueFailed"), {
				description: error.message,
			});
		},
		onSettled: () => {
			setIsIssuing(false);
		},
	});

	// Determine if invoice is locked (post-send state)
	const isLocked =
		issuedAt != null ||
		status === "sent" ||
		status === "paid" ||
		["sent", "viewed", "paid", "overdue", "cancelled"].includes(status);

	// Show lock state for already sent invoices
	if (isLocked) {
		return (
			<Card className="border-muted bg-muted/20">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Lock className="h-4 w-4 text-muted-foreground" />
							{t("invoices.issueActions")}
						</CardTitle>
						{provider && (
							<Badge variant="secondary" className="bg-primary/10 text-primary">
								{t("invoices.lockedBadge", { provider })}
							</Badge>
						)}
					</div>
					<CardDescription>{t("invoices.lockedDescription")}</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="text-sm text-muted-foreground">
						{t("invoices.providerPdfNote")}
					</div>
				</CardContent>
			</Card>
		);
	}

	// Don't show for invoices without external_id (haven't been drafted via provider yet)
	if (!provider || !externalId) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.issueActions")}</CardTitle>
					<CardDescription>{t("invoices.needsProvider")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">
						{t("invoices.needsProviderDescription")}
					</div>
				</CardContent>
			</Card>
		);
	}

	// Show provider health warning if not ok
	if (providerHealth && providerHealth.status !== "ok") {
		const isInvalidToken = providerHealth.status === "invalid_token";
		const isNotConnected = providerHealth.status === "not_connected";

		return (
			<Card className="border-orange-200 bg-orange-50/50">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-orange-600" />
							{t("invoices.issueActions")}
						</CardTitle>
						<Badge
							variant="outline"
							className="border-orange-200 text-orange-700"
						>
							{isInvalidToken
								? t("providers.moneybird.health.invalid_token")
								: isNotConnected
									? t("providers.moneybird.health.not_connected")
									: t("providers.states.error")}
						</Badge>
					</div>
					<CardDescription>
						{isInvalidToken
							? "Provider token has expired. Please reconnect to continue."
							: isNotConnected
								? "Provider is not connected. Please connect to continue."
								: "Provider connection issue. Please check settings."}
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					<Button
						variant="outline"
						className="flex items-center gap-2"
						onClick={() => window.open("/settings/providers", "_blank")}
					>
						<ExternalLink className="h-4 w-4" />
						{isInvalidToken ? "Reconnect Provider" : "Connect Provider"}
					</Button>
				</CardContent>
			</Card>
		);
	}

	const handleIssue = (): void => {
		setIsIssuing(true);
		sendMutation.mutate({ invoiceId });
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{t("invoices.issueActions")}</CardTitle>
						<CardDescription>
							{t("invoices.issueActionsDescription")}
						</CardDescription>
					</div>
					{providerHealth && provider && (
						<Badge variant="default" className="ml-2">
							{provider.charAt(0).toUpperCase() + provider.slice(1)}{" "}
							{t("providers.states.connected")}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<Button
					onClick={handleIssue}
					disabled={
						isIssuing || isLoadingHealth || providerHealth?.status !== "ok"
					}
					className="w-full"
					size="lg"
				>
					<Send className="mr-2 h-4 w-4" />
					{isIssuing ? t("invoices.issuing") : t("invoices.issueViaMoneybird")}
				</Button>
				<p className="mt-2 text-xs text-muted-foreground">
					{t("invoices.issueViaProviderNote")}
				</p>
			</CardContent>
		</Card>
	);
}
