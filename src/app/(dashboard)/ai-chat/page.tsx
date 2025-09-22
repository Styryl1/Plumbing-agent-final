import type { JSX } from "react";
import { ChatPanel } from "~/components/ai/chat-widget";

export default function AiChatPage(): JSX.Element {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
			<ChatPanel />
		</div>
	);
}
