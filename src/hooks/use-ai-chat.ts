"use client";

import { type UIMessage, type UseChatHelpers, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
	type ChangeEvent,
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { api } from "~/lib/trpc/client";
import {
	type AiRunInput,
	type DiagnosisSuggestion,
	DiagnosisSuggestionSchema,
} from "~/schema/ai";

const MODEL_ID = "gpt-4.1-mini";

const generateMessageId = (): string => {
	const cryptoApi = globalThis.crypto as Crypto & {
		randomUUID?: () => string;
	};
	if (typeof cryptoApi.randomUUID === "function") {
		return cryptoApi.randomUUID();
	}
	return `msg-${Math.random().toString(36).slice(2)}`;
};

export type ChatErrorKey = "missingInput" | "sendFailed" | "invalidResponse";

function extractText(message: UIMessage): string {
	const { parts } = message;
	if (!Array.isArray(parts)) {
		return "";
	}
	return parts
		.map((part) => (part.type === "text" ? (part.text ?? "") : ""))
		.join("")
		.trim();
}

type SanitizedMessage = AiRunInput["messages"][number];

function normalizeRole(role: UIMessage["role"]): SanitizedMessage["role"] {
	switch (role) {
		case "assistant":
		case "system":
		case "user":
			return role;
		default:
			return "system";
	}
}

function sanitizeMessages(messages: UIMessage[]): SanitizedMessage[] {
	return messages.map((message) => ({
		id:
			typeof message.id === "string" && message.id.length > 0
				? message.id
				: generateMessageId(),
		role: normalizeRole(message.role),
		content: extractText(message),
	}));
}

export interface UseAiChatOptions {
	onSuggestion?(this: void, suggestion: DiagnosisSuggestion): void;
	locale?: "nl" | "en";
	conversationId?: string | null;
	customerId?: string | null;
	jobId?: string | null;
}

type ChatHelpers = UseChatHelpers<UIMessage>;

export type UseAiChatResult = {
	messages: UIMessage[];
	status: ChatHelpers["status"];
	isLoading: boolean;
	errorKey: ChatErrorKey | null;
	input: string;
	setInput: (value: string) => void;
	handleInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
	stop: ChatHelpers["stop"];
	regenerate: ChatHelpers["regenerate"];
	resetConversation: () => void;
	suggestion: DiagnosisSuggestion | null;
	saving: boolean;
	voiceTranscript: string | null;
	setVoiceTranscript: (value: string | null) => void;
	ocrSnippets: string[];
	addOcrSnippet: (text: string) => void;
	clearOcr: () => void;
	extraNotes: string;
	setExtraNotes: (notes: string) => void;
};

export const useAiChat = (options: UseAiChatOptions = {}): UseAiChatResult => {
	const {
		locale = "nl",
		conversationId = null,
		customerId = null,
		jobId = null,
	} = options;
	const [input, setInput] = useState("");
	const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
	const [ocrSnippets, setOcrSnippets] = useState<string[]>([]);
	const [extraNotes, setExtraNotes] = useState("");
	const [suggestion, setSuggestion] = useState<DiagnosisSuggestion | null>(
		null,
	);
	const [errorKey, setErrorKey] = useState<ChatErrorKey | null>(null);

	const transport = useMemo(
		() => new DefaultChatTransport({ api: "/api/ai/chat" }),
		[],
	);

	const chat = useChat({ transport });

	const recordRun = api.aiBrain.recordRun.useMutation();
	const modelRef = useRef<string>(MODEL_ID);
	const startedAtRef = useRef<number | null>(null);
	const lastAssistantIdRef = useRef<string | null>(null);
	const sanitizedMessagesRef = useRef<SanitizedMessage[]>([]);
	const onSuggestionRef = useRef<UseAiChatOptions["onSuggestion"]>(undefined);

	useEffect(() => {
		onSuggestionRef.current = options.onSuggestion;
	}, [options.onSuggestion]);

	const addOcrSnippet = useCallback((text: string) => {
		setOcrSnippets((prev) => {
			const trimmed = text.trim();
			if (trimmed.length === 0) {
				return prev;
			}
			return [...prev, trimmed];
		});
	}, []);

	const clearOcr = useCallback(() => {
		setOcrSnippets([]);
	}, []);

	const sendCurrentMessage = useCallback(async () => {
		const trimmedInput = input.trim();
		const trimmedVoice =
			typeof voiceTranscript === "string" ? voiceTranscript.trim() : "";
		const trimmedNotes = extraNotes.trim();
		const voiceContext = trimmedVoice.length > 0 ? trimmedVoice : null;
		const ocrContext = ocrSnippets.length > 0 ? ocrSnippets.join("\n\n") : null;
		const notesContext = trimmedNotes.length > 0 ? trimmedNotes : null;
		const hasTypedInput = trimmedInput.length > 0;
		const hasVoiceContext = voiceContext !== null;
		const hasOcrContext = ocrContext !== null;

		if (!hasTypedInput && !hasVoiceContext && !hasOcrContext) {
			setErrorKey("missingInput");
			return;
		}

		setErrorKey(null);
		chat.clearError();
		modelRef.current = MODEL_ID;
		startedAtRef.current = performance.now();

		const messageText = hasTypedInput
			? trimmedInput
			: (voiceContext ?? ocrContext ?? "Context update");

		try {
			await chat.sendMessage(
				{ text: messageText },
				{
					body: {
						context: {
							voiceTranscript: voiceContext,
							ocrText: ocrContext,
							extraNotes: notesContext,
							locale,
						},
					},
				},
			);
			setInput("");
		} catch (sendError) {
			console.error("AI chat sendMessage failed", sendError);
			setErrorKey("sendFailed");
		}
	}, [chat, extraNotes, input, locale, ocrSnippets, voiceTranscript]);

	const handleInputChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setInput(event.target.value);
		},
		[],
	);

	const handleSubmit = useCallback(
		(event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void sendCurrentMessage();
		},
		[sendCurrentMessage],
	);

	const stopChat = useCallback(async () => {
		await chat.stop();
	}, [chat]);
	const regenerateChat = useCallback(async () => {
		await chat.regenerate();
	}, [chat]);

	useEffect(() => {
		sanitizedMessagesRef.current = sanitizeMessages(chat.messages);
	}, [chat.messages]);

	useEffect(() => {
		if (chat.status !== "ready") {
			return;
		}

		const assistant = [...chat.messages]
			.reverse()
			.find((message) => message.role === "assistant");

		if (!assistant || assistant.id === lastAssistantIdRef.current) {
			return;
		}

		const rawText = extractText(assistant);
		if (rawText.length === 0) {
			return;
		}

		try {
			const parsed = DiagnosisSuggestionSchema.parse(JSON.parse(rawText));
			setErrorKey(null);
			setSuggestion(parsed);
			onSuggestionRef.current?.(parsed);
			lastAssistantIdRef.current = assistant.id ?? null;

			const latency = startedAtRef.current
				? Math.max(0, Math.round(performance.now() - startedAtRef.current))
				: 0;

			const trimmedVoice = voiceTranscript?.trim();
			const trimmedNotes = extraNotes.trim();
			const runInput: AiRunInput = {
				messages: sanitizedMessagesRef.current,
				voiceTranscript:
					trimmedVoice && trimmedVoice.length > 0 ? trimmedVoice : null,
				ocrSnippets: ocrSnippets.length > 0 ? ocrSnippets : undefined,
				extraNotes: trimmedNotes.length > 0 ? trimmedNotes : null,
				locale,
			};

			void recordRun
				.mutateAsync({
					input: runInput,
					output: parsed,
					model: modelRef.current,
					latencyMs: latency,
					conversationId: conversationId ?? undefined,
					customerId: customerId ?? undefined,
					jobId: jobId ?? undefined,
				})
				.catch((err) => {
					console.error("Failed to persist AI run", err);
				});
		} catch (parseError) {
			console.error("Failed to parse AI response", parseError, { rawText });
			setErrorKey("invalidResponse");
		}
	}, [
		chat.messages,
		chat.status,
		extraNotes,
		locale,
		ocrSnippets,
		recordRun,
		voiceTranscript,
		conversationId,
		customerId,
		jobId,
	]);

	const resetConversation = useCallback(() => {
		void stopChat();
		chat.setMessages([]);
		chat.clearError();
		sanitizedMessagesRef.current = [];
		setSuggestion(null);
		setErrorKey(null);
		setVoiceTranscript(null);
		setOcrSnippets([]);
		setExtraNotes("");
		setInput("");
		startedAtRef.current = null;
		lastAssistantIdRef.current = null;
	}, [chat, stopChat]);

	const hasTransportError = chat.error != null;
	const combinedErrorKey: ChatErrorKey | null =
		errorKey ?? (hasTransportError ? "sendFailed" : null);
	const isLoading = ["streaming", "submitted"].includes(chat.status);

	return {
		messages: chat.messages,
		status: chat.status,
		isLoading,
		errorKey: combinedErrorKey,
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		stop: stopChat,
		regenerate: regenerateChat,
		resetConversation,
		suggestion,
		saving: recordRun.isPending,
		voiceTranscript,
		setVoiceTranscript,
		ocrSnippets,
		addOcrSnippet,
		clearOcr,
		extraNotes,
		setExtraNotes,
	};
};
