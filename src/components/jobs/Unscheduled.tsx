"use client";
import { skipToken } from "@tanstack/react-query";
import {
	Clock,
	FileText,
	Gauge,
	Loader2,
	MessageSquare,
	Mic,
	Phone,
	Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
	ApplyDialog,
	type ApplyDialogContext,
	type ApplyMutationInput,
	showApplyErrorToast,
	showApplySuccessToast,
} from "~/components/intake/apply-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatDutchDate, formatDutchDateTime } from "~/lib/dates";
import { api } from "~/lib/trpc/client";
import type { AiRecommendationDTO } from "~/types/ai";
import type { IntakeDetailDTO, IntakeSummaryDTO } from "~/types/intake";

type JobPriority = "normal" | "urgent" | "emergency";

const formatBytes = (bytes?: number | null): string => {
	if (!bytes || bytes <= 0) return "0 B";
	const units = ["B", "kB", "MB", "GB"];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	const formatter = new Intl.NumberFormat("nl-NL", {
		maximumFractionDigits: value < 10 ? 1 : 0,
	});
	return `${formatter.format(value)} ${units[unitIndex]}`;
};

const formatDuration = (seconds?: number | null): string => {
	if (!seconds || seconds <= 0) return "0s";
	const totalSeconds = Math.round(seconds);
	const minutes = Math.floor(totalSeconds / 60);
	const remainingSeconds = totalSeconds % 60;
	if (minutes === 0) {
		return `${remainingSeconds}s`;
	}
	return remainingSeconds === 0
		? `${minutes}m`
		: `${minutes}m ${remainingSeconds}s`;
};

const mapIntakePriority = (value: string | null | undefined): JobPriority => {
	if (value === "emergency") return "emergency";
	if (value === "urgent") return "urgent";
	return "normal";
};

const isAiRecommendation = (value: unknown): value is AiRecommendationDTO => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Partial<AiRecommendationDTO>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.title === "string" &&
		typeof candidate.confidence === "number"
	);
};

interface Employee {
	id: string;
	name: string;
	color?: string | null;
}

interface UnscheduledProps {
	readonly employees: Employee[];
	readonly onJobCreated?: () => void;
}

interface WhatsAppLead {
	id: string;
	phone_e164: string;
	wa_name: string | null;
	wa_chat_id: string | null;
	customer_id: string | null;
	first_seen_at: string;
	last_seen_at: string;
	message_count: number;
	created_at: string;
	updated_at: string;
}

export default function Unscheduled({
	employees,
	onJobCreated,
}: UnscheduledProps): JSX.Element {
	const t = useTranslations();
	const translateRoot = (
		key: string,
		values?: Record<string, string | number>,
	): string => t(key as Parameters<typeof t>[0], values);
	const [isOpen, setIsOpen] = useState(false);
	const utils = api.useUtils();
	const [applyContext, setApplyContext] = useState<ApplyDialogContext | null>(
		null,
	);
	const [activeIntake, setActiveIntake] = useState<IntakeSummaryDTO | null>(
		null,
	);

	const intakeListQuery = api.intake.list.useQuery(
		{ status: "pending", limit: 25 },
		{ enabled: isOpen },
	);
	const intakeData = intakeListQuery.data as
		| { items: IntakeSummaryDTO[]; nextCursor: string | null }
		| undefined;
	const intakeLoading = intakeListQuery.isLoading;
	const intakeItems: IntakeSummaryDTO[] = intakeData?.items ?? [];

	const intakeDetailQuery = api.intake.get.useQuery(
		activeIntake ? { intakeEventId: activeIntake.id } : skipToken,
		{ enabled: activeIntake !== null },
	);
	const intakeDetailData: IntakeDetailDTO | undefined =
		intakeDetailQuery.data ?? undefined;
	const isIntakeDetailLoading =
		intakeDetailQuery.isLoading || intakeDetailQuery.isFetching;

	const setIntakeStatus = api.intake.setStatus.useMutation();

	// Fetch AI recommendations
	const aiRecommendationsQuery = api.ai.listRecommendations.useQuery(
		{ limit: 25 },
		{ enabled: isOpen },
	);
	const aiData = aiRecommendationsQuery.data;
	const aiLoading = aiRecommendationsQuery.isLoading;
	const aiRecommendations = Array.isArray(aiData?.items)
		? aiData.items.filter(isAiRecommendation)
		: [];

	// Fetch WhatsApp leads
	const whatsappLeadsQuery = api.whatsapp.listLeads.useQuery(
		{ limit: 10 },
		{ enabled: isOpen },
	);
	const whatsappLeads = (whatsappLeadsQuery.data ?? []) as WhatsAppLead[];
	const employeeOptions = employees.map((employee) => ({
		id: employee.id,
		name: employee.name,
		color: employee.color ?? null,
	}));

	const undoApplyMutation = api.intake.undoApply.useMutation({
		onSuccess: async () => {
			toast.success(translateRoot("jobs.unscheduled.apply.undoSuccess"));
			await Promise.all([
				utils.intake.list.invalidate({ status: "pending" }),
				utils.intake.get.invalidate(),
			]);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: translateRoot("jobs.unscheduled.apply.undoError"),
			);
		},
	});

	const applyMutation = api.intake.applyIntake.useMutation({
		onSuccess: async (result) => {
			showApplySuccessToast(
				translateRoot,
				(undoToken) => {
					undoApplyMutation.mutate({ undoToken });
				},
				result,
			);
			setApplyContext(null);
			await Promise.all([
				utils.intake.list.invalidate({ status: "pending" }),
				utils.intake.get.invalidate(),
			]);
			onJobCreated?.();
		},
		onError: (error) => {
			showApplyErrorToast(translateRoot, error);
		},
	});

	async function openApplyDialog(
		intakeEventId: string | null,
		recommendation: AiRecommendationDTO | null,
	): Promise<void> {
		if (intakeEventId === null) {
			toast.error(translateRoot("jobs.unscheduled.apply.missingIntake"));
			return;
		}

		try {
			const detail = await utils.intake.get.fetch({ intakeEventId });
			setApplyContext({ intake: detail, recommendation });
		} catch (error) {
			console.error("Failed to fetch intake detail", error);
			toast.error(translateRoot("jobs.unscheduled.apply.fetchError"));
		}
	}

	const handleApplyAIRecommendation = (rec: AiRecommendationDTO): void => {
		void openApplyDialog(rec.intakeEventId ?? null, rec);
	};

	const handleApplyWhatsAppLead = (): void => {
		toast.info(translateRoot("jobs.unscheduled.apply.leadUnsupported"));
	};

	const handleSelectIntake = (item: IntakeSummaryDTO): void => {
		setActiveIntake(item);
	};

	const handleDismissIntake = async (intakeId: string): Promise<void> => {
		try {
			await setIntakeStatus.mutateAsync({
				intakeEventId: intakeId,
				status: "dismissed",
			});
			await utils.intake.list.invalidate();
			if (activeIntake?.id === intakeId) {
				setActiveIntake(null);
			}
			toast.success("Intake afgehandeld");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Bijwerken van intake mislukt",
			);
		}
	};

	return (
		<>
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetTrigger asChild>
					<Button
						className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
						size="icon"
						data-testid="unscheduled-open"
					>
						<Zap className="h-6 w-6" />
						<span className="sr-only">{t("actions.cta.newJob")}</span>
					</Button>
				</SheetTrigger>

				<SheetContent
					side="bottom"
					className="h-[80vh] rounded-t-lg"
					data-testid="unscheduled-list"
				>
					<SheetHeader>
						<SheetTitle>{t("actions.cta.newJob")}</SheetTitle>
					</SheetHeader>

					<div className="flex-1 overflow-hidden">
						<Tabs defaultValue="intake" className="h-full flex flex-col">
							<TabsList className="grid w-full grid-cols-3 mb-4">
								<TabsTrigger value="intake">
									{t("jobs.unscheduled.intake.title")}{" "}
									{intakeItems.length > 0 && (
										<span className="ml-1 text-xs opacity-70">
											({intakeItems.length})
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger value="ai">
									{t("jobs.unscheduled.ai.title")}{" "}
									{aiRecommendations.length > 0 && (
										<span className="ml-1 text-xs opacity-70">
											({aiRecommendations.length})
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger value="whatsapp">
									{t("ui.tabs.whatsapp")}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="intake" className="flex-1 overflow-y-auto">
								{intakeLoading ? (
									<div className="space-y-3">
										{Array.from({ length: 4 }).map((_, idx) => (
											<Skeleton key={idx} className="h-16 w-full" />
										))}
									</div>
								) : intakeItems.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										{t("jobs.unscheduled.intake.empty", {
											defaultValue: "Geen intake-items",
										})}
									</p>
								) : (
									<ul className="space-y-2">
										{intakeItems.map((item) => {
											const isSelected = activeIntake?.id === item.id;
											return (
												<li key={item.id}>
													<div
														className={`flex items-start justify-between rounded-lg border p-3 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-muted"}`}
													>
														<button
															type="button"
															onClick={() => {
																handleSelectIntake(item);
															}}
															className="text-left flex-1"
														>
															<div className="flex items-center gap-2">
																<Badge
																	variant={
																		item.channel === "voice"
																			? "secondary"
																			: "default"
																	}
																>
																	{t(
																		`jobs.unscheduled.intake.channel.${item.channel}`,
																	)}
																</Badge>
																<Badge
																	variant={
																		mapIntakePriority(item.priority) ===
																		"emergency"
																			? "destructive"
																			: mapIntakePriority(item.priority) ===
																					"urgent"
																				? "default"
																				: "outline"
																	}
																>
																	{t(
																		`ui.form.priorityOptions.${mapIntakePriority(item.priority)}`,
																	)}
																</Badge>
															</div>
															<p className="mt-2 font-medium">
																{item.summary ||
																	t("jobs.unscheduled.intake.summaryFallback")}
															</p>
															<p className="text-sm text-muted-foreground">
																{formatDutchDateTime(item.receivedAtIso)}
															</p>
														</button>
														<div className="flex flex-col gap-2 sm:flex-row">
															<Button
																variant="default"
																size="sm"
																onClick={() => {
																	setActiveIntake(item);
																	void openApplyDialog(item.id, null);
																}}
															>
																{t("jobs.unscheduled.intake.apply", {
																	defaultValue: "Verwerken",
																})}
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => {
																	void handleDismissIntake(item.id);
																}}
															>
																{t("actions.labels.dismiss", {
																	defaultValue: "Sluiten",
																})}
															</Button>
														</div>
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</TabsContent>

							{/* AI Recommendations Tab */}
							<TabsContent value="ai" className="flex-1 overflow-y-auto">
								<div className="space-y-3">
									{aiLoading ? (
										<div className="space-y-3">
											{[1, 2, 3].map((i) => (
												<Skeleton key={i} className="h-32 w-full" />
											))}
										</div>
									) : aiRecommendations.length === 0 ? (
										<div className="text-center py-8 text-gray-500">
											<p>{t("jobs.unscheduled.ai.empty")}</p>
										</div>
									) : (
										aiRecommendations.map((rec) => (
											<div
												key={rec.id}
												className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="flex-1 min-w-0">
														<h3 className="font-medium text-sm truncate">
															{rec.title}
														</h3>
														{rec.summary && (
															<p className="text-gray-600 text-xs mt-1 line-clamp-2">
																{rec.summary}
															</p>
														)}
													</div>
													<div className="flex flex-col gap-1 items-end">
														<Badge
															variant={
																rec.confidence >= 80
																	? "default"
																	: rec.confidence >= 60
																		? "secondary"
																		: "outline"
															}
															className="text-xs"
														>
															<Gauge className="h-3 w-3 mr-1" />
															{rec.confidence}%
														</Badge>
														{rec.urgency === "high" && (
															<Badge variant="destructive" className="text-xs">
																{t("ui.form.priorityOptions.urgent")}
															</Badge>
														)}
													</div>
												</div>

												<div className="flex flex-wrap gap-3 text-xs text-gray-500">
													{rec.customer?.phoneE164 && (
														<div className="flex items-center gap-1">
															<Phone className="h-3 w-3" />
															<span>{rec.customer.phoneE164}</span>
														</div>
													)}
													{rec.estimate?.durationMinutes && (
														<div className="flex items-center gap-1">
															<Clock className="h-3 w-3" />
															<span>
																{rec.estimate.durationMinutes}{" "}
																{t("jobs.unscheduled.ai.minutes")}
															</span>
														</div>
													)}
													<div className="flex items-center gap-1">
														<span>{formatDutchDate(rec.createdIso)}</span>
													</div>
												</div>

												{rec.tags.length > 0 && (
													<div className="flex flex-wrap gap-1">
														{rec.tags.map((tag) => (
															<Badge
																key={tag}
																variant="outline"
																className="text-xs py-0 px-1"
															>
																{tag}
															</Badge>
														))}
													</div>
												)}

												<Button
													onClick={() => {
														handleApplyAIRecommendation(rec);
													}}
													variant="outline"
													size="sm"
													className="w-full"
												>
													{t("jobs.unscheduled.ai.assign")}
												</Button>
											</div>
										))
									)}
								</div>
							</TabsContent>

							{/* WhatsApp Leads Tab */}
							<TabsContent value="whatsapp" className="flex-1 overflow-y-auto">
								<div className="space-y-3">
									{whatsappLeads.length === 0 ? (
										<div className="text-center py-8 text-gray-500">
											<p>{t("whatsapp.noMessages")}</p>
										</div>
									) : (
										whatsappLeads.map((lead) => (
											<div
												key={lead.id}
												className="border rounded-lg p-4 space-y-3"
											>
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<h3 className="font-medium text-sm">
															{lead.wa_name ?? lead.phone_e164}
														</h3>
														<p className="text-gray-600 text-xs mt-1">
															{lead.message_count} {t("whatsapp.messages")}
														</p>
													</div>
												</div>

												<div className="text-xs text-gray-500">
													{t("whatsapp.lastActivity")}:{" "}
													{formatDutchDateTime(lead.last_seen_at)}
												</div>

												<Button
													onClick={() => {
														handleApplyWhatsAppLead();
													}}
													variant="outline"
													size="sm"
													className="w-full"
												>
													{t("whatsapp.createJob")}
												</Button>
											</div>
										))
									)}
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{activeIntake && (
						<div className="mt-4">
							<IntakeDetailsCard
								summary={activeIntake}
								detail={intakeDetailData}
								loading={isIntakeDetailLoading}
							/>
						</div>
					)}

					{/* Apply dialog injected below */}
				</SheetContent>
			</Sheet>
			{applyContext ? (
				<ApplyDialog
					context={applyContext}
					employees={employeeOptions}
					onClose={() => {
						setApplyContext(null);
					}}
					onSubmit={async (payload: ApplyMutationInput) => {
						await applyMutation.mutateAsync(payload);
					}}
					isSubmitting={applyMutation.isPending}
				/>
			) : null}
		</>
	);
}

type IntakeDetailsCardProps = {
	summary: IntakeSummaryDTO;
	detail: IntakeDetailDTO | undefined;
	loading: boolean;
};

function IntakeDetailsCard({
	summary,
	detail,
	loading,
}: IntakeDetailsCardProps): JSX.Element {
	const t = useTranslations();
	const detailData: IntakeDetailDTO["details"] | undefined = detail?.details;
	const priority = mapIntakePriority(summary.priority);
	const media = detailData?.media ?? summary.media;
	const attachments = media.filter((item) => item.source !== "voice");
	const whatsappInfo = detailData?.whatsapp ?? summary.whatsapp;
	const voiceInfo = detailData?.voice ?? summary.voice;
	const analyzer = detailData?.analyzer;
	const analyzerPriority =
		analyzer !== undefined ? mapIntakePriority(analyzer.urgency) : null;
	const voiceRecording =
		voiceInfo?.recording ?? media.find((item) => item.source === "voice");
	const lastMessageIso = detailData?.lastMessageIso ?? summary.receivedAtIso;

	return (
		<div className="space-y-4 rounded-lg border bg-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Badge
							variant={summary.channel === "voice" ? "secondary" : "default"}
						>
							{t(`jobs.unscheduled.intake.channel.${summary.channel}`)}
						</Badge>
						<Badge
							variant={
								priority === "emergency"
									? "destructive"
									: priority === "urgent"
										? "default"
										: "outline"
							}
						>
							{t(`ui.form.priorityOptions.${priority}`)}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						{formatDutchDateTime(lastMessageIso)}
					</p>
				</div>
				{loading && (
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				)}
			</div>

			<div>
				<p className="text-base font-medium">
					{summary.summary && summary.summary.trim().length > 0
						? summary.summary
						: t("jobs.unscheduled.intake.summaryFallback")}
				</p>
				<p className="mt-1 text-sm text-muted-foreground">
					{detailData?.snippet ?? summary.snippet}
				</p>
			</div>

			{summary.channel === "whatsapp" && (
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm font-medium">
						<MessageSquare className="h-4 w-4" />
						<span>
							{t("jobs.unscheduled.intake.whatsapp.messageCount", {
								count: whatsappInfo?.messageIds.length ?? 0,
							})}
						</span>
					</div>
					<div>
						<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{t("jobs.unscheduled.intake.whatsapp.media")}
						</h4>
						{attachments.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{t("jobs.unscheduled.intake.whatsapp.mediaEmpty")}
							</p>
						) : (
							<ul className="space-y-2">
								{attachments.map((attachment) => (
									<li
										key={attachment.storageKey}
										className="flex items-start justify-between rounded-md border px-3 py-2 text-sm"
									>
										<div className="min-w-0">
											<p className="font-medium">{attachment.mime}</p>
											<p className="truncate text-xs text-muted-foreground">
												{attachment.storageKey}
											</p>
										</div>
										<span className="text-xs text-muted-foreground">
											{formatBytes(attachment.byteSize)}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}

			{summary.channel === "voice" && (
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm font-medium">
						<Phone className="h-4 w-4" />
						<span>
							{t(
								`jobs.unscheduled.intake.voice.direction.${voiceInfo?.direction ?? "inbound"}`,
							)}
						</span>
					</div>
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.voice.caller")}
							</dt>
							<dd>{voiceInfo?.callerNumber ?? t("ui.common.phoneUnknown")}</dd>
						</div>
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.voice.receiver")}
							</dt>
							<dd>
								{voiceInfo?.receiverNumber ?? t("ui.common.phoneUnknown")}
							</dd>
						</div>
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.voice.duration")}
							</dt>
							<dd>{formatDuration(voiceInfo?.durationSeconds)}</dd>
						</div>
					</dl>
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm font-medium">
							<Mic className="h-4 w-4" />
							<span>{t("jobs.unscheduled.intake.voice.recording")}</span>
						</div>
						<p className="whitespace-pre-line break-all text-sm text-muted-foreground">
							{voiceRecording
								? `${voiceRecording.mime} • ${formatBytes(voiceRecording.byteSize)} \n${voiceRecording.storageKey}`
								: t("jobs.unscheduled.intake.voice.noRecording")}
						</p>
					</div>
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm font-medium">
							<FileText className="h-4 w-4" />
							<span>{t("jobs.unscheduled.intake.voice.transcript")}</span>
						</div>
						<p className="whitespace-pre-line text-sm text-muted-foreground">
							{voiceInfo?.transcript?.text ??
								t("jobs.unscheduled.intake.voice.noTranscript")}
						</p>
					</div>
				</div>
			)}

			{analyzer && (
				<div className="space-y-3 rounded-md border p-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Gauge className="h-4 w-4" />
						<span>{t("jobs.unscheduled.intake.analyzer.title")}</span>
					</div>
					<div className="grid gap-2 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.analyzer.issue")}
							</dt>
							<dd>{analyzer.issue}</dd>
						</div>
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.analyzer.urgency")}
							</dt>
							<dd>
								{t(`ui.form.priorityOptions.${analyzerPriority ?? "normal"}`)}
							</dd>
						</div>
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.analyzer.timeEstimate")}
							</dt>
							<dd>
								{t("jobs.unscheduled.intake.analyzer.minutesUnit", {
									value: analyzer.timeEstimateMin,
								})}
							</dd>
						</div>
						<div>
							<dt className="text-xs uppercase tracking-wide text-muted-foreground">
								{t("jobs.unscheduled.intake.analyzer.confidence")}
							</dt>
							<dd>{Math.round(analyzer.confidence * 100)}%</dd>
						</div>
					</div>
					<div>
						<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{t("jobs.unscheduled.intake.analyzer.materials.heading")}
						</h4>
						{analyzer.materials.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{t("jobs.unscheduled.intake.analyzer.materials.empty")}
							</p>
						) : (
							<ul className="list-disc space-y-1 pl-5 text-sm">
								{analyzer.materials.map((material, index) => (
									<li key={`${material.name}-${index}`}>
										{material.qty}× {material.name}
										{material.unit ? ` (${material.unit})` : ""}
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
