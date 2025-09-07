"use client";

import {
	BellIcon,
	CalendarIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClipboardCheckIcon,
	CpuIcon,
	CreditCardIcon,
	MessageSquareIcon,
	MicIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { Temporal } from "temporal-polyfill";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	type AISuggestion,
	type DemoStep,
	demoSteps,
	type JobCard,
	type ScheduleEvent,
	type VoiceDraft,
	type WhatsAppMessage,
} from "~/lib/launch/demo-fixtures";

const stepIcons = {
	whatsapp: MessageSquareIcon,
	ai_suggestion: CpuIcon,
	schedule: CalendarIcon,
	job_card: ClipboardCheckIcon,
	voice_draft: MicIcon,
	send_pay: CreditCardIcon,
	reminders: BellIcon,
};

function formatCurrency(cents: number): string {
	return `€${(cents / 100).toFixed(2)}`;
}

function formatTime(isoString: string): string {
	const temporal = Temporal.Instant.from(isoString);
	const zonedDateTime = temporal.toZonedDateTimeISO("Europe/Amsterdam");
	return zonedDateTime.toLocaleString("nl-NL", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

interface StepContentProps {
	step: DemoStep;
}

function StepContent({ step }: StepContentProps): React.ReactElement {
	const t = useTranslations("launch.demo.content");

	switch (step.id) {
		case "whatsapp": {
			const data = step.data as {
				conversation: {
					customer_phone: string;
					customer_name: string;
					messages: WhatsAppMessage[];
				};
			};
			const conversation = data.conversation;

			return (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="bg-green-100 text-green-800">
							{conversation.customer_phone}
						</Badge>
						<span className="text-sm text-gray-600">
							{conversation.customer_name}
						</span>
					</div>
					<div className="space-y-3">
						{conversation.messages.map(
							(message: WhatsAppMessage, i: number) => (
								<div
									key={i}
									className={`p-3 rounded-lg max-w-xs ${
										message.sender === "customer"
											? "bg-gray-100 ml-auto"
											: "bg-green-100"
									}`}
								>
									<p className="text-sm">{message.content}</p>
									{message.media_url && (
										<div className="mt-2 text-xs text-gray-500">
											📸 {t("whatsapp.photo_attached")}
										</div>
									)}
									<div className="text-xs text-gray-500 mt-1">
										{formatTime(message.timestamp)}
									</div>
								</div>
							),
						)}
					</div>
					<div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
						<div className="animate-pulse flex items-center gap-1">
							<CpuIcon className="h-4 w-4" />
							<span>{t("whatsapp.ai_analyzing")}</span>
						</div>
					</div>
				</div>
			);
		}

		case "ai_suggestion": {
			const data = step.data as {
				suggestion: AISuggestion;
				confidence_indicator: { percentage: number };
			};
			const suggestion = data.suggestion;
			const confidence = data.confidence_indicator;

			return (
				<div className="space-y-4">
					<div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
						<div className="flex items-center justify-between mb-2">
							<h4 className="font-semibold text-amber-900">
								{t("ai_suggestion.diagnosis")}
							</h4>
							<Badge
								variant="secondary"
								className="bg-emerald-100 text-emerald-800"
							>
								{confidence.percentage}% {t("ai_suggestion.reliable")}
							</Badge>
						</div>
						<p className="text-amber-800">{suggestion.issue}</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<h5 className="font-medium mb-1">{t("ai_suggestion.urgency")}</h5>
							<Badge variant="destructive" className="bg-red-100 text-red-800">
								{suggestion.urgency === "emergency"
									? t("ai_suggestion.emergency")
									: suggestion.urgency}
							</Badge>
						</div>
						<div>
							<h5 className="font-medium mb-1">
								{t("ai_suggestion.estimated_time")}
							</h5>
							<p className="text-sm">
								{suggestion.time_estimate_min} {t("ai_suggestion.minutes")}
							</p>
						</div>
					</div>

					<div>
						<h5 className="font-medium mb-2">
							{t("ai_suggestion.required_materials")}
						</h5>
						<div className="space-y-1">
							{suggestion.materials.map((material, i: number) => (
								<div key={i} className="flex justify-between text-sm">
									<span>
										{t("ai_suggestion.quantity_format", {
											quantity: material.quantity,
											name: material.name,
										})}
									</span>
									<span className="font-mono">
										{formatCurrency(material.price_cents)}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			);
		}

		case "schedule": {
			const data = step.data as { event: ScheduleEvent };
			const event = data.event;

			return (
				<div className="space-y-4">
					<div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
						<h4 className="font-semibold text-emerald-900 mb-2">
							{t("schedule.assigned_to")}
						</h4>
						<div className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: event.employee_color }}
							/>
							<span className="font-medium">{event.employee_name}</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<h5 className="font-medium mb-1">{t("schedule.start_time")}</h5>
							<p className="text-sm">{formatTime(event.start_time)}</p>
						</div>
						<div>
							<h5 className="font-medium mb-1">{t("schedule.end_time")}</h5>
							<p className="text-sm">{formatTime(event.end_time)}</p>
						</div>
					</div>

					<div className="mt-4 p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 rounded-full bg-emerald-500"></div>
							<span>{t("schedule.auto_assigned")}</span>
						</div>
					</div>
				</div>
			);
		}

		case "job_card": {
			const data = step.data as {
				job: JobCard;
				shortcuts: Array<{ label: string }>;
			};
			const job = data.job;

			return (
				<div className="space-y-4">
					<div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
						<h4 className="font-semibold text-blue-900 mb-1">{job.title}</h4>
						<p className="text-blue-800 text-sm">{job.customer_name}</p>
					</div>

					<div className="space-y-2">
						<div>
							<h5 className="font-medium mb-1">{t("job_card.address")}</h5>
							<p className="text-sm text-gray-600">{job.address}</p>
						</div>
						<div>
							<h5 className="font-medium mb-1">{t("job_card.phone")}</h5>
							<p className="text-sm text-gray-600">{job.phone}</p>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						{data.shortcuts.map((shortcut, i: number) => (
							<Button
								key={i}
								variant="outline"
								size="sm"
								className="flex items-center gap-1"
							>
								<span className="text-xs">{shortcut.label}</span>
							</Button>
						))}
					</div>

					<div className="mt-4">
						<h5 className="font-medium mb-1">{t("job_card.notes")}</h5>
						<p className="text-sm text-gray-600">{job.notes}</p>
					</div>
				</div>
			);
		}

		case "voice_draft": {
			const data = step.data as { voice_draft: VoiceDraft };
			const draft = data.voice_draft;

			return (
				<div className="space-y-4">
					<div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
						<h4 className="font-semibold text-purple-900 mb-2">
							{t("voice_draft.voice_transcript")}
						</h4>
						<p className="text-purple-800 text-sm italic">
							&ldquo;{draft.transcript}&rdquo;
						</p>
					</div>

					<div>
						<h5 className="font-medium mb-2">
							{t("voice_draft.invoice_lines")}
						</h5>
						<div className="space-y-2">
							{draft.invoice_lines.map((line, i: number) => (
								<div
									key={i}
									className="flex justify-between items-center p-2 bg-gray-50 rounded"
								>
									<div>
										<p className="text-sm font-medium">{line.description}</p>
										<p className="text-xs text-gray-500">
											{t("voice_draft.line_format", {
												quantity: line.quantity,
												rate: line.vat_rate,
											})}
										</p>
									</div>
									<span className="font-mono text-sm">
										{formatCurrency(line.total_inc_vat_cents)}
									</span>
								</div>
							))}
						</div>

						<div className="mt-3 pt-3 border-t">
							<div className="flex justify-between text-sm">
								<span>{t("voice_draft.subtotal_ex_vat")}</span>
								<span className="font-mono">
									{formatCurrency(draft.subtotal_ex_vat_cents)}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span>{t("voice_draft.vat_total")}</span>
								<span className="font-mono">
									{formatCurrency(draft.vat_total_cents)}
								</span>
							</div>
							<div className="flex justify-between font-semibold">
								<span>{t("voice_draft.total")}</span>
								<span className="font-mono">
									{formatCurrency(draft.total_inc_vat_cents)}
								</span>
							</div>
						</div>
					</div>
				</div>
			);
		}

		case "send_pay": {
			const data = step.data as {
				invoice: { provider: string; invoice_number: string; due_date: string };
			};
			const invoice = data.invoice;

			return (
				<div className="space-y-4">
					<div className="p-4 border border-green-200 bg-green-50 rounded-lg">
						<div className="flex items-center justify-between mb-2">
							<h4 className="font-semibold text-green-900">
								{t("send_pay.invoice_sent")}
							</h4>
							<Badge
								variant="secondary"
								className="bg-blue-100 text-blue-800 capitalize"
							>
								{invoice.provider}
							</Badge>
						</div>
						<p className="text-green-800 text-sm">
							{t("send_pay.invoice_id")} #{invoice.invoice_number}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<h5 className="font-medium mb-1">{t("common.due_date")}</h5>
							<p className="text-sm">
								{Temporal.PlainDate.from(invoice.due_date).toLocaleString(
									"nl-NL",
								)}
							</p>
						</div>
						<div>
							<h5 className="font-medium mb-1">
								{t("send_pay.payment_status")}
							</h5>
							<Badge variant="outline" className="bg-green-100 text-green-800">
								{t("send_pay.awaiting_payment")}
							</Badge>
						</div>
					</div>

					<div className="space-y-2">
						<Button className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white">
							{t("send_pay.click_pay")}
						</Button>
						<div className="text-center text-xs text-gray-500">
							{t("common.alternative_payment")}
						</div>
					</div>

					<div className="flex gap-2 text-xs">
						<Button variant="outline" size="sm">
							📄 {t("send_pay.pdf")}
						</Button>
						<Button variant="outline" size="sm">
							📧 {t("common.email")}
						</Button>
						<Button variant="outline" size="sm">
							💬 {t("send_pay.whatsapp_message")}
						</Button>
					</div>
				</div>
			);
		}

		case "reminders": {
			const data = step.data as {
				reminder_schedule: {
					reminders: Array<{
						days_after: number;
						channel: string;
						status: string;
					}>;
				};
			};
			const schedule = data.reminder_schedule;

			return (
				<div className="space-y-4">
					<div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
						<h4 className="font-semibold text-orange-900 mb-2">
							{t("reminders.title")}
						</h4>
						<p className="text-orange-800 text-sm">
							{t("reminders.whatsapp_series")}
						</p>
					</div>

					<div className="space-y-3">
						{schedule.reminders.map((reminder, i: number) => (
							<div
								key={i}
								className="flex items-center justify-between p-3 border rounded-lg"
							>
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
										+{reminder.days_after}
									</div>
									<div>
										<p className="text-sm font-medium">
											{t("reminders.after_days", { days: reminder.days_after })}
										</p>
										<p className="text-xs text-gray-500 capitalize">
											{reminder.channel}
										</p>
									</div>
								</div>
								<Badge
									variant="outline"
									className="bg-gray-100 text-gray-800 capitalize"
								>
									{reminder.status === "scheduled"
										? t("reminders.scheduled")
										: reminder.status}
								</Badge>
							</div>
						))}
					</div>

					<div className="p-3 bg-gray-50 rounded-lg text-sm">
						✅ {t("reminders.automation_active")}
						<br />✅ {t("reminders.opt_out_respected")}
						<br />✅ {t("reminders.email_escalation")}
					</div>
				</div>
			);
		}

		default:
			return (
				<div className="p-4 text-gray-500">
					{t("common.step_data_unavailable")}
				</div>
			);
	}
}

export function DemoStepper(): React.ReactElement {
	const t = useTranslations();
	const [currentStepIndex, setCurrentStepIndex] = useState(0);

	const currentStep = demoSteps[currentStepIndex];
	const IconComponent = currentStep
		? stepIcons[currentStep.id as keyof typeof stepIcons]
		: MessageSquareIcon;

	const nextStep = (): void => {
		if (currentStepIndex < demoSteps.length - 1) {
			setCurrentStepIndex(currentStepIndex + 1);
		}
	};

	const prevStep = (): void => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex(currentStepIndex - 1);
		}
	};

	const goToStep = (index: number): void => {
		setCurrentStepIndex(index);
	};

	if (!currentStep) return <div>{t("launch.demo.content.common.loading")}</div>;

	return (
		<div className="space-y-6">
			{/* Progress indicator */}
			<div className="flex items-center justify-between">
				{demoSteps.map((step, index) => (
					<button
						key={step.id}
						onClick={() => {
							goToStep(index);
						}}
						className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
							index === currentStepIndex
								? "bg-emerald-600 text-white"
								: index < currentStepIndex
									? "bg-emerald-200 text-emerald-800 hover:bg-emerald-300"
									: "bg-gray-200 text-gray-600 hover:bg-gray-300"
						}`}
					>
						{index + 1}
					</button>
				))}
			</div>

			{/* Current step card */}
			<Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
				<CardHeader className="pb-4">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-emerald-100 p-2">
							<IconComponent className="h-6 w-6 text-emerald-600" />
						</div>
						<div>
							<CardTitle className="text-xl">
								{t(`steps.${currentStep.id}.title`)}
							</CardTitle>
							<CardDescription>
								{t(`steps.${currentStep.id}.description`)}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<StepContent step={currentStep} />
				</CardContent>
			</Card>

			{/* Navigation */}
			<div className="flex items-center justify-between">
				<Button
					variant="outline"
					onClick={prevStep}
					disabled={currentStepIndex === 0}
					className="flex items-center gap-2"
				>
					<ChevronLeftIcon className="h-4 w-4" />
					{t("launch.demo.page.nav.previous")}
				</Button>

				<span className="text-sm text-gray-600">
					{t("launch.demo.page.nav.step_counter", {
						current: currentStepIndex + 1,
						total: demoSteps.length,
					})}
				</span>

				<Button
					onClick={nextStep}
					disabled={currentStepIndex === demoSteps.length - 1}
					className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
				>
					{t("launch.demo.page.nav.next")}
					<ChevronRightIcon className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
