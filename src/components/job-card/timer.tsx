"use client";

import { PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { minutesBetween, nowZoned, round5, TZ } from "~/lib/calendar-temporal";

export interface JobTimerState {
	readonly startedAtISO: string | null;
	readonly actualMinutes: number;
	readonly displayedMinutes: number;
	readonly running: boolean;
	readonly locked: boolean;
}

interface JobTimerProps {
	readonly timer: JobTimerState;
	readonly onStart: () => Promise<void> | void;
	readonly onPause: () => Promise<void> | void;
	readonly onComplete: () => Promise<void> | void;
	readonly isProcessing?: boolean;
	readonly isOffline?: boolean;
}

function computeDisplayMinutes(timer: JobTimerState): number {
	if (!timer.running || !timer.startedAtISO) {
		return round5(timer.actualMinutes);
	}
	const started = Temporal.Instant.from(timer.startedAtISO).toZonedDateTimeISO(
		TZ,
	);
	const now = nowZoned();
	const elapsed = minutesBetween(started, now);
	return round5(timer.actualMinutes + elapsed);
}

function formatStartTime(timer: JobTimerState): string | null {
	if (!timer.startedAtISO) {
		return null;
	}
	const started = Temporal.Instant.from(timer.startedAtISO).toZonedDateTimeISO(
		TZ,
	);
	return started.toLocaleString("nl-NL", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function JobTimer({
	timer,
	onStart,
	onPause,
	onComplete,
	isProcessing = false,
	isOffline = false,
}: JobTimerProps): JSX.Element {
	const t = useTranslations();
	const [pendingAction, setPendingAction] = useState<
		"start" | "pause" | "complete" | null
	>(null);
	const [displayedMinutes, setDisplayedMinutes] = useState(() =>
		computeDisplayMinutes(timer),
	);

	useEffect(() => {
		setDisplayedMinutes(computeDisplayMinutes(timer));
		if (!timer.running || !timer.startedAtISO) {
			return;
		}
		const interval = window.setInterval(() => {
			setDisplayedMinutes(computeDisplayMinutes(timer));
		}, 60_000);
		return () => {
			window.clearInterval(interval);
		};
	}, [timer]);

	const startedLabel = useMemo(() => formatStartTime(timer), [timer]);

	const handleAction = useCallback(
		async (
			action: "start" | "pause" | "complete",
			handler: () => Promise<void> | void,
		) => {
			try {
				setPendingAction(action);
				await handler();
			} catch (error) {
				console.error(error);
			} finally {
				setPendingAction(null);
			}
		},
		[],
	);

	const startDisabled =
		timer.locked || timer.running || isProcessing || pendingAction !== null;
	const pauseDisabled =
		!timer.running || isProcessing || pendingAction !== null;
	const completeDisabled =
		timer.locked || isProcessing || pendingAction !== null;

	return (
		<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						{t("jobCard.timer.title")}
					</p>
					<p className="text-3xl font-semibold text-slate-900">
						{displayedMinutes}
						<span className="ml-1 text-base font-normal text-slate-600">
							{t("jobCard.timer.minutesShort")}
						</span>
					</p>
					<p className="text-sm text-slate-600">
						{timer.running && startedLabel
							? t("jobCard.timer.startedAt", { time: startedLabel })
							: t("jobCard.timer.total", {
									minutes: round5(timer.actualMinutes),
								})}
					</p>
					{isOffline ? (
						<p className="mt-2 text-sm text-amber-600">
							{t("jobCard.timer.offline")}
						</p>
					) : null}
				</div>
				<Badge
					variant={
						timer.locked ? "secondary" : timer.running ? "default" : "outline"
					}
				>
					{timer.locked
						? t("jobCard.timer.badge.locked")
						: timer.running
							? t("jobCard.timer.badge.running")
							: t("jobCard.timer.badge.paused")}
				</Badge>
			</div>

			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{timer.running && startedLabel
					? t("jobCard.timer.live.running", {
							time: startedLabel,
							minutes: displayedMinutes,
						})
					: t("jobCard.timer.live.paused", { minutes: displayedMinutes })}
			</div>

			<div className="mt-4 flex flex-col gap-3 sm:flex-row">
				<Button
					type="button"
					size="lg"
					className="flex-1 min-h-12"
					disabled={startDisabled}
					onClick={() => {
						void handleAction("start", onStart);
					}}
					aria-label={t("jobCard.timer.buttons.start")}
				>
					<PlayCircle className="mr-2 h-5 w-5" />{" "}
					{t("jobCard.timer.buttons.start")}
				</Button>
				<Button
					type="button"
					size="lg"
					className="flex-1 min-h-12"
					variant="secondary"
					disabled={pauseDisabled}
					onClick={() => {
						void handleAction("pause", onPause);
					}}
					aria-label={t("jobCard.timer.buttons.pause")}
				>
					<PauseCircle className="mr-2 h-5 w-5" />{" "}
					{t("jobCard.timer.buttons.pause")}
				</Button>
				<Button
					type="button"
					size="lg"
					className="flex-1 min-h-12"
					variant="default"
					disabled={completeDisabled}
					onClick={() => {
						void handleAction("complete", onComplete);
					}}
					aria-label={t("jobCard.timer.buttons.complete")}
				>
					<ShieldCheck className="mr-2 h-5 w-5" />{" "}
					{t("jobCard.timer.buttons.complete")}
				</Button>
			</div>
		</section>
	);
}
