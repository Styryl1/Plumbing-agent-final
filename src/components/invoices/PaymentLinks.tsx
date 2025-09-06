"use client";

import { Copy, CreditCard, ExternalLink, FileText } from "lucide-react";
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

interface PaymentLinksProps {
	paymentUrl?: string | null | undefined;
	pdfUrl?: string | null | undefined;
	invoiceId: string;
}

/**
 * Component for payment and PDF links
 * Shows provider PaymentURL when available, fallback to Mollie checkout
 */
export function PaymentLinks({
	paymentUrl,
	pdfUrl,
	invoiceId,
}: PaymentLinksProps): JSX.Element {
	const t = useT();
	const [isCreatingPayment, setIsCreatingPayment] = useState(false);

	const createPaymentMutation = api.invoices.createPaymentLink.useMutation({
		onSuccess: (result) => {
			// Open Mollie checkout in new tab
			window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
			toast.success(t("payment.mollieCreated"));
		},
		onError: (error) => {
			toast.error(t("payment.mollieFailed"), {
				description: error.message,
			});
		},
		onSettled: () => {
			setIsCreatingPayment(false);
		},
	});

	const handleCopyUrl = async (
		url: string,
		type: "payment" | "pdf",
	): Promise<void> => {
		try {
			await navigator.clipboard.writeText(url);
			const message =
				type === "payment"
					? t("payment.paymentCopied")
					: t("payment.pdfCopied");
			toast.success(message);
		} catch {
			toast.error(t("payment.copyFailed"));
		}
	};

	const handleCreateMolliePayment = (): void => {
		setIsCreatingPayment(true);
		createPaymentMutation.mutate({ invoiceId });
	};

	// Don't show if no links are available and can't create Mollie payment
	if (!paymentUrl && !pdfUrl) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("payment.links")}</CardTitle>
					<CardDescription>{t("payment.noLinksAvailable")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">
						{t("payment.noLinksDescription")}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("payment.links")}</CardTitle>
				<CardDescription>{t("payment.linksDescription")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Provider Payment URL (preferred) */}
				{paymentUrl ? (
					<div className="space-y-2">
						<div className="flex gap-2">
							<Button asChild className="flex-1" size="sm">
								<a
									href={paymentUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2"
								>
									<CreditCard className="h-4 w-4" />
									{t("payment.payOnline")}
									<ExternalLink className="h-3 w-3" />
								</a>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={async () => {
									await handleCopyUrl(paymentUrl, "payment");
								}}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							{t("payment.providerPayment")}
						</p>
					</div>
				) : (
					/* Mollie Fallback */
					<div className="space-y-2">
						<Button
							onClick={handleCreateMolliePayment}
							disabled={isCreatingPayment}
							className="w-full"
							size="sm"
							variant="outline"
						>
							<CreditCard className="mr-2 h-4 w-4" />
							{isCreatingPayment
								? t("payment.creatingMollie")
								: t("payment.openMollieCheckout")}
						</Button>
						<p className="text-xs text-muted-foreground">
							{t("payment.molliePayment")}
						</p>
					</div>
				)}

				{/* PDF Download Link */}
				{pdfUrl && (
					<div className="space-y-2">
						<div className="flex gap-2">
							<Button asChild variant="outline" className="flex-1" size="sm">
								<a
									href={pdfUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2"
								>
									<FileText className="h-4 w-4" />
									{t("payment.viewPdf")}
									<ExternalLink className="h-3 w-3" />
								</a>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={async () => {
									await handleCopyUrl(pdfUrl, "pdf");
								}}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							{t("payment.pdfDescription")}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
