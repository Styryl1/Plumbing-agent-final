"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import type { ManualSummary } from "~/components/job-card/manual-finder";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";

export type ManualAnswerCitation = {
	page: number;
	snippet: string;
	url: string;
};

export type ManualAnswerPayload = {
	answer: string;
	citations: ManualAnswerCitation[];
	safetyMode?: boolean;
};

type AskAction = (input: {
	question: string;
	manual: ManualSummary;
}) => Promise<ManualAnswerPayload>;

type ManualQAProps = {
	manual: ManualSummary | null;
	askAction?: AskAction | undefined;
	suggestions?: string[] | undefined;
};

export function ManualQA({
	manual,
	askAction,
	suggestions,
}: ManualQAProps): JSX.Element {
	const t = useTranslations();
	const [question, setQuestion] = useState("");
	const [result, setResult] = useState<ManualAnswerPayload | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const suggestionLabels = useMemo(() => {
		if (Array.isArray(suggestions) && suggestions.length > 0) {
			return suggestions;
		}

		return [
			t("jobCard.manuals.qa.suggestions.resetCode"),
			t("jobCard.manuals.qa.suggestions.errorE5"),
			t("jobCard.manuals.qa.suggestions.lowPressure"),
		];
	}, [suggestions, t]);

	const handleSuggestion = useCallback((value: string) => {
		setQuestion(value);
		setError(null);
	}, []);

	const handleAsk = useCallback(async () => {
		const trimmed = question.trim();
		if (trimmed.length === 0) {
			setError(t("jobCard.manuals.qa.errors.required"));
			return;
		}

		if (!manual) {
			setError(t("jobCard.manuals.qa.errors.noManual"));
			return;
		}

		setLoading(true);
		setError(null);

		try {
			if (!askAction) {
				throw new Error(t("jobCard.manuals.qa.errors.notConfigured"));
			}

			const answer = await askAction({ question: trimmed, manual });
			setResult(answer);
			setQuestion("");
		} catch (err) {
			const message =
				err instanceof Error && err.message.length > 0
					? err.message
					: t("jobCard.manuals.qa.errors.generic");
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [askAction, manual, question, t]);

	const answerBullets = useMemo(() => {
		if (!result) {
			return [] as string[];
		}

		return result.answer
			.split(/\n+/)
			.map((line) => line.trim())
			.filter(Boolean);
	}, [result]);

	return (
		<Card
			data-slot="manual-qa"
			className="border-muted-foreground/20 shadow-none"
		>
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-semibold">
					{t("jobCard.manuals.qa.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					{t("jobCard.manuals.qa.description")}
				</p>

				<div className="space-y-3">
					<Textarea
						value={question}
						onChange={(event) => {
							setQuestion(event.target.value);
						}}
						placeholder={t("jobCard.manuals.qa.placeholder")}
						disabled={loading || !manual}
						rows={3}
					/>
					<div className="flex flex-wrap items-center gap-2">
						<Button onClick={handleAsk} disabled={loading || !manual}>
							{loading
								? t("jobCard.manuals.qa.loading")
								: t("jobCard.manuals.qa.actions.ask")}
						</Button>
						{suggestionLabels.map((label) => (
							<Button
								key={label}
								variant="outline"
								size="sm"
								onClick={() => {
									handleSuggestion(label);
								}}
								disabled={loading || !manual}
							>
								{label}
							</Button>
						))}
					</div>
				</div>

				{!manual && (
					<Alert variant="default" className="bg-muted/60">
						<AlertTitle>{t("jobCard.manuals.qa.disabled.title")}</AlertTitle>
						<AlertDescription>
							{t("jobCard.manuals.qa.disabled.body")}
						</AlertDescription>
					</Alert>
				)}

				{error && (
					<Alert variant="destructive">
						<AlertTitle>{t("jobCard.manuals.qa.errors.title")}</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{result ? (
					<div className="space-y-3">
						{result.safetyMode && (
							<Alert variant="destructive">
								<AlertTitle>{t("jobCard.manuals.qa.safety.title")}</AlertTitle>
								<AlertDescription>
									{t("jobCard.manuals.qa.safety.body")}
								</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							{answerBullets.length > 0 ? (
								<ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
									{answerBullets.map((item, index) => (
										<li key={`bullet-${index}`}>{item}</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-foreground">{result.answer}</p>
							)}
						</div>

						<div className="space-y-2">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{t("jobCard.manuals.qa.citations.title")}
							</h3>
							<div className="space-y-2">
								{result.citations.map((citation) => (
									<div
										key={`${citation.page}-${citation.url}`}
										className="rounded-lg border border-muted-foreground/20 p-3 text-sm"
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<Badge variant="outline" className="text-xs">
												{t("jobCard.manuals.qa.citations.page", {
													page: citation.page,
												})}
											</Badge>
											<a
												href={citation.url}
												target="_blank"
												rel="noreferrer"
												className="text-xs font-medium text-primary underline-offset-4 hover:underline"
											>
												{t("jobCard.manuals.qa.citations.open")}
											</a>
										</div>
										<p className="mt-2 text-xs text-muted-foreground">
											“{citation.snippet}”
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						{t("jobCard.manuals.qa.emptyState")}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
