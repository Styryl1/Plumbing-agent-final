"use client";

import { MessageSquare, Navigation, Phone, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { TZ } from "~/lib/calendar-temporal";
import { api } from "~/lib/trpc/client";

function formatTimeRange(
	startIso: string | null,
	endIso: string | null,
	fallback: string,
): string {
	if (!startIso || !endIso) {
		return fallback;
	}
	try {
		const start = Temporal.Instant.from(startIso).toZonedDateTimeISO(TZ);
		const end = Temporal.Instant.from(endIso).toZonedDateTimeISO(TZ);
		return `${start.toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
	} catch {
		return fallback;
	}
}

function buildWhatsappLink(phone: string | null): string {
	if (!phone) return "#";
	const normalized = phone.replace(/[^\d+]/g, "");
	return `https://wa.me/${normalized}`;
}

function buildTelLink(phone: string | null): string {
	if (!phone) return "#";
	return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function buildMapsLink(address: string | null): string {
	if (!address) return "#";
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function LoadingList({
	ariaLabel,
}: {
	readonly ariaLabel: string;
}): JSX.Element {
	return (
		<div className="space-y-3" aria-label={ariaLabel}>
			{[0, 1, 2].map((index) => (
				<div
					key={index}
					className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
				>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-32" />
					<div className="flex gap-2">
						<Skeleton className="h-12 flex-1" />
						<Skeleton className="h-12 flex-1" />
						<Skeleton className="h-12 flex-1" />
					</div>
				</div>
			))}
		</div>
	);
}

function EmptyState({
	onRefresh,
	title,
	body,
	cta,
}: {
	readonly onRefresh: () => void;
	readonly title: string;
	readonly body: string;
	readonly cta: string;
}): JSX.Element {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
			<p className="mb-3 text-lg font-semibold">{title}</p>
			<p className="mb-4 text-sm">{body}</p>
			<Button onClick={onRefresh} className="min-h-12" variant="secondary">
				<RefreshCcw className="mr-2 h-4 w-4" /> {cta}
			</Button>
		</div>
	);
}

export default function TodayJobsPage(): JSX.Element {
	const { data, isLoading, refetch } = api.jobCard.getToday.useQuery();
	const t = useTranslations();

	const refreshLabel = t("jobCard.today.refresh");

	return (
		<main className="min-h-screen bg-slate-50 p-4">
			<div className="mx-auto flex max-w-3xl flex-col gap-4">
				<header className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold text-slate-900">
						{t("jobCard.today.title")}
					</h1>
					<Button
						onClick={() => {
							void refetch();
						}}
						size="icon"
						variant="outline"
						className="h-12 w-12"
					>
						<RefreshCcw className="h-5 w-5" />
						<span className="sr-only">{refreshLabel}</span>
					</Button>
				</header>
				{isLoading ? (
					<LoadingList ariaLabel={t("jobCard.today.loadingLabel")} />
				) : !data || data.length === 0 ? (
					<EmptyState
						onRefresh={() => {
							void refetch();
						}}
						title={t("jobCard.today.emptyTitle")}
						body={t("jobCard.today.emptyBody")}
						cta={refreshLabel}
					/>
				) : (
					<ul className="space-y-3">
						{data.map((job) => (
							<li
								key={job.jobId}
								className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="text-xs uppercase text-slate-500">
											{formatTimeRange(
												job.startsAtISO,
												job.endsAtISO,
												t("jobCard.today.notScheduled"),
											)}
										</p>
										<h2 className="text-xl font-semibold text-slate-900">
											{job.title}
										</h2>
										<p className="text-sm text-slate-600">
											{job.address ?? t("jobCard.client.header.addressUnknown")}
										</p>
										<p className="text-sm text-slate-600">
											{job.customerName ??
												t("jobCard.client.header.customerUnknown")}
										</p>
									</div>
									<div className="flex flex-wrap items-center justify-end gap-2">
										<span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
											{t(`jobCard.status.buttons.${job.status}`)}
										</span>
										{job.priority === "urgent" ? (
											<Badge variant="default">
												{t("jobCard.client.priority.urgent")}
											</Badge>
										) : job.priority === "emergency" ? (
											<Badge variant="destructive">
												{t("jobCard.client.priority.emergency")}
											</Badge>
										) : (
											<Badge variant="secondary">
												{t("jobCard.client.priority.normal")}
											</Badge>
										)}
										<Badge variant="outline">
											<a href={`/p/job/${job.token}`} className="underline">
												{t("jobCard.today.openCard")}
											</a>
										</Badge>
									</div>
								</div>
								<div className="mt-4 flex flex-col gap-2 sm:flex-row">
									<Button
										asChild
										variant="secondary"
										className="flex-1 min-h-12"
										aria-label={t("jobCard.today.actions.whatsapp")}
									>
										<a
											href={buildWhatsappLink(job.customerWhatsApp)}
											target="_blank"
											rel="noreferrer"
										>
											<MessageSquare className="mr-2 h-5 w-5" />{" "}
											{t("jobCard.today.whatsapp")}
										</a>
									</Button>
									<Button
										asChild
										variant="secondary"
										className="flex-1 min-h-12"
										aria-label={t("jobCard.today.actions.call")}
									>
										<a href={buildTelLink(job.customerPhone)}>
											<Phone className="mr-2 h-5 w-5" />{" "}
											{t("jobCard.today.call")}
										</a>
									</Button>
									<Button
										asChild
										variant="secondary"
										className="flex-1 min-h-12"
										aria-label={t("jobCard.today.actions.navigate")}
									>
										<a
											href={buildMapsLink(job.address)}
											target="_blank"
											rel="noreferrer"
										>
											<Navigation className="mr-2 h-5 w-5" />{" "}
											{t("jobCard.today.navigate")}
										</a>
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</main>
	);
}
