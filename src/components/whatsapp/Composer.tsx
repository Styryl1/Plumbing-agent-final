"use client";

import { FileText, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/lib/trpc/client";

interface ComposerProps {
	conversationId: string;
	sessionActive: boolean;
	onSent?: () => void;
}

export function Composer({
	conversationId,
	sessionActive,
	onSent,
}: ComposerProps): JSX.Element {
	const tWhatsApp = useTranslations("whatsapp");
	const [message, setMessage] = useState("");

	const sendTextMutation = api.whatsapp.sendText.useMutation();

	const handleSendMessage = async (): Promise<void> => {
		if (!message.trim()) return;

		try {
			await sendTextMutation.mutateAsync({
				conversationId,
				text: message.trim(),
			});

			setMessage("");
			toast.success(tWhatsApp("composer.sent"));
			onSent?.();
		} catch (error) {
			console.error("Failed to send message:", error);
			toast.error(tWhatsApp("composer.error"));
		}
	};

	const handleSendTemplate = async (): Promise<void> => {
		try {
			// For now, send template as regular message with template indicator
			await sendTextMutation.mutateAsync({
				conversationId,
				text: message.trim(),
				templateName: "business_reply", // Default template
			});

			setMessage("");
			toast.success(tWhatsApp("composer.templateSent"));
			onSent?.();
		} catch (error) {
			console.error("Failed to send template:", error);
			toast.error(tWhatsApp("composer.templateError"));
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent): void => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (sessionActive) {
				void handleSendMessage();
			}
		}
	};

	const isLoading = sendTextMutation.isPending;

	return (
		<div className="space-y-3">
			{/* Session Warning */}
			{!sessionActive && (
				<div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
					{tWhatsApp("composer.sessionExpiredWarning")}
				</div>
			)}

			{/* Message Input */}
			<div className="flex gap-2">
				<Textarea
					value={message}
					onChange={(e) => {
						setMessage(e.target.value);
					}}
					onKeyDown={handleKeyDown}
					placeholder={
						sessionActive
							? tWhatsApp("composer.placeholder")
							: tWhatsApp("composer.templatePlaceholder")
					}
					className="min-h-[80px] resize-none"
					disabled={isLoading}
				/>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-2 justify-end">
				{sessionActive ? (
					<Button
						onClick={() => void handleSendMessage()}
						disabled={!message.trim() || isLoading}
						size="sm"
						className="min-w-[100px]"
					>
						{isLoading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								{tWhatsApp("composer.sending")}
							</>
						) : (
							<>
								<Send className="h-4 w-4 mr-2" />
								{tWhatsApp("composer.send")}
							</>
						)}
					</Button>
				) : (
					<Button
						onClick={() => void handleSendTemplate()}
						disabled={!message.trim() || isLoading}
						variant="outline"
						size="sm"
						className="min-w-[120px]"
					>
						{isLoading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								{tWhatsApp("composer.sending")}
							</>
						) : (
							<>
								<FileText className="h-4 w-4 mr-2" />
								{tWhatsApp("composer.useTemplate")}
							</>
						)}
					</Button>
				)}
			</div>

			{/* Character Count */}
			<div className="text-xs text-muted-foreground text-right">
				{message.length}/1000
			</div>
		</div>
	);
}
