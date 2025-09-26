"use client";

import { skipToken } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowRight,
	Bot,
	Check,
	MessageSquare,
	Phone,
	UserRoundX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChatPanel } from "~/components/ai/chat-widget";
import {
	ApplyDialog,
	type ApplyDialogContext,
	showApplyErrorToast,
	showApplySuccessToast,
} from "~/components/intake/apply-dialog";
import { ProposalsPanel } from "~/components/intake/ProposalsPanel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { formatDutchDateTime, formatDutchTime } from "~/lib/dates";
import { api } from "~/lib/trpc/client";
import { cn } from "~/lib/utils";
import type { AiRecommendationDTO } from "~/types/ai";
import type { IntakeDetailDTO, IntakeSummaryDTO } from "~/types/intake";

interface ConfidenceMeta {
	state: "high" | "medium" | "low" | "none";
	label: string;
	description?: string;
}

type RecommendationIndex = {
	byIntake: Map<string, AiRecommendationDTO[]>;
	byConversation: Map<string, AiRecommendationDTO[]>;
};

type TranslationValues = Record<string, string | number>;
type TranslateFn = (key: string, values?: TranslationValues) => string;

const isAiRecommendation = (value: unknown): value is AiRecommendationDTO => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Partial<AiRecommendationDTO>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.title === "string" &&
		typeof candidate.confidence === "number" &&
		typeof candidate.actionText === "string" &&
		typeof candidate.channel === "string"
	);
};

export function OperatorConsole(): JSX.Element {
	const t = useTranslations();
	const translate: TranslateFn = (key, values) =>
		t(`intake.console.${key}` as Parameters<typeof t>[0], values);
	const translateRoot = (key: string, values?: TranslationValues): string =>
		t(key as Parameters<typeof t>[0], values);
	const [selectedIntakeId, setSelectedIntakeId] = useState<string | null>(null);
	const [applyContext, setApplyContext] = useState<ApplyDialogContext | null>(
		null,
	);

	const utils = api.useUtils();
	const { data: employees = [] } = api.employees.list.useQuery({});

	const intakeListQuery = api.intake.list.useQuery(
		{ status: "pending", limit: 50 },
		{ refetchInterval: 30_000 },
	);

	const recommendationsQuery = api.ai.listRecommendations.useQuery(
		{ limit: 50 },
		{ refetchInterval: 45_000 },
	);

	const intakeDetailQuery = api.intake.get.useQuery(
		selectedIntakeId ? { intakeEventId: selectedIntakeId } : skipToken,
		{ enabled: Boolean(selectedIntakeId) },
	);

	const setIntakeStatus = api.intake.setStatus.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.intake.list.invalidate({ status: "pending" }),
				utils.intake.get.invalidate(),
			]);
		},
	});

	const undoApplyMutation = api.intake.undoApply.useMutation({
		onSuccess: async () => {
			toast.success(translate("apply.undoSuccess"));
			await Promise.all([
				utils.intake.list.invalidate({ status: "pending" }),
				utils.intake.get.invalidate(),
			]);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : translate("apply.undoError"),
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
		},
		onError: (error) => {
			showApplyErrorToast(translateRoot, error);
		},
	});

	const intakeItems = useMemo(() => {
		const items = intakeListQuery.data?.items;
		return Array.isArray(items) ? items : [];
	}, [intakeListQuery.data]);

	useEffect(() => {
		if (!selectedIntakeId && intakeItems.length > 0) {
			setSelectedIntakeId(intakeItems[0]!.id);
		}
	}, [intakeItems, selectedIntakeId]);

	const recommendationItems = useMemo((): AiRecommendationDTO[] => {
		const items = recommendationsQuery.data?.items;
		if (!Array.isArray(items)) {
			return [];
		}
		return items.filter(isAiRecommendation);
	}, [recommendationsQuery.data]);

	const recommendationIndex: RecommendationIndex = useMemo(() => {
		const byIntake = new Map<string, AiRecommendationDTO[]>();
		const byConversation = new Map<string, AiRecommendationDTO[]>();

		for (const rec of recommendationItems) {
			if (rec.intakeEventId) {
				const list = byIntake.get(rec.intakeEventId) ?? [];
				list.push(rec);
				byIntake.set(rec.intakeEventId, list);
			}

			if (rec.conversationId) {
				const list = byConversation.get(rec.conversationId) ?? [];
				list.push(rec);
				byConversation.set(rec.conversationId, list);
			}
		}

		return { byIntake, byConversation };
	}, [recommendationItems]);

	const selectedIntake = useMemo(() => {
		return intakeItems.find((item) => item.id === selectedIntakeId) ?? null;
	}, [intakeItems, selectedIntakeId]);

	const detail = intakeDetailQuery.data ?? null;

	const conversationId =
		detail?.details.whatsapp?.waConversationId ??
		detail?.whatsapp?.waConversationId ??
		selectedIntake?.whatsapp?.waConversationId ??
		null;

	const suggestions = useMemo(() => {
		if (!selectedIntakeId) return [] as AiRecommendationDTO[];

		const primary = recommendationIndex.byIntake.get(selectedIntakeId) ?? [];
		if (primary.length > 0) {
			return primary.sort((a, b) => b.confidenceScore - a.confidenceScore);
		}

		if (conversationId) {
			const secondary =
				recommendationIndex.byConversation.get(conversationId) ?? [];
			return secondary.sort((a, b) => b.confidenceScore - a.confidenceScore);
		}

		return [];
	}, [conversationId, recommendationIndex, selectedIntakeId]);

	const bestConfidence = suggestions[0]?.confidenceScore ?? null;

	const handleDismiss = async (intakeId: string): Promise<void> => {
		try {
			await setIntakeStatus.mutateAsync({
				intakeEventId: intakeId,
				status: "dismissed",
			});
			if (selectedIntakeId === intakeId) {
				setSelectedIntakeId(null);
			}
		} catch (error) {
			console.error("Failed to dismiss intake", error);
		}
	};

	const handleSelect = (intakeId: string): void => {
		setSelectedIntakeId(intakeId);
	};

	const handleOpenApply = (
		recommendation: AiRecommendationDTO | null,
	): void => {
		if (!detail) return;
		setApplyContext({ intake: detail, recommendation });
	};

	const confidenceMeta = useConfidenceMeta(bestConfidence, translate);

	return (
		<div className="grid h-full w-full gap-6 lg:grid-cols-[360px_1fr]">
			<Card className="flex flex-col">
				<CardHeader className="border-b">
					<CardTitle className="text-base font-semibold">
						{translate("list.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex-1 overflow-y-auto p-0">
					<IntakeList
						items={intakeItems}
						selectedId={selectedIntakeId}
						onSelect={handleSelect}
						loading={intakeListQuery.isLoading}
						recommendationIndex={recommendationIndex}
						translationsPrefix="intake.console.list"
					/>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-4">
				<Card className="flex-1">
					<CardHeader className="border-b">
						<div className="flex items-center justify-between gap-2">
							<div>
								<CardTitle className="text-base font-semibold">
									{detail?.summary ??
										selectedIntake?.summary ??
										translate("detail.empty.title")}
								</CardTitle>
								<p className="text-xs text-muted-foreground">
									{detail
										? formatDutchDateTime(detail.receivedAtIso)
										: selectedIntake
											? formatDutchDateTime(selectedIntake.receivedAtIso)
											: translate("detail.empty.subtitle")}
								</p>
							</div>
							{confidenceMeta.state !== "none" ? (
								<Badge
									variant={
										confidenceMeta.state === "high"
											? "default"
											: confidenceMeta.state === "medium"
												? "secondary"
												: "destructive"
									}
									className="text-xs font-medium"
								>
									{confidenceMeta.label}
								</Badge>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{detail ? (
							<DetailContent
								detail={detail}
								suggestions={suggestions}
								onApply={handleOpenApply}
								onDismiss={handleDismiss}
							/>
						) : (
							<div className="flex flex-col items-center justify-center space-y-2 py-10 text-sm text-muted-foreground">
								<Bot className="h-6 w-6" />
								<p>{translate("detail.empty.title")}</p>
							</div>
						)}
					</CardContent>
				</Card>

				<ProposalsPanel intakeId={selectedIntakeId} />

				<Card>
					<CardHeader className="border-b">
						<CardTitle className="text-sm font-semibold">
							{translate("chat.title")}
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<ChatPanel
							conversationId={conversationId}
							customerId={detail?.customer?.id ?? null}
						/>
					</CardContent>
				</Card>
			</div>

			{applyContext ? (
				<ApplyDialog
					context={applyContext}
					employees={employees}
					onClose={() => {
						setApplyContext(null);
					}}
					onSubmit={async (payload) => {
						await applyMutation.mutateAsync(payload);
					}}
					isSubmitting={applyMutation.isPending}
				/>
			) : null}
		</div>
	);
}

function IntakeList({
	items,
	selectedId,
	onSelect,
	loading,
	recommendationIndex,
	translationsPrefix,
}: {
	items: IntakeSummaryDTO[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	loading: boolean;
	recommendationIndex: RecommendationIndex;
	translationsPrefix: string;
}): JSX.Element {
	const t = useTranslations();
	const translateList: TranslateFn = (key, values) =>
		t(`${translationsPrefix}.${key}` as Parameters<typeof t>[0], values);

	if (loading) {
		return (
			<div className="space-y-2 p-4">
				{Array.from({ length: 4 }).map((_, idx) => (
					<div
						key={`skeleton-${idx}`}
						className="h-16 animate-pulse rounded-md bg-muted"
					/>
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center space-y-2 p-6 text-sm text-muted-foreground">
				<UserRoundX className="h-6 w-6" />
				<p>{translateList("empty")}</p>
			</div>
		);
	}

	return (
		<ul className="space-y-1 p-2">
			{items.map((intake) => {
				const isSelected = intake.id === selectedId;
				const channelIcon =
					intake.channel === "voice" ? (
						<Phone className="h-4 w-4" />
					) : (
						<MessageSquare className="h-4 w-4" />
					);
				const suggestions =
					recommendationIndex.byIntake.get(intake.id) ??
					(intake.whatsapp?.waConversationId
						? recommendationIndex.byConversation.get(
								intake.whatsapp.waConversationId,
							)
						: undefined) ??
					[];
				const best = suggestions.length > 0 ? suggestions[0]!.confidence : null;

				return (
					<li key={intake.id}>
						<button
							type="button"
							onClick={() => {
								onSelect(intake.id);
							}}
							className={cn(
								"w-full rounded-md border px-3 py-3 text-left transition-colors",
								isSelected
									? "border-primary bg-primary/5"
									: "border-transparent hover:border-border hover:bg-muted/30",
							)}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-2 text-sm font-medium">
										<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
											{channelIcon}
										</span>
										{intake.summary || translateList("unnamed")}
									</div>
									<p className="line-clamp-2 text-xs text-muted-foreground">
										{intake.snippet}
									</p>
								</div>
								<div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
									<span>{formatDutchTime(intake.receivedAtIso)}</span>
									{best !== null ? (
										<Badge variant="outline" className="text-[11px]">
											{best}%
										</Badge>
									) : null}
								</div>
							</div>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

function DetailContent({
	detail,
	suggestions,
	onApply,
	onDismiss,
}: {
	detail: IntakeDetailDTO;
	suggestions: AiRecommendationDTO[];
	onApply: (recommendation: AiRecommendationDTO | null) => void;
	onDismiss: (intakeId: string) => Promise<void> | void;
}): JSX.Element {
	const t = useTranslations();
	const detailTranslate: TranslateFn = (key, values) =>
		t(`intake.console.detail.${key}` as Parameters<typeof t>[0], values);

	const analyzer = detail.details.analyzer ?? null;
	const channel = detail.channel;

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span className="font-medium text-foreground">
						{detailTranslate("channel")}
					</span>
					<Badge variant="outline" className="capitalize">
						{channel}
					</Badge>
					<Separator orientation="vertical" className="h-4" />
					<span>{formatDutchDateTime(detail.receivedAtIso)}</span>
				</div>
				<p className="text-sm text-muted-foreground">{detail.snippet}</p>
			</div>

			{analyzer ? (
				<div className="rounded-md border bg-muted/30">
					<div className="flex items-center justify-between border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						<span>{detailTranslate("analyzer.title")}</span>
						<span>{Math.round(analyzer.confidence * 100)}%</span>
					</div>
					<div className="grid gap-3 px-4 py-3 text-sm">
						<InfoRow
							label={detailTranslate("analyzer.issue")}
							value={analyzer.issue}
						/>
						<InfoRow
							label={detailTranslate("analyzer.urgency")}
							value={analyzer.urgency}
						/>
						<InfoRow
							label={detailTranslate("analyzer.time")}
							value={detailTranslate("analyzer.timeValue", {
								value: analyzer.timeEstimateMin,
							})}
						/>
					</div>
				</div>
			) : null}

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold">
						{detailTranslate("suggestions.title")}
					</h3>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							void onDismiss(detail.id);
						}}
					>
						{detailTranslate("actions.dismiss")}
					</Button>
				</div>
				{suggestions.length === 0 ? (
					<div className="flex items-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
						<AlertCircle className="h-4 w-4" />
						<span>{detailTranslate("suggestions.empty")}</span>
					</div>
				) : (
					<div className="space-y-3">
						{suggestions.map((suggestion) => (
							<SuggestionCard
								key={suggestion.id}
								suggestion={suggestion}
								onApply={onApply}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function SuggestionCard({
	suggestion,
	onApply,
}: {
	suggestion: AiRecommendationDTO;
	onApply: (recommendation: AiRecommendationDTO) => void;
}): JSX.Element {
	const t = useTranslations();
	const translateSuggestion: TranslateFn = (key, values) =>
		t(`intake.console.suggestions.${key}` as Parameters<typeof t>[0], values);
	const translateConsole: TranslateFn = (key, values) =>
		t(`intake.console.${key}` as Parameters<typeof t>[0], values);
	const confidenceMeta = useConfidenceMeta(
		suggestion.confidenceScore,
		translateConsole,
	);
	const channelLabel = translateSuggestion(`channels.${suggestion.channel}`);
	const channelIcon =
		suggestion.channel === "voice" ? (
			<Phone className="h-3.5 w-3.5" />
		) : (
			<MessageSquare className="h-3.5 w-3.5" />
		);
	const payloadNotesSource = Array.isArray(suggestion.payload?.notes)
		? (suggestion.payload.notes as unknown[])
		: [];
	const payloadNotes = payloadNotesSource.filter(
		(note): note is string =>
			typeof note === "string" && note.trim().length > 0,
	);
	const shouldShowAction =
		suggestion.actionText.trim().length > 0 &&
		suggestion.actionText.trim() !== (suggestion.summary ?? "").trim();

	return (
		<div className="rounded-md border p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
						<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted">
							{channelIcon}
						</span>
						<Badge
							variant="outline"
							className="text-[10px] uppercase tracking-wide"
						>
							{channelLabel}
						</Badge>
					</div>
					<p className="text-sm font-semibold text-foreground">
						{suggestion.title}
					</p>
					<p className="text-xs text-muted-foreground">
						{translateSuggestion("created", {
							value: formatDutchTime(suggestion.createdIso),
						})}
					</p>
				</div>
				<Badge
					variant={
						confidenceMeta.state === "high"
							? "default"
							: confidenceMeta.state === "medium"
								? "secondary"
								: confidenceMeta.state === "low"
									? "destructive"
									: "outline"
					}
				>
					{suggestion.confidence}%
				</Badge>
			</div>

			<div className="mt-3 grid gap-2 text-sm text-muted-foreground">
				<p>{suggestion.summary ?? suggestion.title}</p>
				{shouldShowAction ? (
					<div className="text-foreground">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{translateSuggestion("actionHeading")}
						</p>
						<p>{suggestion.actionText}</p>
					</div>
				) : null}
				{suggestion.estimate?.durationMinutes ? (
					<p>
						{translateSuggestion("estimatedDuration", {
							value: suggestion.estimate.durationMinutes,
						})}
					</p>
				) : null}
				<p>
					{translateSuggestion("urgency", { value: suggestion.urgency })}
					{confidenceMeta.description
						? ` · ${confidenceMeta.description}`
						: null}
				</p>
			</div>

			{suggestion.timeStub ? (
				<p className="mt-2 text-xs text-muted-foreground">
					{translateSuggestion("timeStub", { value: suggestion.timeStub })}
				</p>
			) : null}

			{payloadNotes.length > 0 ? (
				<div className="mt-3">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{translateSuggestion("notesHeading")}
					</p>
					<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
						{payloadNotes.map((note, index) => (
							<li key={`${suggestion.id}-note-${index}`}>{note}</li>
						))}
					</ul>
				</div>
			) : null}

			{suggestion.materialsStub && suggestion.materialsStub.length > 0 ? (
				<div className="mt-3">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{translateSuggestion("materialsHeading")}
					</p>
					<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
						{suggestion.materialsStub.map((material, index) => (
							<li key={`${suggestion.id}-material-${index}`}>{material}</li>
						))}
					</ul>
				</div>
			) : null}

			<div className="mt-4 flex items-center justify-between">
				<Button
					variant="default"
					onClick={() => {
						onApply(suggestion);
					}}
					disabled={confidenceMeta.state === "low"}
				>
					<span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
						{confidenceMeta.state === "high" ? (
							<Check className="h-4 w-4" />
						) : (
							<ArrowRight className="h-4 w-4" />
						)}
					</span>
					{confidenceMeta.state === "high"
						? translateSuggestion("actions.apply")
						: confidenceMeta.state === "medium"
							? translateSuggestion("actions.review")
							: translateSuggestion("actions.manual")}
				</Button>
			</div>
		</div>
	);
}

function InfoRow({
	label,
	value,
}: {
	label: string;
	value: string | number | null;
}): JSX.Element {
	if (value === null) {
		return <></>;
	}

	return (
		<div className="flex items-start justify-between gap-2 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-foreground">{value}</span>
		</div>
	);
}

function useConfidenceMeta(
	confidenceScore: number | null,
	translate: TranslateFn,
): ConfidenceMeta {
	if (confidenceScore === null) {
		return {
			state: "none",
			label: translate("confidence.none"),
		};
	}

	if (confidenceScore >= 0.7) {
		return {
			state: "high",
			label: translate("confidence.high"),
			description: translate("confidence.highSubtitle"),
		};
	}

	if (confidenceScore >= 0.5) {
		return {
			state: "medium",
			label: translate("confidence.medium"),
			description: translate("confidence.mediumSubtitle"),
		};
	}

	return {
		state: "low",
		label: translate("confidence.low"),
		description: translate("confidence.lowSubtitle"),
	};
}
