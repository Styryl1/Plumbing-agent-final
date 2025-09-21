"use client";

import {
	CalendarIcon,
	CheckCircle2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	MessageSquareIcon,
	ShareIcon,
	SmartphoneIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";

export type LiveTickerItem = {
	label: string;
	message: string;
	time: string;
	tone: "success" | "info" | "neutral";
};

interface LiveTickerProps {
	items: LiveTickerItem[];
}

export function LiveTicker({ items }: LiveTickerProps): JSX.Element {
	const tickerT = useTranslations();
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const id = window.setInterval(() => {
			setIndex((prev) => (prev + 1) % Math.max(items.length, 1));
		}, 4000);
		return () => {
			window.clearInterval(id);
		};
	}, [items.length]);

	if (items.length === 0) {
		return (
			<div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
				{tickerT("launch.demos.liveTicker.empty")}
			</div>
		);
	}

	const active = items[index]!;

	return (
		<div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-[0_12px_45px_rgba(14,23,38,0.35)]">
			<div className="flex items-center justify-between text-xs uppercase tracking-wide text-emerald-200">
				<span>{active.label}</span>
				<span>{active.time}</span>
			</div>
			<p className="mt-3 text-sm text-white" aria-live="polite">
				{active.message}
			</p>
			<div className="mt-6 flex items-center justify-between text-xs text-slate-300">
				<button
					type="button"
					className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-slate-200 hover:border-emerald-200"
					onClick={() => {
						setIndex((prev) => (prev - 1 + items.length) % items.length);
					}}
					aria-label={tickerT("launch.demos.liveTicker.prev")}
				>
					<ChevronLeftIcon className="h-3.5 w-3.5" />
				</button>
				<span>
					{index + 1}/{items.length}
				</span>
				<button
					type="button"
					className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-slate-200 hover:border-emerald-200"
					onClick={() => {
						setIndex((prev) => (prev + 1) % items.length);
					}}
					aria-label={tickerT("launch.demos.liveTicker.next")}
				>
					<ChevronRightIcon className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}

type DemoStep = {
	badge: string;
	title: string;
	body: string;
	role: "customer" | "ai" | "organiser" | "system";
};

function useLocaleTime(locale: string): string {
	return useMemo(() => {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		return now.toLocaleString(locale === "nl" ? "nl-NL" : "en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}, [locale]);
}

interface DemoProps {
	steps: DemoStep[];
	cta: string;
}

export function ChatDemo({ steps, cta }: DemoProps): JSX.Element {
	const [index, setIndex] = useState(0);
	const chatT = useTranslations();

	const transcript = steps.slice(0, index + 1);

	return (
		<div className="mt-6 space-y-6">
			<div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-slate-100 shadow-[0_18px_60px_rgba(10,23,53,0.35)]">
				<div className="mb-3 flex items-center justify-between text-xs text-slate-400">
					<div className="flex items-center gap-2">
						<MessageSquareIcon className="h-4 w-4" />
						<span>{chatT("launch.demos.chat.header")}</span>
					</div>
					<span>{useLocaleTime("nl")}</span>
				</div>
				<div className="space-y-4">
					{transcript.map((step, i) => {
						const alignment =
							step.role === "customer"
								? "ml-auto bg-emerald-100 text-slate-900"
								: step.role === "organiser"
									? "bg-white/10 text-white"
									: step.role === "ai"
										? "bg-emerald-400/20 text-emerald-100"
										: "bg-white/5 text-white";

						return (
							<div
								key={`${step.badge}-${step.title}-${i}`}
								className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${alignment}`}
							>
								<p className="text-xs uppercase tracking-wide text-emerald-200/90">
									{step.badge}
								</p>
								<p className="mt-1 font-semibold">{step.title}</p>
								<p className="mt-1 text-xs text-slate-200/90">{step.body}</p>
							</div>
						);
					})}
				</div>
			</div>
			<div className="flex items-center justify-between text-xs text-slate-200">
				<span>
					{index + 1}/{steps.length}
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-slate-100 hover:border-emerald-200"
						onClick={() => {
							setIndex((prev) => Math.max(prev - 1, 0));
						}}
						disabled={index === 0}
					>
						<ChevronLeftIcon className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-slate-900 shadow-md transition hover:bg-emerald-400"
						onClick={() => {
							setIndex((prev) => Math.min(prev + 1, steps.length - 1));
						}}
						disabled={index === steps.length - 1}
					>
						{cta}
						<ChevronRightIcon className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
}

export function CalendarDemo({ steps, cta }: DemoProps): JSX.Element {
	const [index, setIndex] = useState(0);
	const calendarT = useTranslations();

	const active = steps[index]!;

	return (
		<div className="mt-6 space-y-6">
			<div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-slate-100 shadow-[0_18px_60px_rgba(10,23,53,0.35)]">
				<div className="flex items-center justify-between text-xs text-slate-400">
					<div className="flex items-center gap-2">
						<CalendarIcon className="h-4 w-4" />
						<span>{calendarT("launch.demos.calendar.header")}</span>
					</div>
					<span>
						{Temporal.Now.plainDateISO("Europe/Amsterdam").toString()}
					</span>
				</div>
				<div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
					<div className="space-y-3">
						<p className="text-xs uppercase tracking-wide text-emerald-200">
							{active.badge}
						</p>
						<h3 className="text-lg font-semibold text-white">{active.title}</h3>
						<p className="text-xs text-slate-200/90">{active.body}</p>
					</div>
					<div className="grid gap-3">
						<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
							<p className="text-xs uppercase tracking-wide text-emerald-200">
								{calendarT("launch.demos.calendar.unscheduledTitle")}
							</p>
							<div className="mt-3 space-y-2">
								<div className="rounded-xl border border-white/10 bg-white/10 p-3 text-xs">
									<strong>
										{calendarT("launch.demos.calendar.unscheduledPrimaryTitle")}
									</strong>
									<p className="text-slate-200/80">
										{calendarT(
											"launch.demos.calendar.unscheduledPrimarySubtitle",
										)}
									</p>
								</div>
								<div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
									<strong>
										{calendarT(
											"launch.demos.calendar.unscheduledSecondaryTitle",
										)}
									</strong>
									<p className="text-slate-200/70">
										{calendarT(
											"launch.demos.calendar.unscheduledSecondarySubtitle",
										)}
									</p>
								</div>
							</div>
						</div>
						<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
							<p className="text-xs uppercase tracking-wide text-emerald-200">
								{calendarT("launch.demos.calendar.agendaTitle")}
							</p>
							<div className="mt-3 space-y-3">
								<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs">
									<span>
										{calendarT("launch.demos.calendar.agendaMorningTime")}
									</span>
									<span>
										{calendarT("launch.demos.calendar.agendaMorningLabel")}
									</span>
								</div>
								<div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-400/15 px-3 py-2 text-xs">
									<span>
										{calendarT("launch.demos.calendar.agendaSuggestedTime")}
									</span>
									<span className="font-semibold text-emerald-100">
										{calendarT("launch.demos.calendar.agendaSuggestedLabel")}
									</span>
								</div>
								<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs">
									<span>
										{calendarT("launch.demos.calendar.agendaInspectionTime")}
									</span>
									<span>
										{calendarT("launch.demos.calendar.agendaInspectionLabel")}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-between text-xs text-slate-200">
				<span>
					{index + 1}/{steps.length}
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-slate-100 hover:border-emerald-200"
						onClick={() => {
							setIndex((prev) => Math.max(prev - 1, 0));
						}}
						disabled={index === 0}
					>
						<ChevronLeftIcon className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-slate-900 shadow-md transition hover:bg-emerald-400"
						onClick={() => {
							setIndex((prev) => Math.min(prev + 1, steps.length - 1));
						}}
						disabled={index === steps.length - 1}
					>
						{cta}
						<ChevronRightIcon className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
}

export function InvoiceTimelineDemo({ steps, cta }: DemoProps): JSX.Element {
	const [index, setIndex] = useState(0);
	const invoiceT = useTranslations();

	const active = steps[index]!;

	return (
		<div className="mt-6 space-y-6">
			<div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-slate-100 shadow-[0_18px_60px_rgba(10,23,53,0.35)]">
				<div className="flex items-center justify-between text-xs text-slate-400">
					<div className="flex items-center gap-2">
						<SmartphoneIcon className="h-4 w-4" />
						<span>{active.badge}</span>
					</div>
					<span>{invoiceT("launch.demos.invoice.channel")}</span>
				</div>
				<ul className="mt-4 space-y-3">
					{steps.map((step, i) => (
						<li
							key={`${step.badge}-${i}`}
							className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-xs transition ${
								i <= index
									? "border-emerald-200/60 bg-emerald-400/15 text-emerald-100"
									: "border-white/10 bg-white/5 text-slate-200"
							}`}
						>
							{i <= index ? (
								<CheckCircle2Icon className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />
							) : (
								<ShareIcon className="mt-0.5 h-4 w-4 flex-none text-slate-400" />
							)}
							<div>
								<p className="font-semibold text-white">{step.title}</p>
								<p className="mt-1 text-slate-200/80">{step.body}</p>
							</div>
						</li>
					))}
				</ul>
				<div className="mt-5 rounded-2xl border border-emerald-200/40 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100">
					<span className="font-semibold text-emerald-200">
						{active.title}:
					</span>{" "}
					{active.body}
				</div>
			</div>
			<div className="flex items-center justify-between text-xs text-slate-200">
				<span>
					{index + 1}/{steps.length}
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-slate-100 hover:border-emerald-200"
						onClick={() => {
							setIndex((prev) => Math.max(prev - 1, 0));
						}}
						disabled={index === 0}
					>
						<ChevronLeftIcon className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-slate-900 shadow-md transition hover:bg-emerald-400"
						onClick={() => {
							setIndex((prev) => Math.min(prev + 1, steps.length - 1));
						}}
						disabled={index === steps.length - 1}
					>
						{cta}
						<ChevronRightIcon className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
}

export function DemoStepper(): JSX.Element {
	const demoT = useTranslations();

	return (
		<div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
			<p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
				{demoT("launch.demo.page.headline")}
			</p>
			<p className="text-sm text-slate-100">
				{demoT("launch.demo.page.subtitle")}
			</p>
			<a
				href="#demos"
				className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100"
			>
				{demoT("launch.demo.page.cta.button")}
			</a>
		</div>
	);
}
