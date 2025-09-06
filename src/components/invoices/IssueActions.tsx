"use client";

import { Send } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
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

	// Don't show for already sent invoices
	if (status === "sent" || status === "paid") {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("invoice.issueActions")}</CardTitle>
					<CardDescription>{t("invoice.alreadyIssued")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">
						{t("invoice.alreadyIssuedDescription")}
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
