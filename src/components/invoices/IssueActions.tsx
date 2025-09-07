"use client";

import { Lock, Send } from "lucide-react";
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
import { useT } from "~/i18n/client";
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
	const t = useT();
	const [isIssuing, setIsIssuing] = useState(false);

	const utils = api.useUtils();

	// Use existing send mutation
	const sendMutation = api.invoices.send.useMutation({
		onSuccess: () => {
			toast.success(t("invoice.issuedSuccessfully"));
			// Revalidate invoice data
			void utils.invoices.getById.invalidate({ id: invoiceId });
		},
		onError: (error) => {
			toast.error(t("invoice.issueFailed"), {
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
							{t("invoice.issueActions")}
						</CardTitle>
						{provider && (
							<Badge variant="secondary" className="bg-primary/10 text-primary">
								{t("invoice.lockedBadge", { provider })}
							</Badge>
						)}
					</div>
					<CardDescription>{t("invoice.lockedDescription")}</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="text-sm text-muted-foreground">
						{t("invoice.providerPdfNote")}
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
					<CardTitle>{t("invoice.issueActions")}</CardTitle>
					<CardDescription>{t("invoice.needsProvider")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">
						{t("invoice.needsProviderDescription")}
					</div>
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
				<CardTitle>{t("invoice.issueActions")}</CardTitle>
				<CardDescription>
					{t("invoice.issueActionsDescription")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button
					onClick={handleIssue}
					disabled={isIssuing}
					className="w-full"
					size="lg"
				>
					<Send className="mr-2 h-4 w-4" />
					{isIssuing ? t("invoice.issuing") : t("invoice.issueViaMoneybird")}
				</Button>
				<p className="mt-2 text-xs text-muted-foreground">
					{t("invoice.issueViaProviderNote")}
				</p>
			</CardContent>
		</Card>
	);
}
