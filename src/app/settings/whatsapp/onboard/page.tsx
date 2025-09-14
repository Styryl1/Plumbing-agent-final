"use client";

import {
	ArrowLeft,
	ArrowRight,
	CheckCircle2,
	Copy,
	ExternalLink,
	Phone,
	Send,
	Shield,
	Wifi,
} from "lucide-react";
import Link from "next/link";
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
import { Separator } from "~/components/ui/separator";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";

type Step = "prereqs" | "numbers" | "test" | "done";

export default function WhatsAppOnboardPage(): JSX.Element {
	const t = useT("settings.whatsapp.onboard");
	const tHealth = useT("misc.health");

	// Wizard state
	const [currentStep, setCurrentStep] = useState<Step>("prereqs");

	// Form state
	const [businessId, setBusinessId] = useState("");
	const [controlId, setControlId] = useState("");
	const [testPhone, setTestPhone] = useState("");
	const [testMessage, setTestMessage] = useState("");

	// Health and numbers data
	const { data: health } = api.waAdmin.health.useQuery();
	const { data: numbers, refetch: refetchNumbers } =
		api.waAdmin.listNumbers.useQuery();

	// Mutations
	const seedMutation = api.waAdmin.seedTwoNumbers.useMutation({
		onSuccess: () => {
			toast.success(t("numbers.success"));
			void refetchNumbers();
			setCurrentStep("test");
		},
		onError: (error) => {
			toast.error(`${t("numbers.error")}: ${error.message}`);
		},
	});

	const sendMessageMutation = api.waAdmin.sendTestMessage.useMutation({
		onSuccess: (result) => {
			toast.success(`${t("test.success")}: ${result.message}`);
			setCurrentStep("done");
		},
		onError: (error) => {
			toast.error(`${t("test.error")}: ${error.message}`);
		},
	});

	// Copy to clipboard helper
	const copyToClipboard = async (
		text: string,
		label: string,
	): Promise<void> => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copied to clipboard`);
		} catch {
			toast.error("Failed to copy to clipboard");
		}
	};

	// Navigation helpers
	const goNext = (): void => {
		switch (currentStep) {
			case "prereqs":
				setCurrentStep("numbers");
				break;
			case "numbers":
				setCurrentStep("test");
				break;
			case "test":
				setCurrentStep("done");
				break;
		}
	};

	const goBack = (): void => {
		switch (currentStep) {
			case "numbers":
				setCurrentStep("prereqs");
				break;
			case "test":
				setCurrentStep("numbers");
				break;
			case "done":
				setCurrentStep("test");
				break;
		}
	};

	// Handle form submissions
	const handleSeedNumbers = async (): Promise<void> => {
		if (!businessId.trim() || !controlId.trim()) {
			toast.error(t("numbers.validation"));
			return;
		}

		await seedMutation.mutateAsync({
			businessId: businessId.trim(),
			controlId: controlId.trim(),
		});
	};

	const handleTestMessage = async (): Promise<void> => {
		if (!testPhone.trim()) {
			toast.error(t("test.validation"));
			return;
		}

		await sendMessageMutation.mutateAsync({
			to: testPhone.trim(),
			message: testMessage.trim() || undefined,
		});
	};

	// Step progress indicator
	const steps: Array<{ id: Step; title: string }> = [
		{ id: "prereqs", title: t("steps.prereqs.title") },
		{ id: "numbers", title: t("steps.numbers.title") },
		{ id: "test", title: t("steps.test.title") },
		{ id: "done", title: t("steps.done.title") },
	];

	const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

	return (
		<div className="container max-w-2xl py-8">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-4">
					<Link href="/settings/whatsapp">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							{t("back")}
						</Button>
					</Link>
				</div>
				<h1 className="text-3xl font-bold">{t("title")}</h1>
				<p className="text-muted-foreground mt-2">{t("description")}</p>
			</div>

			{/* Progress Steps */}
			<div className="mb-8">
				<div className="flex justify-between items-center">
					{steps.map((step, index) => (
						<div key={step.id} className="flex flex-col items-center">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									index <= currentStepIndex
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground"
								}`}
							>
								{index < currentStepIndex ? (
									<CheckCircle2 className="h-4 w-4" />
								) : (
									index + 1
								)}
							</div>
							<span className="text-xs mt-1 text-center max-w-[80px]">
								{step.title}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Step Content */}
			{currentStep === "prereqs" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							{t("prereqs.title")}
						</CardTitle>
						<CardDescription>{t("prereqs.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{health && (
							<>
								{/* Webhook URL */}
								<div className="space-y-2">
									<Label>{t("prereqs.webhookUrl")}</Label>
									<div className="flex gap-2">
										<Input
											value={health.webhookUrl ?? ""}
											readOnly
											className="font-mono text-sm"
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												if (health.webhookUrl) {
													void copyToClipboard(
														health.webhookUrl,
														"Webhook URL",
													);
												}
											}}
											disabled={!health.webhookUrl}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
									<p className="text-xs text-muted-foreground">
										{t("prereqs.webhookHelp")}
									</p>
								</div>

								{/* Verify Token */}
								<div className="space-y-2">
									<Label>{t("prereqs.verifyToken")}</Label>
									<div className="flex gap-2">
										<Input
											value={health.verifyToken ?? ""}
											readOnly
											className="font-mono text-sm"
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												if (health.verifyToken) {
													void copyToClipboard(
														health.verifyToken,
														"Verify token",
													);
												}
											}}
											disabled={!health.verifyToken}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
									<p className="text-xs text-muted-foreground">
										{t("prereqs.tokenHelp")}
									</p>
								</div>

								<Separator />

								{/* Health Status */}
								<div className="space-y-3">
									<h4 className="font-medium">{tHealth("title")}</h4>

									<div className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex items-center gap-3">
											{health.secretOk ? (
												<CheckCircle2 className="h-5 w-5 text-green-500" />
											) : (
												<div className="h-5 w-5 rounded-full bg-red-500" />
											)}
											<span className="font-medium">{tHealth("secret")}</span>
										</div>
										<Badge
											variant={health.secretOk ? "default" : "destructive"}
										>
											{health.secretOk ? tHealth("ok") : tHealth("missing")}
										</Badge>
									</div>

									<div className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex items-center gap-3">
											{health.webhookOk ? (
												<CheckCircle2 className="h-5 w-5 text-green-500" />
											) : (
												<div className="h-5 w-5 rounded-full bg-red-500" />
											)}
											<span className="font-medium">{tHealth("webhook")}</span>
										</div>
										<Badge
											variant={health.webhookOk ? "default" : "destructive"}
										>
											{health.webhookOk
												? tHealth("ok")
												: tHealth("unreachable")}
										</Badge>
									</div>
								</div>
							</>
						)}

						<div className="flex justify-end pt-4">
							<Button
								onClick={goNext}
								disabled={!health || !health.secretOk || !health.webhookOk}
							>
								{t("next")}
								<ArrowRight className="h-4 w-4 ml-2" />
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{currentStep === "numbers" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Phone className="h-5 w-5" />
							{t("numbers.title")}
						</CardTitle>
						<CardDescription>{t("numbers.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<Label htmlFor="businessId">{t("numbers.businessLabel")}</Label>
								<Input
									id="businessId"
									value={businessId}
									onChange={(e) => {
										setBusinessId(e.target.value);
									}}
									placeholder="15550123456"
									className="mt-1"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{t("numbers.businessHelp")}
								</p>
							</div>

							<div>
								<Label htmlFor="controlId">{t("numbers.controlLabel")}</Label>
								<Input
									id="controlId"
									value={controlId}
									onChange={(e) => {
										setControlId(e.target.value);
									}}
									placeholder="15550987654"
									className="mt-1"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{t("numbers.controlHelp")}
								</p>
							</div>
						</div>

						<div className="flex justify-between pt-4">
							<Button
								onClick={() => {
									goBack();
								}}
								variant="outline"
							>
								<ArrowLeft className="h-4 w-4 mr-2" />
								{t("back")}
							</Button>
							<Button
								onClick={() => {
									void handleSeedNumbers();
								}}
								disabled={
									seedMutation.isPending ||
									!businessId.trim() ||
									!controlId.trim()
								}
							>
								{seedMutation.isPending && (
									<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								)}
								{t("numbers.save")}
								<ArrowRight className="h-4 w-4 ml-2" />
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{currentStep === "test" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Send className="h-5 w-5" />
							{t("test.title")}
						</CardTitle>
						<CardDescription>{t("test.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<Label htmlFor="testPhone">{t("test.phoneLabel")}</Label>
								<Input
									id="testPhone"
									value={testPhone}
									onChange={(e) => {
										setTestPhone(e.target.value);
									}}
									placeholder="+31 6 XX XX XX XX"
									className="mt-1"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{t("test.phoneHelp")}
								</p>
							</div>

							<div>
								<Label htmlFor="testMessage">{t("test.messageLabel")}</Label>
								<Input
									id="testMessage"
									value={testMessage}
									onChange={(e) => {
										setTestMessage(e.target.value);
									}}
									placeholder={t("test.messagePlaceholder")}
									className="mt-1"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{t("test.messageHelp")}
								</p>
							</div>
						</div>

						{/* Current Numbers Display */}
						{numbers && numbers.items.length > 0 && (
							<div className="border rounded-lg p-3 bg-muted/50">
								<h4 className="text-sm font-medium mb-2">
									{t("test.configured")}
								</h4>
								<div className="space-y-1">
									{numbers.items.map((num) => (
										<div
											key={num.phoneNumberId}
											className="flex items-center gap-2 text-sm"
										>
											<Badge
												variant={
													num.label === "business" ? "default" : "secondary"
												}
												className="text-xs"
											>
												{num.label}
											</Badge>
											<code className="text-xs">{num.phoneNumberId}</code>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="flex justify-between pt-4">
							<Button
								onClick={() => {
									goBack();
								}}
								variant="outline"
							>
								<ArrowLeft className="h-4 w-4 mr-2" />
								{t("back")}
							</Button>
							<Button
								onClick={() => {
									void handleTestMessage();
								}}
								disabled={sendMessageMutation.isPending || !testPhone.trim()}
							>
								{sendMessageMutation.isPending && (
									<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								)}
								<Send className="h-4 w-4 mr-2" />
								{t("test.send")}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{currentStep === "done" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-green-500" />
							{t("done.title")}
						</CardTitle>
						<CardDescription>{t("done.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-center py-6">
							<Wifi className="h-12 w-12 mx-auto text-green-500 mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								{t("done.success")}
							</h3>
							<p className="text-muted-foreground mb-4">
								{t("done.successDescription")}
							</p>
						</div>

						{/* Health Summary */}
						{health && (
							<div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
								<h4 className="font-medium text-green-800 dark:text-green-200 mb-3">
									{t("done.healthSummary")}
								</h4>
								<div className="grid grid-cols-3 gap-4 text-sm">
									<div className="text-center">
										<CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
										<div className="text-green-700 dark:text-green-300">
											{t("done.environment")}
										</div>
									</div>
									<div className="text-center">
										<CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
										<div className="text-green-700 dark:text-green-300">
											{t("done.webhook")}
										</div>
									</div>
									<div className="text-center">
										<CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
										<div className="text-green-700 dark:text-green-300">
											{t("done.security")}
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="flex justify-center pt-4">
							<Button asChild>
								<Link href="/settings/whatsapp">
									<ExternalLink className="h-4 w-4 mr-2" />
									{t("done.goToSettings")}
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
