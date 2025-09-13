"use client";

import {
	Copy,
	CreditCard,
	ExternalLink,
	FileText,
	MessageCircle,
} from "lucide-react";
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
	customerPhone?: string | null | undefined;
}

/**
 * Component for payment and PDF links
 * Shows provider PaymentURL when available, fallback to Mollie checkout
 */
export function PaymentLinks({
	paymentUrl,
	pdfUrl,
	invoiceId,
	customerPhone,
}: PaymentLinksProps): JSX.Element {
	const tPay = useT("payment");
	const tNote = useT("notifications");
	const tErr = useT("errors");
	const tAct = useT("actions");
	const tInv = useT("invoice");
	const [isCreatingPayment, setIsCreatingPayment] = useState(false);

	const createPaymentMutation = api.invoices.createPaymentLink.useMutation({
		onSuccess: (result) => {
			// Open Mollie checkout in new tab
			window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
			toast.success(tPay("mollieCreated"));
		},
		onError: (error) => {
			toast.error(tPay("mollieFailed"), {
				description: error.message,
			});
		},
		onSettled: () => {
			setIsCreatingPayment(false);
		},
	});

	const sendWhatsAppMutation = api.invoiceFlow.sendPaymentLink.useMutation({
		onSuccess: (result) => {
			toast.success(
				tNote("paymentLink.sent") +
					` (${result.mode === "session" ? "session" : "template"})`,
			);
		},
		onError: (error) => {
			toast.error(tErr("paymentLink.sendFailed") + ": " + error.message);
		},
	});

	const handleCopyUrl = async (
		url: string,
		type: "payment" | "pdf",
	): Promise<void> => {
		try {
			await navigator.clipboard.writeText(url);
			const message =
				type === "payment" ? tPay("paymentCopied") : tPay("pdfCopied");
			toast.success(message);
		} catch {
			toast.error(tPay("copyFailed"));
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
					<CardTitle>{tPay("links")}</CardTitle>
					<CardDescription>{tPay("noLinksAvailable")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">
						{tPay("noLinksDescription")}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{tPay("links")}</CardTitle>
				<CardDescription>{tPay("linksDescription")}</CardDescription>
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
									{tPay("payOnline")}
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
							{tPay("providerPayment")}
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
								? tPay("creatingMollie")
								: tPay("openMollieCheckout")}
						</Button>
						<p className="text-xs text-muted-foreground">
							{tPay("molliePayment")}
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
									{tPay("viewPdf")}
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
							{tPay("pdfDescription")}
						</p>
					</div>
				)}

				{/* WhatsApp Send Button - only show if payment URL and customer phone exist */}
				{paymentUrl && customerPhone && (
					<div className="space-y-2 border-t pt-3">
						<Button
							onClick={async () => {
								await sendWhatsAppMutation.mutateAsync({
									invoiceId,
									phoneE164: customerPhone,
									url: paymentUrl,
									locale: "nl",
								});
							}}
							disabled={sendWhatsAppMutation.isPending}
							className="w-full bg-green-600 hover:bg-green-700"
							size="sm"
						>
							<MessageCircle className="mr-2 h-4 w-4" />
							{sendWhatsAppMutation.isPending
								? tAct("sending")
								: tInv("actions.sendWhatsApp")}
						</Button>
						<p className="text-xs text-muted-foreground">
							{tInv("actions.sendWhatsAppDescription")}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
