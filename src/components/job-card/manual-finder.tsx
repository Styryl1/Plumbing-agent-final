"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
	getManufacturerInfo,
	listManufacturers,
	type ManufacturerInfo,
	normalizeBrand,
} from "~/lib/manuals/catalog";

export type ManualMatch = {
	brand: string;
	model: string;
	confidence: number;
	needsRatingPlate?: boolean;
	localeHint?: "nl" | "en";
};

export type ManualSummary = {
	brand: string;
	model: string;
	language?: "nl" | "en";
	version?: string | null;
	url?: string | null;
	manualId?: string;
};

type IdentifyAction = (
	file: File,
	options: { kind: "front" | "ratingPlate" },
) => Promise<ManualMatch>;
type FetchAction = (match: ManualMatch) => Promise<ManualSummary>;

type ManualFinderProps = {
	jobId: string;
	match: ManualMatch | null;
	manual: ManualSummary | null;
	onMatch: (match: ManualMatch | null) => void;
	onManualLinked: (manual: ManualSummary | null) => void;
	identifyAction?: IdentifyAction | undefined;
	fetchAction?: FetchAction | undefined;
};

export function ManualFinder({
	jobId,
	match,
	manual,
	onMatch,
	onManualLinked,
	identifyAction,
	fetchAction,
}: ManualFinderProps): JSX.Element {
	const t = useTranslations();
	const [uploadKind, setUploadKind] = useState<"front" | "ratingPlate">(
		"front",
	);
	const [processing, setProcessing] = useState(false);
	const [attachLoading, setAttachLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fallbackUsed, setFallbackUsed] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleOpenPicker = useCallback((kind: "front" | "ratingPlate") => {
		setUploadKind(kind);
		setError(null);
		fileInputRef.current?.click();
	}, []);

	const handleIdentify = useCallback<IdentifyAction>(
		async (file, options) => {
			if (identifyAction) {
				setFallbackUsed(false);
				return identifyAction(file, options);
			}

			setFallbackUsed(true);
			return simulateIdentify(file);
		},
		[identifyAction],
	);

	const resetInput = useCallback(() => {
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	const onFileSelected = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];

			if (!file) {
				return;
			}

			setProcessing(true);
			setError(null);

			try {
				const nextMatch = await handleIdentify(file, { kind: uploadKind });
				onMatch(nextMatch);
			} catch (err) {
				const message =
					err instanceof Error && err.message.length > 0
						? err.message
						: t("jobCard.manuals.finder.errors.identify");
				setError(message);
				onMatch(null);
			} finally {
				resetInput();
				setProcessing(false);
			}
		},
		[handleIdentify, onMatch, resetInput, t, uploadKind],
	);

	const handleAttach = useCallback(async () => {
		if (!match) {
			return;
		}

		setAttachLoading(true);
		setError(null);

		try {
			if (!fetchAction) {
				throw new Error(t("jobCard.manuals.finder.errors.notConfigured"));
			}

			const linkedManual = await fetchAction(match);
			onManualLinked(linkedManual);
		} catch (err) {
			const message =
				err instanceof Error && err.message.length > 0
					? err.message
					: t("jobCard.manuals.finder.errors.attach");
			setError(message);
		} finally {
			setAttachLoading(false);
		}
	}, [fetchAction, match, onManualLinked, t]);

	const confidenceBadge = useMemo(() => {
		if (!match) {
			return null;
		}

		const value = Math.round(match.confidence * 100);
		let variant: "default" | "destructive" | "outline" = "default";
		let label = t("jobCard.manuals.finder.confidence.medium", { value });

		if (match.confidence >= 0.85) {
			variant = "default";
			label = t("jobCard.manuals.finder.confidence.high", { value });
		} else if (match.confidence <= 0.55) {
			variant = "destructive";
			label = t("jobCard.manuals.finder.confidence.low", { value });
		} else {
			variant = "outline";
		}

		return (
			<Badge variant={variant} className="text-xs">
				{label}
			</Badge>
		);
	}, [match, t]);

	return (
		<Card
			data-slot="manual-finder"
			className="border-muted-foreground/20 shadow-none"
		>
			<CardHeader className="pb-4">
				<CardTitle className="text-base font-semibold">
					{t("jobCard.manuals.finder.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-1">
					<p className="text-sm text-muted-foreground">
						{t("jobCard.manuals.finder.description")}
					</p>
					{fallbackUsed && (
						<Alert variant="default" className="bg-muted/60">
							<AlertTitle>
								{t("jobCard.manuals.finder.fallback.title")}
							</AlertTitle>
							<AlertDescription>
								{t("jobCard.manuals.finder.fallback.body")}
							</AlertDescription>
						</Alert>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						onClick={() => {
							handleOpenPicker("front");
						}}
						disabled={processing}
						variant="secondary"
						className="flex-1 min-w-[160px]"
					>
						{processing && uploadKind === "front"
							? t("jobCard.manuals.finder.uploading")
							: t("jobCard.manuals.finder.actions.front")}
					</Button>
					<Button
						onClick={() => {
							handleOpenPicker("ratingPlate");
						}}
						disabled={processing || (!match && manual == null)}
						variant="outline"
						className="flex-1 min-w-[160px]"
					>
						{processing && uploadKind === "ratingPlate"
							? t("jobCard.manuals.finder.uploading")
							: t("jobCard.manuals.finder.actions.ratingPlate")}
					</Button>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={onFileSelected}
					className="hidden"
				/>

				{match ? (
					<div className="rounded-lg border border-dashed p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p className="text-sm font-medium">
									{match.brand} · {match.model}
								</p>
								<p className="text-xs text-muted-foreground">
									{t("jobCard.manuals.finder.matchFor", { jobId })}
								</p>
							</div>
							{confidenceBadge}
						</div>
						{match.needsRatingPlate && (
							<p className="mt-3 text-xs text-muted-foreground">
								{t("jobCard.manuals.finder.ratingPlatePrompt")}
							</p>
						)}
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
						{t("jobCard.manuals.finder.emptyState")}
					</div>
				)}

				{manual && (
					<div className="rounded-lg border bg-muted/20 p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p className="text-sm font-medium">
									{manual.brand} · {manual.model}
								</p>
								<p className="text-xs text-muted-foreground">
									{manual.language ? manual.language.toUpperCase() : "PDF"}
								</p>
							</div>
							{manual.url ? (
								<Button asChild variant="ghost" size="sm">
									<a href={`${manual.url}`} target="_blank" rel="noreferrer">
										{t("jobCard.manuals.finder.actions.open")}
									</a>
								</Button>
							) : (
								<Badge variant="outline" className="text-xs">
									{t("jobCard.manuals.finder.attached")}
								</Badge>
							)}
						</div>
					</div>
				)}

				{error && (
					<Alert variant="destructive">
						<AlertTitle>{t("jobCard.manuals.finder.errors.title")}</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</CardContent>
			<CardFooter className="flex-col items-start gap-3">
				<Separator className="w-full" />
				<div className="flex w-full flex-wrap justify-between gap-2">
					<Button
						onClick={handleAttach}
						disabled={!match || attachLoading}
						className="flex-1"
					>
						{attachLoading
							? t("jobCard.manuals.finder.actions.attaching")
							: t("jobCard.manuals.finder.actions.attach")}
					</Button>
					<Button
						variant="ghost"
						onClick={() => {
							onMatch(null);
							onManualLinked(null);
							setError(null);
						}}
						className="flex-1"
					>
						{t("jobCard.manuals.finder.actions.clear")}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

function simulateIdentify(file: File): ManualMatch {
	const baseName = file.name.replace(/\.[^.]+$/, "");
	const normalizedFromName = normalizeBrand(baseName);
	const normalizedFromType = file.type ? normalizeBrand(file.type) : null;
	const normalized = normalizedFromName ?? normalizedFromType;
	const manufacturers = listManufacturers();

	let candidate: ManufacturerInfo | null = null;
	if (normalized) {
		candidate = getManufacturerInfo(normalized);
	}

	if (!candidate) {
		const baseLower = baseName.toLowerCase();
		candidate =
			manufacturers.find((manufacturer) =>
				baseLower.includes(manufacturer.brand.toLowerCase()),
			) ?? null;
	}

	const brand = candidate?.brand ?? fallbackTitle(normalized ?? "Unknown");
	const baseClean = baseName.replace(/[_-]/g, " ");
	let modelGuessRaw = baseClean;
	if (candidate?.brand) {
		const brandLower = candidate.brand.toLowerCase();
		const cleanLower = baseClean.toLowerCase();
		const index = cleanLower.indexOf(brandLower);
		if (index >= 0) {
			modelGuessRaw =
				baseClean.slice(0, index) +
				baseClean.slice(index + candidate.brand.length);
		}
	}
	const modelGuess = modelGuessRaw.trim();

	const model =
		modelGuess.length > 0 ? fallbackTitle(modelGuess) : fallbackTitle(baseName);

	return {
		brand,
		model,
		confidence: candidate ? 0.62 : 0.4,
		needsRatingPlate: true,
		localeHint: candidate?.defaultLocale ?? "nl",
	};
}

function fallbackTitle(value: string): string {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
		)
		.join(" ");
}
