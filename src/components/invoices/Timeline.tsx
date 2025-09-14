"use client";

import { formatDistanceToNow } from "date-fns";
import { enUS, nl } from "date-fns/locale";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	DollarSign,
	MessageSquare,
	Send,
	UserX,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { JSX } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { parseZdt } from "~/lib/time";
import { api } from "~/lib/trpc/client";

export interface TimelineProps {
	invoiceId: string;
}

/**
 * Timeline component for invoice lifecycle events (S10)
 * Shows chronologically ordered events with i18n labels and relative time
 */
export function Timeline({ invoiceId }: TimelineProps): JSX.Element {
	const t = useTranslations();
	const locale = useLocale();
	const currentLocale = locale === "nl" ? nl : enUS;

	// Map event kinds to i18n keys to avoid dynamic template literals
	type EventKind =
		| "created"
		| "sent"
		| "paid"
		| "reminder_sent"
		| "reminder_error"
		| "reminder_skipped"
		| "manual_follow_up";

	type I18nKey = Parameters<typeof t>[0];
	const eventKindKeys: Record<EventKind, I18nKey> = {
		created: "invoice.timeline.created" as I18nKey,
		sent: "invoice.timeline.sent" as I18nKey,
		paid: "invoice.timeline.paid" as I18nKey,
		reminder_sent: "invoice.timeline.reminder_sent" as I18nKey,
		reminder_error: "invoice.timeline.reminder_error" as I18nKey,
		reminder_skipped: "invoice.timeline.reminder_skipped" as I18nKey,
		manual_follow_up: "invoice.timeline.manual_follow_up" as I18nKey,
	};

	const {
		data: timelineEvents,
		isLoading,
		error,
	} = api.invoices.timeline.getByInvoiceId.useQuery({
		id: invoiceId,
	});

	/**
	 * Get icon component for timeline event kind
	 */
	const getEventIcon = (kind: string): JSX.Element => {
		switch (kind) {
			case "created":
				return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
			case "sent":
				return <Send className="h-4 w-4 text-green-600" />;
			case "paid":
				return <DollarSign className="h-4 w-4 text-emerald-600" />;
			case "reminder_sent":
				return <MessageSquare className="h-4 w-4 text-orange-600" />;
			case "reminder_error":
				return <AlertCircle className="h-4 w-4 text-red-600" />;
			case "reminder_skipped":
				return <UserX className="h-4 w-4 text-gray-600" />;
			case "manual_follow_up":
				return <Clock className="h-4 w-4 text-purple-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-600" />;
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("invoice.timeline.heading")}</CardTitle>
					<CardDescription>Loading timeline...</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex gap-3">
								<div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse" />
								<div className="flex-1 space-y-1">
									<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
									<div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("invoice.timeline.heading")}</CardTitle>
					<CardDescription>{t("invoice.timeline.loadError")}</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{t("invoice.timeline.loadErrorDescription")}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (!timelineEvents || timelineEvents.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("invoice.timeline.heading")}</CardTitle>
					<CardDescription>{t("invoice.timeline.noEvents")}</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{t("invoice.timeline.noEventsDescription")}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("invoice.timeline.heading")}</CardTitle>
				<CardDescription>{t("invoice.timeline.description")}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4" role="list" aria-label="Invoice timeline">
					{timelineEvents.map((event, index) => {
						const eventDate = parseZdt(event.at);
						const jsDate = new globalThis.Date(eventDate.epochMilliseconds);
						const relativeTime = formatDistanceToNow(jsDate, {
							addSuffix: true,
							locale: currentLocale,
						});

						return (
							<div
								key={`${event.at}-${index}`}
								className="flex gap-3 items-start"
								role="listitem"
							>
								<div className="flex-shrink-0 mt-0.5">
									{getEventIcon(event.kind)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-foreground">
											{t(eventKindKeys[event.kind as EventKind])}
										</span>
										<span className="text-xs text-muted-foreground">
											{relativeTime}
										</span>
									</div>
									{event.note && (
										<p className="text-xs text-muted-foreground mt-1">
											{event.note}
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
