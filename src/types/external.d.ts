type AiUIPart = {
	type: string;
	text?: string;
};

interface AiUIMessage {
	id?: string;
	role: "system" | "user" | "assistant";
	content?: string;
	parts?: AiUIPart[];
	name?: string;
}

declare module "@ai-sdk/openai" {
	interface OpenAIClient {
		(modelId: string, options?: Record<string, unknown>): unknown;
		transcription(modelId: string, options?: Record<string, unknown>): unknown;
	}

	export const openai: OpenAIClient;
}

declare module "ai" {
	export type UIMessage = AiUIMessage;
	export type UIPart = AiUIPart;

	export class DefaultChatTransport {
		constructor(options: { api: string });
	}

	export function convertToModelMessages(
		messages: UIMessage[],
	): Array<{ role: UIMessage["role"]; content: string }>;

	export interface StreamTextOptions {
		model: unknown;
		system?: string;
		messages: Array<{ role: UIMessage["role"]; content: string }>;
		onFinish?: (payload: { text: string }) => void;
		onError?: (payload: { error: unknown }) => void;
	}

	export function streamText(options: StreamTextOptions): {
		toUIMessageStreamResponse: (options?: {
			headers?: Record<string, string>;
		}) => Response;
	};

	export function experimental_transcribe(options: {
		model: unknown;
		audio: Uint8Array;
		providerOptions?: Record<string, unknown>;
	}): Promise<{
		text: string;
		language?: string | null;
		confidence?: number | null;
	}>;
}

declare module "@ai-sdk/react" {
	export type UIMessage = AiUIMessage;

	export interface UseChatHelpers<TMessage = UIMessage> {
		status: string;
		messages: TMessage[];
		error?: unknown;
		sendMessage(
			message: { text: string },
			options?: { body?: Record<string, unknown> },
		): Promise<void>;
		stop(): Promise<void>;
		regenerate(): Promise<void>;
		clearError(): void;
		setMessages(messages: TMessage[]): void;
	}

	export function useChat<TMessage = UIMessage>(options: {
		transport: unknown;
	}): UseChatHelpers<TMessage> & { messages: TMessage[] };
}

declare module "tesseract.js" {
	export type CreateWorkerLoggerMessage = { progress?: number };
	export function createWorker(
		languages: string,
		options?: unknown,
		config?: {
			logger?: (message: CreateWorkerLoggerMessage) => void;
		},
	): Promise<{
		loadLanguage?: (lang: string) => Promise<void>;
		initialize?: (lang: string) => Promise<void>;
		recognize: (
			image: File | string | ArrayBufferLike,
		) => Promise<{ data: { text?: string } }>;
		terminate: () => Promise<void>;
	}>;
}
