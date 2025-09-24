"use client";

import {
	CheckCircle,
	BanknoteIcon as Euro,
	Loader2,
	Plus,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { api } from "~/lib/trpc/client";

interface ActionsRailProps {
	conversationId: string;
}

export function ActionsRail({ conversationId }: ActionsRailProps): JSX.Element {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const [isCreatingJob, setIsCreatingJob] = useState(false);
	const [showPaylinkDialog, setShowPaylinkDialog] = useState(false);
	const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
		null,
	);

	const toggleStatusMutation = api.whatsapp.toggleStatus.useMutation();

	// Fetch conversation details to check if linked to customer/job/invoice
	const { data: conversationsData } = api.whatsapp.listConversations.useQuery({
		limit: 50,
	});

	const conversation = conversationsData?.items.find(
		(c) => c.conversation_id === conversationId,
	);
	const customerId = conversation?.customer_id ?? null;

	const { data: sendableInvoices, isLoading: invoicesLoading } =
		api.invoiceFlow.listSendableByCustomer.useQuery(
			{ customerId: customerId! },
			{ enabled: Boolean(customerId) },
		);

	const invoices = useMemo(
		() => sendableInvoices?.invoices ?? [],
		[sendableInvoices],
	);

	const sendPaymentLinkMutation = api.invoiceFlow.sendPaymentLink.useMutation({
		onSuccess: (result) => {
			const modeKey =
				result.mode === "session"
					? t("whatsapp.actions.paylinkSentSession")
					: t("whatsapp.actions.paylinkSentTemplate");
			toast.success(t("whatsapp.actions.paylinkSent"), {
				description: modeKey,
			});
			setShowPaylinkDialog(false);
		},
		onError: (error) => {
			toast.error(t("whatsapp.actions.paylinkError"), {
				description: error.message,
			});
		},
	});

	const approveSuggestionMutation =
		api.whatsapp.approveLatestSuggestion.useMutation({
			onSuccess: (result) => {
				const description = result.jobCardUrl
					? t("whatsapp.control.approveJobCreated")
					: undefined;
				const action = result.jobCardUrl
					? {
							label: t("whatsapp.control.openJobCard"),
							onClick: () => {
								window.open(result.jobCardUrl, "_blank", "noopener,noreferrer");
							},
						}
					: undefined;
				toast.success(t("whatsapp.control.approveSuccess"), {
					description,
					action,
				});
			},
			onError: (error) => {
				const description =
					error.data?.code === "NOT_FOUND"
						? t("whatsapp.control.approveNoSuggestion")
						: error.message;
				toast.error(t("whatsapp.control.approveError"), {
					description,
				});
			},
		});

	const currencyFormatter = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				style: "currency",
				currency: "EUR",
			}),
		[locale],
	);

	const selectedInvoice = useMemo(() => {
		if (!selectedInvoiceId) {
			return undefined;
		}
		return invoices.find((invoice) => invoice.id === selectedInvoiceId);
	}, [invoices, selectedInvoiceId]);

	const selectedInvoiceProviderLabel = useMemo(() => {
		if (!selectedInvoice?.provider) {
			return null;
		}
		return (
			selectedInvoice.provider.charAt(0).toUpperCase() +
			selectedInvoice.provider.slice(1)
		);
	}, [selectedInvoice]);

	const selectedInvoiceDueLabel = useMemo(() => {
		if (!selectedInvoice?.dueAt) {
			return null;
		}
		try {
			return globalThis.Temporal.Instant.from(selectedInvoice.dueAt)
				.toZonedDateTimeISO("Europe/Amsterdam")
				.toLocaleString(locale, { dateStyle: "medium" });
		} catch {
			return null;
		}
	}, [selectedInvoice, locale]);

	const handleCreateJob = (): void => {
		setIsCreatingJob(true);
		try {
			// For now, navigate to job creation page with query params
			// In a full implementation, this would call jobs.createFromConversation
			const searchParams = new URLSearchParams({
				source: "whatsapp",
				conversationId,
				phone: conversation?.phone_number ?? "",
				name: "", // No customer name available in current structure
			});

			router.push(`/jobs/create?${searchParams.toString()}`);
			toast.success(t("whatsapp.actions.jobCreated"));
		} catch (error) {
			console.error("Failed to create job:", error);
			toast.error(t("whatsapp.actions.jobError"));
		} finally {
			setIsCreatingJob(false);
		}
	};

	const handleSendPaylink = (): void => {
		if (!conversation) {
			return;
		}

		if (!conversation.phone_number) {
			toast.error(t("whatsapp.actions.paylinkNoPhone"));
			return;
		}

		if (!conversation.customer_id) {
			toast.error(t("whatsapp.actions.paylinkNoCustomer"));
			return;
		}

		if (invoicesLoading) {
			return;
		}

		if (invoices.length === 0) {
			toast.error(t("whatsapp.actions.paylinkNoInvoices"));
			return;
		}

		setSelectedInvoiceId(invoices[0]?.id ?? null);
		setShowPaylinkDialog(true);
	};

	const handleConfirmPaylink = async (): Promise<void> => {
		const targetInvoice = invoices.find(
			(invoice) => invoice.id === selectedInvoiceId,
		);
		if (!targetInvoice) {
			toast.error(t("whatsapp.actions.paylinkSelectInvoiceError"));
			return;
		}

		const phone = conversation?.phone_number;
		if (!phone) {
			toast.error(t("whatsapp.actions.paylinkNoPhone"));
			return;
		}

		const invoiceLocale = locale.startsWith("nl") ? "nl" : "en";

		await sendPaymentLinkMutation.mutateAsync({
			invoiceId: targetInvoice.id,
			phoneE164: phone,
			url:
				targetInvoice.paymentUrl ??
				targetInvoice.mollieCheckoutUrl ??
				undefined,
			locale: invoiceLocale,
		});
	};

	const handleCloseConversation = async (): Promise<void> => {
		try {
			await toggleStatusMutation.mutateAsync({
				conversationId,
				status: "closed",
			});

			toast.success(t("whatsapp.actions.conversationClosed"));
			router.push("/whatsapp");
		} catch (error) {
			console.error("Failed to close conversation:", error);
			toast.error(t("whatsapp.actions.closeError"));
		}
	};

	const handleApprove = (): void => {
		approveSuggestionMutation.mutate({
			conversationId,
		});
	};

	return (
		<div className="space-y-4">
			{/* Primary Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{t("whatsapp.actions.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button
						onClick={handleCreateJob}
						disabled={isCreatingJob}
						className="w-full justify-start"
						variant="outline"
					>
						{isCreatingJob ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Plus className="h-4 w-4 mr-2" />
						)}
						{t("whatsapp.actions.createJob")}
					</Button>

					<Button
						onClick={handleSendPaylink}
						disabled={invoicesLoading || sendPaymentLinkMutation.isPending}
						className="w-full justify-start"
						variant="outline"
					>
						{sendPaymentLinkMutation.isPending ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Euro className="h-4 w-4 mr-2" />
						)}
						{t("whatsapp.actions.sendPaylink")}
					</Button>

					<Separator />

					<Button
						onClick={() => void handleCloseConversation()}
						disabled={toggleStatusMutation.isPending}
						className="w-full justify-start"
						variant="destructive"
					>
						{toggleStatusMutation.isPending ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<X className="h-4 w-4 mr-2" />
						)}
						{t("whatsapp.actions.close")}
					</Button>
				</CardContent>
			</Card>

			{/* Control Chat */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{t("whatsapp.control.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">
						{t("whatsapp.control.description")}
					</p>

					<div className="flex gap-2">
						<Button
							onClick={handleApprove}
							size="sm"
							variant="outline"
							className="flex-1"
							disabled={approveSuggestionMutation.isPending}
						>
							<CheckCircle className="h-3 w-3 mr-1" />
							{approveSuggestionMutation.isPending
								? t("whatsapp.control.approving")
								: t("whatsapp.control.approve")}
						</Button>

						<Button
							onClick={() => void handleCloseConversation()}
							size="sm"
							variant="outline"
							className="flex-1"
						>
							<X className="h-3 w-3 mr-1" />
							{t("whatsapp.control.close")}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Conversation Info */}
			{conversation && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">
							{t("whatsapp.info.title")}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-xs">
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{t("whatsapp.info.status")}
							</span>
							<span>{conversation.status ?? t("common.unknown")}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{t("whatsapp.info.created")}
							</span>
							<span>
								{conversation.last_message_at
									? globalThis.Temporal.Instant.from(
											conversation.last_message_at,
										)
											.toZonedDateTimeISO("Europe/Amsterdam")
											.toLocaleString("nl-NL", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
											})
									: t("common.unknown")}
							</span>
						</div>
					</CardContent>
				</Card>
			)}
			<AlertDialog open={showPaylinkDialog} onOpenChange={setShowPaylinkDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("whatsapp.actions.paylinkDialogTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("whatsapp.actions.paylinkDialogDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{invoices.length > 1 && (
						<Select
							value={selectedInvoiceId ?? ""}
							onValueChange={(value) => {
								setSelectedInvoiceId(value);
							}}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t("whatsapp.actions.paylinkSelectInvoice")}
								/>
							</SelectTrigger>
							<SelectContent>
								{invoices.map((invoice) => (
									<SelectItem key={invoice.id} value={invoice.id}>
										{t("whatsapp.actions.paylinkInvoiceLabel", {
											number: invoice.number,
										})}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					{selectedInvoice && (
						<div className="mt-3 space-y-2 rounded-md border p-3 text-sm">
							<div className="font-medium">
								{t("whatsapp.actions.paylinkInvoiceSummary", {
									number: selectedInvoice.number,
									amount: currencyFormatter.format(
										selectedInvoice.totalAmountCents / 100,
									),
								})}
							</div>
							{selectedInvoiceDueLabel && (
								<div className="text-muted-foreground">
									{t("whatsapp.actions.paylinkInvoiceDue", {
										date: selectedInvoiceDueLabel,
									})}
								</div>
							)}
							{selectedInvoiceProviderLabel && (
								<div className="text-muted-foreground">
									{t("whatsapp.actions.paylinkInvoiceProvider", {
										provider: selectedInvoiceProviderLabel,
									})}
								</div>
							)}
						</div>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								if (!sendPaymentLinkMutation.isPending) {
									setShowPaylinkDialog(false);
								}
							}}
						>
							{t("common.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void handleConfirmPaylink()}
							disabled={sendPaymentLinkMutation.isPending || !selectedInvoice}
						>
							{sendPaymentLinkMutation.isPending
								? t("whatsapp.actions.paylinkSending")
								: t("whatsapp.actions.paylinkConfirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
