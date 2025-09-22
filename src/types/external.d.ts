declare module "@ai-sdk/openai" {
	export const openai: any;
}

declare module "ai" {
	export type UIMessage = any;
	export class DefaultChatTransport<TMessage = any> {
		constructor(options: { api: string });
	}
export function convertToModelMessages(messages: unknown): any[];
	export function streamText(options: unknown): {
		toUIMessageStreamResponse: (options?: unknown) => Response;
	};
	export function experimental_transcribe(options: unknown): Promise<{
		text: string;
		language?: string;
		confidence?: number;
	}>;
}

declare module "@ai-sdk/react" {
	export type UIMessage = any;
export type UseChatHelpers<TMessage = any> = {
	status: string;
	messages: TMessage[];
	error?: unknown;
	sendMessage:
		|
			((
				message: { text: string },
				options?: { body?: Record<string, unknown> },
			) => Promise<void>)
		| ((message: { text: string }) => Promise<void>);
	stop: () => Promise<void>;
	regenerate: () => Promise<void>;
	clearError: () => void;
	setMessages: (messages: TMessage[]) => void;
};
export function useChat(options: {
	transport: unknown;
}): UseChatHelpers & { messages: UIMessage[] };
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
