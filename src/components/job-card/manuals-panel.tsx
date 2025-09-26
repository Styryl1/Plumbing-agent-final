"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import {
	ManualFinder,
	type ManualMatch,
	type ManualSummary,
} from "~/components/job-card/manual-finder";
import { ManualQA } from "~/components/job-card/manual-qa";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export type ManualsPanelProps = {
	jobId: string;
	featureEnabled?: boolean;
	initialManual?: ManualSummary | null;
	identifyAction?:
		| ((
				file: File,
				options: { kind: "front" | "ratingPlate" },
		  ) => Promise<ManualMatch>)
		| undefined;
	fetchAction?: ((match: ManualMatch) => Promise<ManualSummary>) | undefined;
	askAction?:
		| ((input: { question: string; manual: ManualSummary }) => Promise<{
				answer: string;
				citations: { page: number; snippet: string; url: string }[];
				safetyMode?: boolean;
		  }>)
		| undefined;
	suggestions?: string[];
};

export function ManualsPanel({
	jobId,
	featureEnabled = true,
	initialManual = null,
	identifyAction,
	fetchAction,
	askAction,
	suggestions,
}: ManualsPanelProps): JSX.Element | null {
	const t = useTranslations();
	const panel = useMemo(
		() => ({
			title: t("jobCard.manuals.panel.title"),
			description: t("jobCard.manuals.panel.description"),
		}),
		[t],
	);
	const [match, setMatch] = useState<ManualMatch | null>(null);
	const [manual, setManual] = useState<ManualSummary | null>(initialManual);

	if (!featureEnabled) {
		return null;
	}

	return (
		<Card
			data-slot="manuals-panel"
			className="border-muted-foreground/30 shadow-sm"
		>
			<CardHeader className="pb-4">
				<CardTitle className="text-lg font-semibold">{panel.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<p className="text-sm text-muted-foreground">{panel.description}</p>
				<ManualFinder
					jobId={jobId}
					match={match}
					manual={manual}
					onMatch={setMatch}
					onManualLinked={setManual}
					identifyAction={identifyAction}
					fetchAction={fetchAction}
				/>
				<ManualQA
					manual={manual}
					askAction={askAction}
					suggestions={suggestions}
				/>
			</CardContent>
		</Card>
	);
}
