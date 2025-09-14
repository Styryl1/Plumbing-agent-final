"use client";

import { Clock, MessageCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { api } from "~/lib/trpc/client";
import { mapToLeadDTO } from "~/lib/whatsapp/mappers";

export default function WhatsAppLeadsPage(): JSX.Element {
	const t = useTranslations();
	const router = useRouter();

	// Fetch leads using existing tRPC procedure
	const { data: leadsData, isLoading } = api.whatsapp.listLeads.useQuery({
		limit: 50,
	});

	// Map server data to DTOs
	const leads = leadsData?.items.map(mapToLeadDTO) ?? [];

	const handleRowClick = (conversationId: string): void => {
		router.push(`/whatsapp/${conversationId}`);
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageCircle className="h-5 w-5" />
								{t("whatsapp.leads.title")}
							</CardTitle>
							<CardDescription>
								{t("whatsapp.leads.description")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="h-12 bg-muted animate-pulse rounded"
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
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<MessageCircle className="h-5 w-5" />
									{t("whatsapp.leads.title")}
								</CardTitle>
								<CardDescription>
									{t("whatsapp.leads.description")}
								</CardDescription>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Users className="h-4 w-4" />
								{leads.length} {t("whatsapp.leads.count")}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{leads.length === 0 ? (
							<div className="text-center py-8">
								<MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
								<h3 className="text-lg font-semibold mb-2">
									{t("whatsapp.leads.empty.title")}
								</h3>
								<p className="text-muted-foreground mb-4">
									{t("whatsapp.leads.empty.description")}
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("whatsapp.leads.table.contact")}</TableHead>
										<TableHead>
											{t("whatsapp.leads.table.lastMessage")}
										</TableHead>
										<TableHead>{t("whatsapp.leads.table.unread")}</TableHead>
										<TableHead>{t("whatsapp.leads.table.session")}</TableHead>
										<TableHead>
											{t("whatsapp.leads.table.lastActivity")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{leads.map((lead) => (
										<TableRow
											key={lead.id}
											className="cursor-pointer hover:bg-muted/50"
											onClick={() => {
												handleRowClick(lead.id);
											}}
										>
											<TableCell>
												<div className="space-y-1">
													<div className="font-medium">
														{lead.name ?? t("common.unnamed")}
													</div>
													<div className="text-sm text-muted-foreground">
														{lead.phoneMasked}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<div className="max-w-xs truncate text-sm text-muted-foreground">
													{lead.lastSnippet}
												</div>
											</TableCell>
											<TableCell>
												{lead.unreadCount > 0 && (
													<Badge variant="destructive" className="text-xs">
														{lead.unreadCount}
													</Badge>
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant={lead.sessionActive ? "default" : "secondary"}
													className="text-xs"
												>
													<Clock className="h-3 w-3 mr-1" />
													{lead.sessionActive
														? t("whatsapp.session.active")
														: t("whatsapp.session.expired")}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{globalThis.Temporal.Instant.from(lead.lastMessageAt)
													.toZonedDateTimeISO("Europe/Amsterdam")
													.toLocaleString("nl-NL", {
														day: "2-digit",
														month: "2-digit",
														hour: "2-digit",
														minute: "2-digit",
													})}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
