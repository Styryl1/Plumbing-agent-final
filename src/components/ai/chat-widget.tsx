"use client";

import type { UIMessage } from "@ai-sdk/react";
import {
	AlertCircle,
	Bot,
	CheckCircle2,
	Loader2,
	MessageCircle,
	RefreshCcw,
	Send,
	Sparkles,
	StopCircle,
	User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { ScreenshotUpload } from "~/components/ai/screenshot-upload";
import { VoiceInput } from "~/components/ai/voice-input";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { useAiChat } from "~/hooks/use-ai-chat";
import { cn } from "~/lib/utils";
import type { DiagnosisSuggestion } from "~/schema/ai";

function messageToText(message: UIMessage): string {
	if (!Array.isArray(message.parts)) {
		return "";
	}

	return message.parts
		.map((part) => (part.type === "text" ? (part.text ?? "") : ""))
		.join("")
		.trim();
}

function MessageBubble({
	role,
	content,
}: {
	role: "user" | "assistant" | "system";
	content: string;
}): JSX.Element {
	const isAssistant = role === "assistant";
	const isSystem = role === "system";

	return (
		<div
			className={cn(
				"flex gap-3",
				isAssistant ? "justify-start" : "justify-end",
			)}
		>
			{isAssistant && <Bot className="mt-1 h-5 w-5 text-primary" />}
			<div
				className={cn(
					"max-w-[80%] rounded-lg px-4 py-2 text-sm shadow",
					isAssistant && !isSystem
						? "bg-muted text-foreground"
						: "bg-primary text-primary-foreground",
					isSystem && "bg-secondary text-secondary-foreground",
				)}
			>
				{content.split("\n").map((line, index) => (
					<p key={`${role}-${index}`} className="whitespace-pre-wrap">
						{line}
					</p>
				))}
			</div>
			{!isAssistant && role !== "system" && (
				<User className="mt-1 h-5 w-5 text-primary" />
			)}
		</div>
	);
}

function SuggestionPanel({
	suggestion,
	isLoading,
	translate,
}: {
	suggestion: DiagnosisSuggestion | null;
	isLoading: boolean;
	translate: (
		key: string,
		values?: Record<string, string | number | Date>,
	) => string;
}): JSX.Element {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<Loader2 className="h-4 w-4 animate-spin" />
						{translate("suggestion.loading")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{translate("suggestion.loadingHint")}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (!suggestion) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{translate("suggestion.placeholderTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{translate("suggestion.placeholderBody")}
					</p>
				</CardContent>
			</Card>
		);
	}

	const confidencePercent = Math.round(suggestion.confidence * 100);

	return (
		<Card className="h-full">
			<CardHeader className="space-y-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-semibold">
						{translate("suggestion.title")}
					</CardTitle>
					<Badge variant="outline" className="text-xs font-medium">
						{translate("suggestion.reviewRequired")}
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">
					{translate("suggestion.disclaimer")}
				</p>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<div>
					<p className="font-medium">{translate("suggestion.issue")}</p>
					<p>{suggestion.issue}</p>
				</div>
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<p className="text-xs text-muted-foreground">
							{translate("suggestion.confidence")}
						</p>
						<p className="font-medium">{confidencePercent}%</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">
							{translate("suggestion.urgency")}
						</p>
						<p className="font-medium">
							{translate(`suggestion.urgencyLevels.${suggestion.urgency}`)}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">
							{translate("suggestion.laborHours")}
						</p>
						<p className="font-medium">
							{translate("suggestion.laborHoursValue", {
								value: suggestion.labor_hours.toFixed(1),
							})}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">
							{translate("suggestion.timeEstimate")}
						</p>
						<p className="font-medium">
							{suggestion.time_estimate_minutes ??
								Math.round(suggestion.labor_hours * 60)}{" "}
							{translate("suggestion.minutes")}
						</p>
					</div>
				</div>
				<div>
					<p className="text-xs text-muted-foreground mb-1">
						{translate("suggestion.materials")}
					</p>
					{suggestion.materials.length === 0 ? (
						<p>{translate("suggestion.noMaterials")}</p>
					) : (
						<ul className="space-y-1">
							{suggestion.materials.map((material, index) => (
								<li
									key={`${material.name}-${index}`}
									className="flex items-center gap-2"
								>
									<CheckCircle2 className="h-3.5 w-3.5 text-primary" />
									<div className="flex items-baseline gap-2">
										<span className="font-medium">{material.name}</span>
										{material.qty ? (
											<span className="text-xs text-muted-foreground">
												{translate("suggestion.materialQty", {
													qty: material.qty,
												})}
											</span>
										) : null}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
				{suggestion.notes.length > 0 ? (
					<div>
						<p className="text-xs text-muted-foreground mb-1">
							{translate("suggestion.notes")}
						</p>
						<ul className="list-disc space-y-1 pl-4">
							{suggestion.notes.map((note, index) => (
								<li key={`note-${index}`}>{note}</li>
							))}
						</ul>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

interface ChatPanelProps {
	conversationId?: string | null;
	customerId?: string | null;
	jobId?: string | null;
}

export function ChatPanel({
	conversationId = null,
	customerId = null,
	jobId = null,
}: ChatPanelProps = {}): JSX.Element {
	const t = useTranslations();
	const translate = (
		key: string,
		values?: Record<string, string | number | Date>,
	): string => t(`ai.${key}` as Parameters<typeof t>[0], values);
	const {
		messages,
		status,
		isLoading,
		errorKey,
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		stop,
		regenerate,
		resetConversation,
		suggestion,
		saving,
		voiceTranscript,
		setVoiceTranscript,
		ocrSnippets,
		addOcrSnippet,
		clearOcr,
		extraNotes,
		setExtraNotes,
	} = useAiChat({
		conversationId,
		customerId,
		jobId,
	});

	const errorMessage = errorKey ? translate(`errors.${errorKey}`) : null;

	const latestMessages = messages.map((message) => ({
		id: message.id,
		role: message.role,
		content: messageToText(message),
	}));

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<div className="rounded-full bg-primary/10 p-2">
						<Sparkles className="h-4 w-4 text-primary" />
					</div>
					<div>
						<p className="text-sm font-semibold">{translate("title")}</p>
						<p className="text-xs text-muted-foreground">
							{translate("subtitle")}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={resetConversation}>
						<RefreshCcw className="mr-1 h-4 w-4" />
						{translate("actions.reset")}
					</Button>
					{status === "streaming" || status === "submitted" ? (
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								void stop();
							}}
						>
							<StopCircle className="mr-1 h-4 w-4" />
							{translate("actions.stop")}
						</Button>
					) : null}
				</div>
			</header>

			<div className="flex flex-1 flex-col overflow-hidden md:flex-row">
				<div className="flex flex-1 flex-col border-b md:border-b-0 md:border-r">
					<div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
						{latestMessages.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
								<Sparkles className="mb-2 h-6 w-6" />
								<p className="font-medium">{translate("empty.title")}</p>
								<p>{translate("empty.body")}</p>
							</div>
						) : (
							<div className="space-y-4">
								{latestMessages.map((message) => (
									<MessageBubble
										key={message.id}
										role={message.role}
										content={message.content}
									/>
								))}
							</div>
						)}
					</div>

					<div className="space-y-2 border-t px-4 py-3">
						{errorMessage ? (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{errorMessage}</AlertDescription>
							</Alert>
						) : null}

						{voiceTranscript ? (
							<div className="flex items-start justify-between rounded-md border bg-muted/40 p-2 text-xs">
								<div>
									<p className="font-medium">
										{translate("voice.transcriptLabel")}
									</p>
									<p className="text-muted-foreground">{voiceTranscript}</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setVoiceTranscript(null);
									}}
								>
									{translate("voice.clear")}
								</Button>
							</div>
						) : null}

						{ocrSnippets.length > 0 ? (
							<div className="rounded-md border bg-muted/40 p-2 text-xs">
								<div className="flex items-center justify-between">
									<p className="font-medium">{translate("ocr.title")}</p>
									<Button variant="ghost" size="sm" onClick={clearOcr}>
										{translate("ocr.clear")}
									</Button>
								</div>
								<ul className="mt-1 space-y-1 text-muted-foreground">
									{ocrSnippets.map((snippet, idx) => (
										<li key={`ocr-${idx}`} className="line-clamp-2">
											{snippet}
										</li>
									))}
								</ul>
							</div>
						) : null}

						<form className="space-y-3" onSubmit={handleSubmit}>
							<Textarea
								value={input}
								onChange={handleInputChange}
								placeholder={translate("input.placeholder")}
								className="min-h-[96px]"
								disabled={isLoading}
							/>
							<Textarea
								value={extraNotes}
								onChange={(event) => {
									setExtraNotes(event.target.value);
								}}
								placeholder={translate("notes.placeholder")}
								className="min-h-[72px]"
								disabled={isLoading}
							/>
							<div className="flex flex-wrap items-center gap-2">
								<VoiceInput
									onTranscript={(transcript) => {
										setVoiceTranscript(transcript);
										if (!input.trim()) {
											setInput(transcript);
										}
									}}
									disabled={isLoading}
								/>
								<ScreenshotUpload
									onExtract={addOcrSnippet}
									disabled={isLoading}
								/>
								<div className="ml-auto flex items-center gap-2">
									<Button
										type="button"
										variant="ghost"
										onClick={() => {
											void regenerate();
										}}
										disabled={!suggestion || isLoading}
									>
										<RefreshCcw className="mr-1 h-4 w-4" />
										{translate("actions.retry")}
									</Button>
									<Button type="submit" disabled={isLoading}>
										{isLoading ? (
											<>
												<Loader2 className="mr-1 h-4 w-4 animate-spin" />
												{translate("actions.sending")}
											</>
										) : (
											<>
												<Send className="mr-1 h-4 w-4" />
												{translate("actions.send")}
											</>
										)}
									</Button>
								</div>
							</div>
						</form>
					</div>
				</div>

				<div className="w-full border-t p-4 md:w-[340px] md:border-t-0">
					<SuggestionPanel
						suggestion={suggestion}
						isLoading={isLoading || saving}
						translate={translate}
					/>
				</div>
			</div>
		</div>
	);
}

export function ChatWidget(): JSX.Element {
	const [open, setOpen] = useState(false);
	const t = useTranslations();
	const translate = (
		key: string,
		values?: Record<string, string | number | Date>,
	): string => t(`ai.${key}` as Parameters<typeof t>[0], values);

	return (
		<div className="fixed bottom-6 right-6 z-50">
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger asChild>
					<Button size="lg" className="shadow-lg">
						<MessageCircle className="mr-2 h-5 w-5" />
						{translate("widget.open")}
					</Button>
				</SheetTrigger>
				<SheetContent
					side="right"
					className="flex h-full w-full flex-col p-0 sm:max-w-lg"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>{translate("title")}</SheetTitle>
					</SheetHeader>
					<ChatPanel />
				</SheetContent>
			</Sheet>
		</div>
	);
}
