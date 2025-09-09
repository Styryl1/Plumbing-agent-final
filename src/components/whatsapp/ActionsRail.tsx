"use client";

import {
	CheckCircle,
	BanknoteIcon as Euro,
	Loader2,
	Plus,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { api } from "~/lib/trpc/client";

interface ActionsRailProps {
	conversationId: string;
}

export function ActionsRail({ conversationId }: ActionsRailProps): JSX.Element {
	const tWhatsApp = useTranslations("whatsapp");
	const tCommon = useTranslations("");
	const router = useRouter();
	const [isCreatingJob, setIsCreatingJob] = useState(false);

	const toggleStatusMutation = api.whatsapp.toggleStatus.useMutation();

	// Fetch conversation details to check if linked to customer/job/invoice
	const { data: conversationsData } = api.whatsapp.listConversations.useQuery({
		limit: 50,
	});

	const conversation = conversationsData?.items.find(
		(c) => c.conversation_id === conversationId,
	);

	const handleCreateJob = (): void => {
		setIsCreatingJob(true);
		try {
			// For now, navigate to job creation page with query params
			// In a full implementation, this would call jobs.createFromConversation
			const searchParams = new URLSearchParams({
				source: "whatsapp",
				conversationId,
				phone: conversation?.phone_number ?? "",
				name: "", // No customer name available in current structure
			});

			router.push(`/jobs/create?${searchParams.toString()}`);
			toast.success(tWhatsApp("actions.jobCreated"));
		} catch (error) {
			console.error("Failed to create job:", error);
			toast.error(tWhatsApp("actions.jobError"));
		} finally {
			setIsCreatingJob(false);
		}
	};

	const handleSendPaylink = (): void => {
		try {
			// Mock implementation - in real app, this would:
			// 1. Get invoice linked to conversation
			// 2. Generate payment link
			// 3. Send via WhatsApp
			toast.info(tWhatsApp("actions.paylinkNotImplemented"));
		} catch (error) {
			console.error("Failed to send paylink:", error);
			toast.error(tWhatsApp("actions.paylinkError"));
		}
	};

	const handleCloseConversation = async (): Promise<void> => {
		try {
			await toggleStatusMutation.mutateAsync({
				conversationId,
				status: "closed",
			});

			toast.success(tWhatsApp("actions.conversationClosed"));
			router.push("/whatsapp");
		} catch (error) {
			console.error("Failed to close conversation:", error);
			toast.error(tWhatsApp("actions.closeError"));
		}
	};

	const handleApprove = (): void => {
		try {
			// Mock control chat approve
			toast.info(tWhatsApp("control.approved"));
		} catch (error) {
			console.error("Failed to approve:", error);
			toast.error(tWhatsApp("control.approveError"));
		}
	};

	return (
		<div className="space-y-4">
			{/* Primary Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{tWhatsApp("actions.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button
						onClick={handleCreateJob}
						disabled={isCreatingJob}
						className="w-full justify-start"
						variant="outline"
					>
						{isCreatingJob ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Plus className="h-4 w-4 mr-2" />
						)}
						{tWhatsApp("actions.createJob")}
					</Button>

					<Button
						onClick={handleSendPaylink}
						disabled={true} // Disabled for now - no customer linking in current structure
						className="w-full justify-start"
						variant="outline"
					>
						<Euro className="h-4 w-4 mr-2" />
						{tWhatsApp("actions.sendPaylink")}
					</Button>

					<Separator />

					<Button
						onClick={() => void handleCloseConversation()}
						disabled={toggleStatusMutation.isPending}
						className="w-full justify-start"
						variant="destructive"
					>
						{toggleStatusMutation.isPending ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<X className="h-4 w-4 mr-2" />
						)}
						{tWhatsApp("actions.close")}
					</Button>
				</CardContent>
			</Card>

			{/* Control Chat */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{tWhatsApp("control.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">
						{tWhatsApp("control.description")}
					</p>

					<div className="flex gap-2">
						<Button
							onClick={handleApprove}
							size="sm"
							variant="outline"
							className="flex-1"
						>
							<CheckCircle className="h-3 w-3 mr-1" />
							{tWhatsApp("control.approve")}
						</Button>

						<Button
							onClick={() => void handleCloseConversation()}
							size="sm"
							variant="outline"
							className="flex-1"
						>
							<X className="h-3 w-3 mr-1" />
							{tWhatsApp("control.close")}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Conversation Info */}
			{conversation && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{tWhatsApp("info.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-xs">
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{tWhatsApp("info.status")}
							</span>
							<span>{conversation.status ?? tCommon("common.unknown")}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{tWhatsApp("info.created")}
							</span>
							<span>
								{conversation.last_message_at
									? globalThis.Temporal.Instant.from(
											conversation.last_message_at,
										)
											.toZonedDateTimeISO("Europe/Amsterdam")
											.toLocaleString("nl-NL", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
											})
									: tCommon("common.unknown")}
							</span>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
