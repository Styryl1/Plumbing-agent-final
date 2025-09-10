"use client";

import {
	CheckCircle2,
	Copy,
	MessageSquare,
	Phone,
	RefreshCw,
	Send,
	Shield,
	XCircle,
} from "lucide-react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/lib/trpc/client";

const TOTAL_STEPS = 3;

export default function WhatsAppSettingsPage(): JSX.Element {
	const t = useTranslations("settings.whatsapp");
	const [currentStep, setCurrentStep] = useState(1);
	const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

	// Fetch settings
	const { data: settings, refetch: refetchSettings } =
		api.whatsappSettings.getSettings.useQuery();

	// Form state for adding numbers
	const [phoneNumberId, setPhoneNumberId] = useState("");
	const [label, setLabel] = useState<"customer" | "control">("customer");

	// Mutations
	const mapNumberMutation = api.whatsappSettings.mapNumber.useMutation({
		onSuccess: () => {
			toast.success(t("numbers.add.success"));
			setPhoneNumberId("");
			void refetchSettings();
		},
		onError: (error) => {
			toast.error(`${t("numbers.add.error")}: ${error.message}`);
		},
	});

	const removeNumberMutation = api.whatsappSettings.removeNumber.useMutation({
		onSuccess: () => {
			toast.success(t("numbers.remove.success"));
			void refetchSettings();
		},
		onError: (error) => {
			toast.error(`${t("numbers.remove.error")}: ${error.message}`);
		},
	});

	const sendTestMutation = api.whatsappSettings.sendTest.useMutation({
		onSuccess: () => {
			toast.success(t("test.success.message"));
		},
		onError: (error) => {
			const errorKey = error.message.includes("Control number not mapped")
				? "test.error.noControl"
				: error.message.includes("No control conversation")
					? "test.error.noConversation"
					: error.message.includes("WhatsApp API error")
						? "test.error.apiError"
						: "test.error.unknown";
			toast.error(t(errorKey));
		},
	});

	const handleCopyUrl = async (url: string, label: string): Promise<void> => {
		await navigator.clipboard.writeText(url);
		setCopiedUrl(label);
		toast.success(t("prereqs.webhookUrls.copied"));
		setTimeout(() => {
			setCopiedUrl(null);
		}, 2000);
	};

	const handleAddNumber = async (): Promise<void> => {
		if (!phoneNumberId.trim()) return;

		await mapNumberMutation.mutateAsync({
			phoneNumberId: phoneNumberId.trim(),
			label,
		});
	};

	const handleRemoveNumber = async (
		labelToRemove: "customer" | "control",
	): Promise<void> => {
		if (confirm(t("numbers.remove.confirm"))) {
			await removeNumberMutation.mutateAsync({ label: labelToRemove });
		}
	};

	const handleSendTest = async (): Promise<void> => {
		await sendTestMutation.mutateAsync();
	};

	const canProceedToStep = (step: number): boolean => {
		if (!settings) return false;

		switch (step) {
			case 2:
				// Can proceed to step 2 if prerequisites are met
				return settings.verifyTokenConfigured && settings.hmacConfigured;
			case 3:
				// Can proceed to step 3 if at least one number is mapped
				return settings.mappedNumbers.length > 0;
			default:
				return true;
		}
	};

	const StatusIcon = ({ configured }: { configured: boolean }): JSX.Element => {
		return configured ? (
			<CheckCircle2 className="h-5 w-5 text-green-500" />
		) : (
			<XCircle className="h-5 w-5 text-red-500" />
		);
	};

	if (!settings) {
		return (
			<div className="container max-w-4xl py-8 space-y-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	return (
		<div className="container max-w-4xl py-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">{t("title")}</h1>
					<p className="text-muted-foreground mt-2">{t("subtitle")}</p>
				</div>
			</div>

			{/* Step Indicator */}
			<div className="flex items-center justify-between mb-8">
				{[1, 2, 3].map((step) => (
					<div key={step} className="flex items-center">
						<div
							className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
								step <= currentStep
									? "bg-primary text-primary-foreground border-primary"
									: "border-muted-foreground/30 text-muted-foreground"
							}`}
						>
							{step}
						</div>
						{step < TOTAL_STEPS && (
							<div
								className={`w-24 h-0.5 mx-4 ${
									step < currentStep ? "bg-primary" : "bg-muted-foreground/30"
								}`}
							/>
						)}
					</div>
				))}
			</div>

			<div className="text-center mb-6">
				<p className="text-sm text-muted-foreground">
					{t("wizard.step", { current: currentStep, total: TOTAL_STEPS })}
				</p>
			</div>

			{/* Step 1: Prerequisites */}
			{currentStep === 1 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							{t("prereqs.title")}
						</CardTitle>
						<CardDescription>{t("prereqs.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Webhook URLs */}
						<div>
							<h3 className="font-semibold mb-3">
								{t("prereqs.webhookUrls.title")}
							</h3>
							<p className="text-sm text-muted-foreground mb-4">
								{t("prereqs.webhookUrls.description")}
							</p>
							<div className="space-y-3">
								<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
									<div className="flex-1">
										<Label className="text-xs font-medium">
											{t("prereqs.webhookUrls.customer")}
										</Label>
										<code className="text-sm block mt-1 break-all">
											{settings.customerWebhookUrl}
										</code>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={async () =>
											handleCopyUrl(settings.customerWebhookUrl, "customer")
										}
									>
										{copiedUrl === "customer" ? (
											<CheckCircle2 className="h-4 w-4" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
								<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
									<div className="flex-1">
										<Label className="text-xs font-medium">
											{t("prereqs.webhookUrls.control")}
										</Label>
										<code className="text-sm block mt-1 break-all">
											{settings.controlWebhookUrl}
										</code>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={async () =>
											handleCopyUrl(settings.controlWebhookUrl, "control")
										}
									>
										{copiedUrl === "control" ? (
											<CheckCircle2 className="h-4 w-4" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>
						</div>

						{/* API Credentials */}
						<div>
							<h3 className="font-semibold mb-3">
								{t("prereqs.credentials.title")}
							</h3>
							<p className="text-sm text-muted-foreground mb-4">
								{t("prereqs.credentials.description")}
							</p>
							<div className="space-y-3">
								<div className="flex items-center justify-between p-3 border rounded-lg">
									<div className="flex items-center gap-3">
										<StatusIcon configured={settings.verifyTokenConfigured} />
										<span>{t("prereqs.credentials.verifyToken")}</span>
									</div>
									<Badge
										variant={
											settings.verifyTokenConfigured ? "default" : "destructive"
										}
									>
										{settings.verifyTokenConfigured
											? t("prereqs.credentials.configured")
											: t("prereqs.credentials.missing")}
									</Badge>
								</div>
								<div className="flex items-center justify-between p-3 border rounded-lg">
									<div className="flex items-center gap-3">
										<StatusIcon configured={settings.hmacConfigured} />
										<span>{t("prereqs.credentials.hmacSecret")}</span>
									</div>
									<Badge
										variant={
											settings.hmacConfigured ? "default" : "destructive"
										}
									>
										{settings.hmacConfigured
											? t("prereqs.credentials.configured")
											: t("prereqs.credentials.missing")}
									</Badge>
								</div>
							</div>
							<p className="text-xs text-muted-foreground mt-3">
								{t("prereqs.credentials.note")}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Step 2: Phone Numbers */}
			{currentStep === 2 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Phone className="h-5 w-5" />
							{t("numbers.title")}
						</CardTitle>
						<CardDescription>{t("numbers.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Current Numbers */}
						<div>
							<h3 className="font-semibold mb-3">{t("numbers.title")}</h3>
							{settings.mappedNumbers.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p>{t("numbers.empty.title")}</p>
									<p className="text-sm">{t("numbers.empty.description")}</p>
								</div>
							) : (
								<div className="space-y-2">
									{settings.mappedNumbers.map((number) => (
										<div
											key={number.phoneNumberId}
											className="flex items-center justify-between p-3 border rounded-lg"
										>
											<div className="flex items-center gap-3">
												<Badge
													variant={
														number.label === "customer"
															? "default"
															: "secondary"
													}
												>
													{t("numbers.labels.select", { label: number.label })}
												</Badge>
												<code className="text-sm">{number.phoneNumberId}</code>
											</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => handleRemoveNumber(number.label)}
											>
												{t("numbers.table.actions")}
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Add Number Form */}
						<div className="border-t pt-6">
							<h3 className="font-semibold mb-3">{t("numbers.add.title")}</h3>
							<div className="space-y-3">
								<div>
									<Label htmlFor="phoneNumberId">
										{t("numbers.add.phoneNumberId.label")}
									</Label>
									<Input
										id="phoneNumberId"
										value={phoneNumberId}
										onChange={(e) => {
											setPhoneNumberId(e.target.value);
										}}
										placeholder={t("numbers.add.phoneNumberId.placeholder")}
										className="mt-1"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										{t("numbers.add.phoneNumberId.helper")}
									</p>
								</div>
								<div>
									<Label htmlFor="label">{t("numbers.add.label.label")}</Label>
									<Select
										value={label}
										onValueChange={(value) => {
											setLabel(value as "customer" | "control");
										}}
									>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="customer">
												{t("numbers.labels.customer")}
											</SelectItem>
											<SelectItem value="control">
												{t("numbers.labels.control")}
											</SelectItem>
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground mt-1">
										{t("numbers.add.label.helper")}
									</p>
								</div>
								<Button
									onClick={handleAddNumber}
									disabled={
										!phoneNumberId.trim() || mapNumberMutation.isPending
									}
									className="w-full"
								>
									{mapNumberMutation.isPending ? (
										<RefreshCw className="h-4 w-4 animate-spin mr-2" />
									) : null}
									{t("numbers.add.submit")}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Step 3: Test */}
			{currentStep === 3 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MessageSquare className="h-5 w-5" />
							{t("test.title")}
						</CardTitle>
						<CardDescription>{t("test.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Requirements */}
						<div>
							<h3 className="font-semibold mb-3">
								{t("test.requirements.title")}
							</h3>
							<ul className="text-sm space-y-2">
								{(t.raw("test.requirements.items") as string[]).map(
									(item, index) => (
										<li key={index} className="flex items-start gap-2">
											<CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
											{item}
										</li>
									),
								)}
							</ul>
						</div>

						{/* Test Button */}
						<div className="text-center">
							<Button
								size="lg"
								onClick={handleSendTest}
								disabled={
									sendTestMutation.isPending ||
									settings.mappedNumbers.filter((n) => n.label === "control")
										.length === 0
								}
							>
								{sendTestMutation.isPending ? (
									<RefreshCw className="h-4 w-4 animate-spin mr-2" />
								) : (
									<Send className="h-4 w-4 mr-2" />
								)}
								{t("test.button")}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Navigation */}
			<div className="flex justify-between">
				<Button
					variant="outline"
					onClick={() => {
						setCurrentStep(Math.max(1, currentStep - 1));
					}}
					disabled={currentStep === 1}
				>
					{t("wizard.previous")}
				</Button>
				<Button
					onClick={() => {
						if (currentStep === TOTAL_STEPS) {
							// Wizard complete
							toast.success(t("completion.description"));
						} else {
							setCurrentStep(Math.min(TOTAL_STEPS, currentStep + 1));
						}
					}}
					disabled={
						!canProceedToStep(currentStep + 1) && currentStep < TOTAL_STEPS
					}
				>
					{currentStep === TOTAL_STEPS ? t("wizard.finish") : t("wizard.next")}
				</Button>
			</div>
		</div>
	);
}
