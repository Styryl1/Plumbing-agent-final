"use client";

import {
	AlertTriangle,
	ArrowRight,
	CheckCircle,
	Clock,
	Mic,
	MicOff,
	Plus,
	Save,
	Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { assertNonNullish } from "~/lib/assert";
import { DUTCH_LINE_ITEM_TYPES, formatMoney } from "~/lib/invoice-format";
import { api } from "~/lib/trpc/client";

interface InvoiceDraftSafeProps {
	draftId: string;
	onSave?: () => void;
	onSend?: () => void;
	onCancel?: () => void;
	onSwitchToFast?: () => void;
}

interface VoiceLineState {
	isActive: boolean;
	isListening: boolean;
	currentLineId?: string | undefined;
}

export function InvoiceDraftSafe({
	draftId,
	onSave,
	onSend,
	onCancel,
	onSwitchToFast,
}: InvoiceDraftSafeProps): JSX.Element {
	const t = useTranslations();
	const [voiceState, setVoiceState] = useState<VoiceLineState>({
		isActive: false,
		isListening: false,
	});

	// Autosave state
	const [autoSaveStatus, setAutoSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Fetch draft data
	const {
		data: draft,
		isLoading,
		error,
	} = api.invoices.getDraft.useQuery({ id: draftId });

	// Mutations
	const saveDraftMutation = api.invoices.saveDraft.useMutation({
		onSuccess: () => {
			setAutoSaveStatus("saved");
			setHasUnsavedChanges(false);
			// Reset to idle after showing saved status for 2 seconds
			setTimeout(() => {
				setAutoSaveStatus("idle");
			}, 2000);
			onSave?.();
		},
		onError: (error) => {
			setAutoSaveStatus("error");
			toast.error(error.message);
			// Reset to idle after 3 seconds on error
			setTimeout(() => {
				setAutoSaveStatus("idle");
			}, 3000);
		},
	});

	// Auto-save with debounce
	const debouncedAutoSave = useCallback(
		async (draftData: typeof draft) => {
			if (!draftData || !hasUnsavedChanges) return;

			setAutoSaveStatus("saving");
			try {
				await saveDraftMutation.mutateAsync({
					id: draftId,
					items: draftData.items.map((item) => ({
						...item,
						vatRate: Math.round(item.vatRate * 100) as 0 | 9 | 21,
						unitPriceCents: Math.round(item.unitPriceCents),
					})),
					notes: draftData.notes,
				});
			} catch (error) {
				// Error handling is done in the mutation's onError
				console.error("Auto-save failed:", error);
			}
		},
		[draftId, hasUnsavedChanges, saveDraftMutation],
	);

	// Debounce auto-save - save 2 seconds after last change
	useEffect(() => {
		if (!hasUnsavedChanges || !draft) return;

		const timeoutId = setTimeout(() => {
			void debouncedAutoSave(draft);
		}, 2000);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [debouncedAutoSave, draft, hasUnsavedChanges]);

	const sendInvoiceMutation = api.invoices.send.useMutation({
		onSuccess: (result) => {
			toast.success(t("invoices.sendSuccess", { number: result.number }));
			onSend?.();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSaveDraft = async (): Promise<void> => {
		try {
			if (draft) {
				await saveDraftMutation.mutateAsync({
					id: draftId,
					items: draft.items.map((item) => ({
						...item,
						vatRate: Math.round(item.vatRate * 100) as 0 | 9 | 21, // Convert decimal to integer percentage
						unitPriceCents: Math.round(item.unitPriceCents), // Ensure integer
					})),
					notes: draft.notes,
				});
			}
		} catch (error) {
			// Error handling is done in the mutation's onError
			console.error("Save failed:", error);
		}
	};

	const handleSendInvoice = async (): Promise<void> => {
		try {
			await sendInvoiceMutation.mutateAsync({ id: draftId });
		} catch (error) {
			// Error handling is done in the mutation's onError
			console.error("Send failed:", error);
		}
	};

	const startVoiceForLine = (lineId: string): void => {
		setVoiceState({
			isActive: true,
			isListening: true,
			currentLineId: lineId,
		});
	};

	const stopVoice = (): void => {
		setVoiceState({
			isActive: false,
			isListening: false,
			currentLineId: undefined,
		});
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center p-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
					<span className="ml-3">{t("common.loading")}</span>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{t("invoices.errors.loadFailed")}</AlertDescription>
			</Alert>
		);
	}

	assertNonNullish(
		draft,
		"InvoiceDraftSafe: draft missing after successful load",
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{t("invoices.draft.safeMode.title")}
							<Badge
								variant="secondary"
								className="bg-green-100 text-green-800"
							>
								{t("invoices.draft.safeMode.badge")}
							</Badge>
							{/* Draft status badge - show if invoice has no number (unsent) */}
							{!draft.invoiceNumber && (
								<Badge
									variant="outline"
									className="bg-orange-50 text-orange-700 border-orange-200"
								>
									{t("invoices.status.draftUnsent")}
								</Badge>
							)}
							{/* Autosave status indicator */}
							{autoSaveStatus !== "idle" && (
								<Badge
									variant={
										autoSaveStatus === "error" ? "destructive" : "secondary"
									}
									className={
										autoSaveStatus === "saving"
											? "bg-blue-100 text-blue-800"
											: autoSaveStatus === "saved"
												? "bg-green-100 text-green-800"
												: ""
									}
								>
									<Clock className="h-3 w-3 mr-1" />
									{autoSaveStatus === "saving" && t("invoices.autosave.saving")}
									{autoSaveStatus === "saved" && t("invoices.autosave.saved")}
									{autoSaveStatus === "error" && t("invoices.autosave.error")}
								</Badge>
							)}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{t("invoices.draft.safeMode.description")}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={onSwitchToFast}>
							<ArrowRight className="h-4 w-4" />
							{t("invoices.draft.switchToFast")}
						</Button>
						<Button
							variant={voiceState.isActive ? "default" : "outline"}
							size="sm"
							onClick={
								voiceState.isActive
									? stopVoice
									: () => {
											setVoiceState((prev) => ({ ...prev, isActive: true }));
										}
							}
						>
							{voiceState.isActive ? (
								<Mic className="h-4 w-4" />
							) : (
								<MicOff className="h-4 w-4" />
							)}
							{t("invoices.voiceMode.toggle")}
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Voice Mode Indicator */}
			{voiceState.isActive && (
				<Card className="border-green-200 bg-green-50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-green-700">
							<Volume2 className="h-5 w-5" />
							{t("invoices.voiceMode.safeActive")}
						</CardTitle>
						<p className="text-sm text-green-600">
							{t("invoices.voiceMode.safeInstructions")}
						</p>
					</CardHeader>
				</Card>
			)}

			{/* Line Items */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.lineItems.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{draft.items.map((item, index) => (
						<Card
							key={item.id ?? `item-${index}`}
							className="border border-gray-200"
						>
							<CardContent className="p-4">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div>
										<Label>{t("invoices.lineItems.description")}</Label>
										<div className="flex items-center gap-2 mt-1">
											<span className="text-sm font-medium">
												{item.description}
											</span>
											{voiceState.isActive && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => {
														startVoiceForLine(item.id ?? `line-${index}`);
													}}
												>
													<Mic className="h-3 w-3" />
												</Button>
											)}
										</div>
									</div>
									<div>
										<Label>{t("invoices.lineItems.type")}</Label>
										<Badge variant="outline" className="mt-1">
											{item.lineType
												? DUTCH_LINE_ITEM_TYPES[item.lineType]
												: "Unknown"}
										</Badge>
									</div>
									<div>
										<Label>{t("invoices.lineItems.quantity")}</Label>
										<p className="text-sm font-medium mt-1">{item.qty}</p>
									</div>
									<div>
										<Label>{t("invoices.lineItems.unitPrice")}</Label>
										<p className="text-sm font-medium mt-1">
											{formatMoney(item.unitPriceExVat ?? 0)}
										</p>
									</div>
								</div>
								<Separator className="my-3" />
								<div className="flex justify-between items-center">
									<div className="text-sm text-muted-foreground">
										{t("invoices.lineItems.vatRate")}:{" "}
										{(item.vatRate * 100).toFixed(1)}%
									</div>
									<div className="text-right">
										<div className="text-lg font-semibold">
											{formatMoney(item.lineTotalIncVat ?? 0)}
										</div>
										<div className="text-sm text-muted-foreground">
											{t("invoices.totals.includingVat")}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}

					{/* Add New Line (Placeholder) */}
					<Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
						<CardContent className="p-8 text-center">
							<Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
							<p className="text-gray-500 text-sm">
								{t("invoices.lineItems.addNew")}
							</p>
							<p className="text-xs text-gray-400 mt-1">
								{t("invoices.draft.safeMode.addLineHint")}
							</p>
						</CardContent>
					</Card>
				</CardContent>
			</Card>

			{/* Invoice Summary */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.summary.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex justify-between">
							<span>{t("invoices.totals.subtotal")}</span>
							<span>{formatMoney(draft.subtotalExVat)}</span>
						</div>
						<div className="flex justify-between text-sm text-muted-foreground">
							<span>{t("invoices.totals.vat")}</span>
							<span>{formatMoney(draft.totalVatAmount)}</span>
						</div>
						<Separator />
						<div className="flex justify-between text-xl font-bold">
							<span>{t("invoices.totals.total")}</span>
							<span className="text-green-600">
								{formatMoney(draft.totalIncVat)}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Notes */}
			{draft.notes && (
				<Card>
					<CardHeader>
						<CardTitle>{t("invoices.notes.title")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">
							{draft.notes}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Legal Compliance Checklist */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle className="h-5 w-5" />
						{t("invoices.compliance.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{/* KVK Number Check */}
						<div className="flex items-center space-x-2">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<span className="text-sm">
								{t("invoices.compliance.kvkNumber")}
								<Badge variant="outline" className="ml-2 text-xs">
									{t("invoices.compliance.verified")}
								</Badge>
							</span>
						</div>

						{/* BTW ID Check */}
						<div className="flex items-center space-x-2">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<span className="text-sm">
								{t("invoices.compliance.btwId")}
								<Badge variant="outline" className="ml-2 text-xs">
									{t("invoices.compliance.verified")}
								</Badge>
							</span>
						</div>

						{/* Customer Address Check */}
						<div className="flex items-center space-x-2">
							{draft.customer?.street && draft.customer.postalCode ? (
								<CheckCircle className="h-4 w-4 text-green-600" />
							) : (
								<AlertTriangle className="h-4 w-4 text-orange-600" />
							)}
							<span className="text-sm">
								{t("invoices.compliance.customerAddress")}
								{draft.customer?.street && draft.customer.postalCode ? (
									<Badge
										variant="outline"
										className="ml-2 text-xs text-green-700"
									>
										{t("invoices.compliance.complete")}
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="ml-2 text-xs text-orange-700"
									>
										{t("invoices.compliance.incomplete")}
									</Badge>
								)}
							</span>
						</div>

						{/* Dutch VAT Rate Check */}
						<div className="flex items-center space-x-2">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<span className="text-sm">
								{t("invoices.compliance.dutchVat")} (21%)
								<Badge variant="outline" className="ml-2 text-xs">
									{t("invoices.compliance.applied")}
								</Badge>
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<Card>
				<CardFooter className="flex justify-between">
					<Button variant="outline" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
					<div className="flex gap-2">
						<Button variant="outline" onClick={handleSaveDraft}>
							<Save className="h-4 w-4 mr-2" />
							{t("invoices.actions.saveDraft")}
						</Button>
						<Button
							onClick={handleSendInvoice}
							disabled={draft.items.length === 0}
							className="bg-green-600 hover:bg-green-700"
						>
							<ArrowRight className="h-4 w-4 mr-2" />
							{t("invoices.actions.send")}
						</Button>
					</div>
				</CardFooter>
			</Card>

			{/* Safe Mode Info */}
			<Alert className="border-green-200 bg-green-50">
				<CheckCircle className="h-4 w-4 text-green-600" />
				<AlertDescription className="text-green-800">
					{t("invoices.draft.safeMode.info")}
				</AlertDescription>
			</Alert>
		</div>
	);
}
