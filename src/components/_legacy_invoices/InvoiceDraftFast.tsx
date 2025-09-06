"use client";

import {
	AlertTriangle,
	ArrowRight,
	CheckCircle,
	Edit3,
	Mic,
	MicOff,
	Volume2,
	XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect, useState } from "react";
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
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { assertNonNullish } from "~/lib/assert";
import {
	DUTCH_LINE_ITEM_TYPES,
	DUTCH_PAYMENT_TERMS,
	formatMoney,
} from "~/lib/invoice-format";
import { logger } from "~/lib/log";
import { api } from "~/lib/trpc/client";
import { cn } from "~/lib/utils";

interface InvoiceDraftFastProps {
	draftId: string;
	onSend?: () => void;
	onCancel?: () => void;
	onSwitchToSafe?: () => void;
}

interface VoiceConfirmationState {
	isActive: boolean;
	isListening: boolean;
	currentStep: "review" | "confirm" | "changes" | "final";
	confidence: number;
	lastCommand?: string;
}

export function InvoiceDraftFast({
	draftId,
	onSend,
	onCancel,
	onSwitchToSafe,
}: InvoiceDraftFastProps): JSX.Element {
	const t = useTranslations();
	const [voiceState, setVoiceState] = useState<VoiceConfirmationState>({
		isActive: false,
		isListening: false,
		currentStep: "review",
		confidence: 0,
	});
	const [reviewComplete, setReviewComplete] = useState(false);
	const [autoAdvanceTimer, setAutoAdvanceTimer] =
		useState<NodeJS.Timeout | null>(null);
	const [requestedChanges, setRequestedChanges] = useState("");

	// Fetch draft data
	const {
		data: draft,
		isLoading,
		error,
	} = api.invoices.getDraft.useQuery({ id: draftId });

	// Voice summary confirm mutation
	const voiceSummaryConfirmMutation =
		api.invoices.voiceSummaryConfirm.useMutation({
			onSuccess: (result) => {
				if (result.success) {
					toast.success(result.message);
				} else {
					toast.error(result.message);
				}
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

	// Send invoice mutation
	const sendInvoiceMutation = api.invoices.send.useMutation({
		onSuccess: (result) => {
			toast.success(t("invoices.sendSuccess", { number: result.number }));
			onSend?.();
		},
		onError: (error) => {
			toast.error(error.message || t("invoices.sendError"));
		},
	});

	// Auto-advance timer for voice mode
	useEffect(() => {
		const speakSummaryInEffect = (): void => {
			if (typeof window === "undefined") return;

			assertNonNullish(draft, "TTS: draft missing for voice synthesis");

			const totalAmount = formatMoney(draft.totalIncVat);
			const lineCount = draft.items.length;
			const summaryText = `Factuur overzicht: ${lineCount} regels, totaal ${totalAmount}. Goedkeuren of wijzigingen nodig?`;

			const utterance = new SpeechSynthesisUtterance(summaryText);
			utterance.lang = "nl-NL";
			utterance.rate = 0.9;
			window.speechSynthesis.speak(utterance);
		};

		if (voiceState.isActive && voiceState.currentStep === "review") {
			const timer = setTimeout(() => {
				setVoiceState((prev) => ({ ...prev, currentStep: "confirm" }));
				speakSummaryInEffect();
			}, 5000); // 5 seconds to review

			setAutoAdvanceTimer(timer);

			return () => {
				clearTimeout(timer);
			};
		}
		return () => {}; // Empty cleanup for when condition is false
	}, [
		voiceState.isActive,
		voiceState.currentStep,
		draft,
		draft?.totalIncVat,
		draft?.items.length,
	]);

	// Cleanup timer
	useEffect(() => {
		return () => {
			if (autoAdvanceTimer != null) {
				clearTimeout(autoAdvanceTimer);
			}
		};
	}, [autoAdvanceTimer]);

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

	if (error != null || !draft) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{t("invoices.errors.loadFailed")}</AlertDescription>
			</Alert>
		);
	}

	const startVoiceMode = (): void => {
		setVoiceState({
			isActive: true,
			isListening: false,
			currentStep: "review",
			confidence: 0,
		});
	};

	const stopVoiceMode = (): void => {
		setVoiceState({
			isActive: false,
			isListening: false,
			currentStep: "review",
			confidence: 0,
		});

		if (autoAdvanceTimer != null) {
			clearTimeout(autoAdvanceTimer);
			setAutoAdvanceTimer(null);
		}
	};

	const handleVoiceApprove = async (): Promise<void> => {
		try {
			await voiceSummaryConfirmMutation.mutateAsync({
				invoiceId: draftId,
				approved: true,
			});
			setVoiceState((prev) => ({ ...prev, currentStep: "final" }));
			setReviewComplete(true);
		} catch (error) {
			logger.error("Voice approve failed", { draftId, error });
		}
	};

	const handleVoiceRequestChanges = async (): Promise<void> => {
		try {
			await voiceSummaryConfirmMutation.mutateAsync({
				invoiceId: draftId,
				approved: false,
				feedback: requestedChanges,
			});
			logger.info("Voice changes requested", {
				draftId,
				feedback: requestedChanges,
			});
		} catch (error) {
			logger.error("Voice request changes failed", { draftId, error });
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

	const getProgressPercentage = (): number => {
		switch (voiceState.currentStep) {
			case "review":
				return 25;
			case "confirm":
				return 50;
			case "changes":
				return 75;
			case "final":
				return 100;
			default:
				return 0;
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{t("invoices.draft.fastMode.title")}
							<Badge
								variant="secondary"
								className="bg-orange-100 text-orange-800"
							>
								{t("invoices.draft.fastMode.badge")}
							</Badge>
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{t("invoices.draft.fastMode.description")}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={onSwitchToSafe}>
							<Edit3 className="h-4 w-4" />
							{t("invoices.draft.switchToSafe")}
						</Button>
						<Button
							variant={voiceState.isActive ? "default" : "outline"}
							size="sm"
							onClick={voiceState.isActive ? stopVoiceMode : startVoiceMode}
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

			{/* Voice Mode Progress */}
			{voiceState.isActive && (
				<Card className="border-primary bg-primary/5">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Volume2 className="h-5 w-5" />
								{t("invoices.voiceMode.active")}
							</CardTitle>
							<Badge variant="outline">
								{t(`invoices.voiceMode.steps.${voiceState.currentStep}`)}
							</Badge>
						</div>
						<Progress value={getProgressPercentage()} className="w-full" />
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{voiceState.currentStep === "review" && (
								<div className="text-center">
									<p className="text-lg font-medium mb-2">
										{t("invoices.voiceMode.reviewing")}
									</p>
									<div className="animate-pulse">
										<div className="w-8 h-8 mx-auto rounded-full bg-primary/20" />
									</div>
								</div>
							)}

							{voiceState.currentStep === "confirm" && (
								<div className="space-y-4">
									<p className="text-center text-lg font-medium">
										{t("invoices.voiceMode.confirmPrompt")}
									</p>
									<div className="flex justify-center gap-4">
										<Button
											onClick={handleVoiceApprove}
											className="bg-green-600 hover:bg-green-700"
										>
											<CheckCircle className="h-4 w-4 mr-2" />
											{t("invoices.voiceMode.approve")}
										</Button>
										<Button
											variant="outline"
											onClick={() => {
												setVoiceState((prev) => ({
													...prev,
													currentStep: "changes",
												}));
											}}
											className="border-orange-500 text-orange-600 hover:bg-orange-50"
										>
											<XCircle className="h-4 w-4 mr-2" />
											{t("invoices.voiceMode.requestChanges")}
										</Button>
									</div>
								</div>
							)}

							{voiceState.currentStep === "changes" && (
								<div className="space-y-4">
									<Alert>
										<AlertTriangle className="h-4 w-4" />
										<AlertDescription>
											{t("invoices.voiceMode.changesRequested")}
										</AlertDescription>
									</Alert>
									<div>
										<Label htmlFor="changes-notes">
											{t("invoices.voiceMode.changesNotes")}
										</Label>
										<Textarea
											id="changes-notes"
											value={requestedChanges}
											onChange={(e) => {
												setRequestedChanges(e.target.value);
											}}
											placeholder={t("invoices.voiceMode.changesPlaceholder")}
											rows={3}
										/>
									</div>
									<div className="flex justify-center gap-2">
										<Button onClick={handleVoiceRequestChanges}>
											{t("invoices.voiceMode.submitChanges")}
										</Button>
										<Button variant="outline" onClick={onSwitchToSafe}>
											{t("invoices.draft.switchToSafe")}
										</Button>
									</div>
								</div>
							)}

							{voiceState.currentStep === "final" && (
								<div className="text-center space-y-4">
									<div className="flex items-center justify-center">
										<CheckCircle className="h-12 w-12 text-green-600" />
									</div>
									<p className="text-lg font-medium text-green-700">
										{t("invoices.voiceMode.approved")}
									</p>
									<Button onClick={handleSendInvoice} size="lg">
										<ArrowRight className="h-4 w-4 mr-2" />
										{t("invoices.actions.send")}
									</Button>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Summary View */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.summary.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Quick Stats */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 bg-blue-50 rounded-lg">
							<div className="text-2xl font-bold text-blue-600">
								{draft.items.length}
							</div>
							<div className="text-sm text-blue-800">
								{t("invoices.summary.lineItems")}
							</div>
						</div>
						<div className="text-center p-4 bg-green-50 rounded-lg">
							<div className="text-2xl font-bold text-green-600">
								{formatMoney(draft.totalIncVat)}
							</div>
							<div className="text-sm text-green-800">
								{t("invoices.summary.totalAmount")}
							</div>
						</div>
						<div className="text-center p-4 bg-purple-50 rounded-lg">
							<div className="text-2xl font-bold text-purple-600">
								{DUTCH_PAYMENT_TERMS[draft.paymentTerms]}
							</div>
							<div className="text-sm text-purple-800">
								{t("invoices.summary.paymentTerms")}
							</div>
						</div>
					</div>

					{/* Line Items Summary */}
					<div className="space-y-2">
						<h4 className="font-medium">{t("invoices.lineItems.summary")}</h4>
						{draft.items.map((item, index) => (
							<div
								key={item.id ?? index}
								className="flex justify-between items-center p-3 bg-gray-50 rounded"
							>
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="text-xs">
										{item.lineType === "labor"
											? DUTCH_LINE_ITEM_TYPES.labor
											: DUTCH_LINE_ITEM_TYPES.material}
									</Badge>
									<span className="font-medium">{item.description}</span>
									<span className="text-sm text-muted-foreground">
										{t("invoices.lineItems.multiplier", {
											qty: item.qty,
											price: formatMoney(item.unitPriceExVat ?? 0),
										})}
									</span>
								</div>
								<span className="font-medium">
									{formatMoney(item.lineTotalIncVat ?? 0)}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Totals Breakdown */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.totals.breakdown")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex justify-between text-lg">
							<span>{t("invoices.totals.subtotal")}</span>
							<span>{formatMoney(draft.subtotalExVat)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{t("invoices.totals.vat")}
							</span>
							<span className="text-muted-foreground">
								{formatMoney(draft.totalVatAmount)}
							</span>
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

			{/* Additional Information */}
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

			{/* Actions */}
			<Card>
				<CardFooter className="flex justify-between">
					<Button variant="outline" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
					<div className="flex gap-2">
						{!voiceState.isActive && !reviewComplete && (
							<Button
								variant="outline"
								onClick={() => {
									setReviewComplete(true);
								}}
							>
								{t("invoices.actions.markReviewed")}
							</Button>
						)}
						<Button
							onClick={handleSendInvoice}
							disabled={
								(!reviewComplete && !voiceState.isActive) ||
								draft.items.length === 0
							}
							className={cn(
								reviewComplete || voiceState.currentStep === "final"
									? "bg-green-600 hover:bg-green-700"
									: "",
							)}
						>
							<ArrowRight className="h-4 w-4" />
							{t("invoices.actions.send")}
						</Button>
					</div>
				</CardFooter>
			</Card>

			{/* Warning for Fast Mode */}
			<Alert className="border-orange-200 bg-orange-50">
				<AlertTriangle className="h-4 w-4 text-orange-600" />
				<AlertDescription className="text-orange-800">
					{t("invoices.draft.fastMode.warning")}
				</AlertDescription>
			</Alert>
		</div>
	);
}
