"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

export type JobCardStatus =
	| "scheduled"
	| "en_route"
	| "in_progress"
	| "completed";

interface StatusButtonsProps {
	readonly status: JobCardStatus;
	readonly timerLocked: boolean;
	readonly onUpdate: (
		status: JobCardStatus,
		notifyCustomer: boolean,
	) => Promise<void> | void;
	readonly isProcessing?: boolean;
	readonly isOffline?: boolean;
}

const STATUS_FLOW: JobCardStatus[] = [
	"scheduled",
	"en_route",
	"in_progress",
	"completed",
];

export function StatusButtons({
	status,
	timerLocked,
	onUpdate,
	isProcessing = false,
	isOffline = false,
}: StatusButtonsProps): JSX.Element {
	const t = useTranslations();
	const [notifyCustomer, setNotifyCustomer] = useState(false);
	const [pendingStatus, setPendingStatus] = useState<JobCardStatus | null>(
		null,
	);

	const currentIndex = STATUS_FLOW.indexOf(status);

	const helperText = useMemo(() => {
		const key: `jobCard.status.helper.${JobCardStatus}` = `jobCard.status.helper.${status}`;
		return t(key);
	}, [status, t]);

	const handleClick = async (nextStatus: JobCardStatus): Promise<void> => {
		if (pendingStatus !== null || isProcessing) {
			return;
		}
		if (nextStatus === "completed" && !timerLocked) {
			return;
		}
		try {
			setPendingStatus(nextStatus);
			await onUpdate(nextStatus, notifyCustomer);
		} catch (error) {
			console.error(error);
		} finally {
			setPendingStatus(null);
		}
	};

	return (
		<section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						{t("jobCard.status.title")}
					</p>
					<p className="text-lg text-slate-700">{helperText}</p>
					{isOffline ? (
						<p className="mt-1 text-sm text-amber-600">
							{t("jobCard.status.offline")}
						</p>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id="notify-customer"
						checked={notifyCustomer}
						onCheckedChange={setNotifyCustomer}
						aria-describedby="notify-help"
					/>
					<Label htmlFor="notify-customer" className="text-sm text-slate-600">
						{t("jobCard.status.notify")}
					</Label>
				</div>
			</div>

			<p id="notify-help" className="text-xs text-slate-500">
				{t("jobCard.status.notifyHelp")}
			</p>

			<div className="grid gap-2 sm:grid-cols-2">
				{STATUS_FLOW.map((item, index) => {
					const active = item === status;
					const disabled = isProcessing || pendingStatus !== null;
					const variant = active ? "default" : "outline";
					const label = t(`jobCard.status.buttons.${item}`);
					return (
						<Button
							key={item}
							type="button"
							size="lg"
							className="min-h-12 justify-between"
							variant={variant}
							onClick={() => {
								void handleClick(item);
							}}
							disabled={disabled}
							aria-current={active}
						>
							<span>{label}</span>
							{index <= currentIndex ? (
								<span className="text-xs text-slate-200" aria-hidden>
									{t("jobCard.status.step.active")}
								</span>
							) : (
								<span className="text-xs text-slate-400" aria-hidden>
									{t("jobCard.status.step.inactive")}
								</span>
							)}
						</Button>
					);
				})}
			</div>

			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{t("jobCard.status.ariaCurrent", {
					status: t(`jobCard.status.buttons.${status}`),
				})}
			</div>
		</section>
	);
}
