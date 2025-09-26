"use client";

import {
	Loader2,
	MessageSquare,
	RefreshCw,
	Send,
	Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { useAiChat } from "~/hooks/use-ai-chat";
import type { DiagnosisSuggestion } from "~/schema/ai";

interface JobCardAiHelperProps {
	jobId: string;
	jobTitle: string;
	jobDescription: string | null;
	customerName: string | null;
	customerPhone: string | null;
	address: string | null;
	initialNotes: string;
}

type BubbleProps = {
	role: "assistant" | "user" | "system";
	text: string;
};

function MessageBubble({ role, text }: BubbleProps): JSX.Element {
	const isAssistant = role === "assistant";
	const isSystem = role === "system";
	const alignment = isAssistant ? "items-start" : "items-end";
	const background = isAssistant
		? "bg-slate-100 text-slate-900"
		: isSystem
			? "bg-slate-200 text-slate-700"
			: "bg-primary text-primary-foreground";

	return (
		<div className={`flex ${alignment}`}>
			<div
				className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${background}`}
			>
				{text}
			</div>
		</div>
	);
}

function buildContext(props: JobCardAiHelperProps): string {
	const lines: string[] = [];
	lines.push(`Klus: ${props.jobTitle}`);
	if (props.jobDescription) {
		lines.push(`Omschrijving: ${props.jobDescription}`);
	}
	const customerName = props.customerName?.trim();
	const customerPhone = props.customerPhone?.trim();
	const hasCustomer =
		(customerName !== undefined && customerName.length > 0) ||
		(customerPhone !== undefined && customerPhone.length > 0);
	if (hasCustomer) {
		const resolvedName =
			customerName && customerName.length > 0 ? customerName : "Onbekend";
		const resolvedPhone =
			customerPhone && customerPhone.length > 0 ? customerPhone : "onbekend";
		lines.push(`Klant: ${resolvedName} (${resolvedPhone})`);
	}
	if (props.address) {
		lines.push(`Adres: ${props.address}`);
	}
	if (props.initialNotes.trim().length > 0) {
		lines.push(`Notities: ${props.initialNotes.trim()}`);
	}
	return lines.join("\n");
}

const clampContext = (value: string): string =>
	value.length > 1200 ? `${value.slice(0, 1197)}…` : value;

const PROMPT_KEYS = ["summary", "closing", "troubleshoot"] as const;

export function JobCardAiHelper(props: JobCardAiHelperProps): JSX.Element {
	const t = useTranslations();
	const initialContext = useMemo(
		() => clampContext(buildContext(props)),
		[props],
	);
	const quickPrompts = useMemo(
		() =>
			PROMPT_KEYS.map((key) =>
				t(`jobCard.ai.prompts.${key}` as Parameters<typeof t>[0]),
			),
		[t],
	);

	const {
		messages,
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		isLoading,
		errorKey,
		suggestion,
		resetConversation,
		setExtraNotes,
		regenerate,
	} = useAiChat({
		jobId: props.jobId,
		customerId: null,
	});

	const [contextNotes, setContextNotes] = useState(initialContext);

	useEffect(() => {
		setExtraNotes(contextNotes);
	}, [contextNotes, setExtraNotes]);

	useEffect(() => {
		setContextNotes(initialContext);
	}, [initialContext]);

	const handlePrompt = (prompt: string): void => {
		setInput(prompt);
	};

	const renderSuggestion = (
		value: DiagnosisSuggestion | null,
	): JSX.Element | null => {
		if (!value) return null;
		const confidencePercent = Math.round(value.confidence * 100);
		return (
			<div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
				<div className="flex items-center justify-between">
					<p className="font-semibold text-slate-800">
						{t("jobCard.ai.suggestionTitle")}
					</p>
					<Badge variant="outline" className="text-xs">
						{confidencePercent}%
					</Badge>
				</div>
				<p className="text-slate-700">{value.issue}</p>
				{value.notes.length > 0 ? (
					<ul className="list-disc space-y-1 pl-4 text-slate-600">
						{value.notes.map((note, index) => (
							<li key={`note-${index}`}>{note}</li>
						))}
					</ul>
				) : null}
				<div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
					<div>
						<p className="font-medium uppercase tracking-wide">
							{t("jobCard.ai.urgency")}
						</p>
						<p>{t(`jobCard.ai.urgencyLevels.${value.urgency}`)}</p>
					</div>
					<div>
						<p className="font-medium uppercase tracking-wide">
							{t("jobCard.ai.labor")}
						</p>
						<p>
							{value.labor_hours.toFixed(1)} {t("jobCard.ai.hours")}
						</p>
					</div>
				</div>
			</div>
		);
	};

	const errorMessage = errorKey
		? t(`jobCard.ai.errors.${errorKey}` as const)
		: null;

	return (
		<Card className="shadow-none border-slate-200">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="flex items-center gap-2 text-base font-semibold">
					<Sparkles className="h-4 w-4 text-primary" />
					{t("jobCard.ai.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<label
						className="text-xs font-medium text-slate-600"
						htmlFor="job-ai-context"
					>
						{t("jobCard.ai.contextLabel")}
					</label>
					<Textarea
						id="job-ai-context"
						value={contextNotes}
						onChange={(event) => {
							setContextNotes(event.target.value);
						}}
						rows={3}
						className="text-sm"
					/>
				</div>

				<div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-3">
					{messages.length === 0 ? (
						<div className="flex items-center gap-2 text-sm text-slate-500">
							<MessageSquare className="h-4 w-4" />
							<span>{t("jobCard.ai.emptyState")}</span>
						</div>
					) : (
						messages.map((message) => (
							<MessageBubble
								key={message.id ?? `${message.role}-${Math.random()}`}
								role={message.role}
								text={message.content ?? ""}
							/>
						))
					)}
				</div>

				{renderSuggestion(suggestion)}

				{errorMessage ? (
					<p className="text-xs text-red-600">{errorMessage}</p>
				) : null}

				<form onSubmit={handleSubmit} className="space-y-2">
					<Textarea
						value={input}
						onChange={handleInputChange}
						placeholder={t("jobCard.ai.placeholder")}
						rows={3}
					/>
					<div className="flex flex-wrap items-center gap-2">
						{quickPrompts.map((prompt) => (
							<Button
								type="button"
								key={prompt}
								variant="outline"
								size="sm"
								onClick={() => {
									handlePrompt(prompt);
								}}
								disabled={isLoading}
								className="text-xs"
							>
								{prompt}
							</Button>
						))}
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="submit"
							disabled={isLoading}
							className="flex items-center gap-2"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
							{t("jobCard.ai.send")}
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() => {
								resetConversation();
							}}
							disabled={isLoading}
							className="flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							{t("jobCard.ai.reset")}
						</Button>
					</div>
					{messages.length > 0 && !isLoading ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								void regenerate();
							}}
							className="text-xs text-slate-500"
						>
							{t("jobCard.ai.regenerate")}
						</Button>
					) : null}
				</form>
			</CardContent>
		</Card>
	);
}
