"use client";

import { ArrowLeft, Clock, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ActionsRail } from "~/components/whatsapp/ActionsRail";
import { Composer } from "~/components/whatsapp/Composer";
import { api } from "~/lib/trpc/client";
import { mapToMessageDTO, mapToSessionInfoDTO } from "~/lib/whatsapp/mappers";

interface WhatsAppConversationPageProps {
	params: {
		conversationId: string;
	};
}

export default function WhatsAppConversationPage({
	params,
}: WhatsAppConversationPageProps): JSX.Element {
	const tWhatsApp = useTranslations("whatsapp");
	const tCommon = useTranslations("");
	const router = useRouter();
	const { conversationId } = params;

	// Fetch messages for this conversation
	const { data: messagesData, isLoading: messagesLoading } =
		api.whatsapp.getMessages.useQuery({
			conversationId,
			limit: 100,
		});

	// Fetch conversation details (filter client-side for now)
	const { data: conversationsData } = api.whatsapp.listConversations.useQuery({
		limit: 50, // Get more to find our conversation
	});

	const conversation = conversationsData?.items.find(
		(c) => c.conversation_id === conversationId,
	);
	const messages = (messagesData?.items ?? []).map(mapToMessageDTO);
	const sessionInfo = mapToSessionInfoDTO(null); // For now, default to no session

	// Mark conversation as read when component mounts
	const markReadMutation = api.whatsapp.markRead.useMutation();

	useEffect(() => {
		if (messages.length > 0) {
			const latestMessage = messages[messages.length - 1];
			if (latestMessage) {
				markReadMutation.mutate({
					conversationId,
					upToCreatedAtIso: latestMessage.createdAt,
				});
			}
		}
	}, [conversationId, messages, markReadMutation]);

	const handleBack = (): void => {
		router.push("/whatsapp");
	};

	if (messagesLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="space-y-4">
					<div className="flex items-center gap-4">
						<Button variant="outline" size="sm" onClick={handleBack}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div className="h-6 w-48 bg-muted animate-pulse rounded" />
					</div>
					<Card>
						<CardContent className="p-6">
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div
										key={i}
										className="h-16 bg-muted animate-pulse rounded"
									/>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6">
			<div className="space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button variant="outline" size="sm" onClick={handleBack}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div className="space-y-1">
							<h1 className="text-xl font-semibold flex items-center gap-2">
								<MessageCircle className="h-5 w-5" />
								{conversation?.phone_number ?? tCommon("common.unnamed")}
							</h1>
							<p className="text-sm text-muted-foreground">
								{conversation?.phone_number && `+${conversation.phone_number}`}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Badge
							variant={sessionInfo.active ? "default" : "secondary"}
							className="text-xs"
						>
							<Clock className="h-3 w-3 mr-1" />
							{sessionInfo.active
								? tWhatsApp("session.active")
								: tWhatsApp("session.expired")}
						</Badge>
						{sessionInfo.active && sessionInfo.expiresAt && (
							<div className="text-xs text-muted-foreground">
								{tWhatsApp("session.expiresAt")}{" "}
								{globalThis.Temporal.Instant.from(sessionInfo.expiresAt)
									.toZonedDateTimeISO("Europe/Amsterdam")
									.toLocaleString("nl-NL", {
										hour: "2-digit",
										minute: "2-digit",
									})}
							</div>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Messages Panel */}
					<div className="lg:col-span-3">
						<Card className="h-[600px] flex flex-col">
							<CardHeader className="flex-shrink-0">
								<CardTitle className="text-base">
									{tWhatsApp("conversation.title")}
								</CardTitle>
							</CardHeader>

							{/* Messages */}
							<CardContent className="flex-1 overflow-y-auto space-y-4">
								{messages.length === 0 ? (
									<div className="flex-1 flex items-center justify-center text-center">
										<div>
											<MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
											<h3 className="text-lg font-semibold mb-2">
												{tWhatsApp("conversation.empty.title")}
											</h3>
											<p className="text-muted-foreground">
												{tWhatsApp("conversation.empty.description")}
											</p>
										</div>
									</div>
								) : (
									messages.map((message) => (
										<div
											key={message.id}
											className={`flex ${
												message.dir === "out" ? "justify-end" : "justify-start"
											}`}
										>
											<div
												className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
													message.dir === "out"
														? "bg-blue-500 text-white"
														: "bg-muted"
												}`}
											>
												{message.text && (
													<p className="text-sm">{message.text}</p>
												)}
												{message.mediaUrl && (
													<div className="text-xs opacity-75 mt-1">
														{tWhatsApp("message.media")}
													</div>
												)}
												<div
													className={`text-xs mt-1 ${
														message.dir === "out"
															? "text-blue-100"
															: "text-muted-foreground"
													}`}
												>
													{globalThis.Temporal.Instant.from(message.createdAt)
														.toZonedDateTimeISO("Europe/Amsterdam")
														.toLocaleString("nl-NL", {
															hour: "2-digit",
															minute: "2-digit",
														})}
												</div>
											</div>
										</div>
									))
								)}
							</CardContent>

							{/* Composer */}
							<div className="flex-shrink-0 border-t p-4">
								<Composer
									conversationId={conversationId}
									sessionActive={sessionInfo.active}
								/>
							</div>
						</Card>
					</div>

					{/* Actions Rail */}
					<div className="lg:col-span-1">
						<ActionsRail conversationId={conversationId} />
					</div>
				</div>
			</div>
		</div>
	);
}
