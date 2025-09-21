"use client";

import { CalculatorIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";

interface ScenarioResult {
	weeklyValue: number;
	monthlyValue: number;
	annualValue: number;
	hoursPerTech: number;
}

function calculateScenario({
	teamSize,
	hourlyRate,
	hoursPerWeekSaved,
	closeRateBoost,
	followupsEnabled,
}: {
	teamSize: number;
	hourlyRate: number;
	hoursPerWeekSaved: number;
	closeRateBoost: number;
	followupsEnabled: boolean;
}): ScenarioResult {
	const labourValue = hoursPerWeekSaved * hourlyRate;
	const extraJobs = teamSize * closeRateBoost * 420; // avg €420 ticket for urgent jobs
	const followUpValue = followupsEnabled ? teamSize * 35 : 0; // dunning reduces write-offs

	const weeklyValue = labourValue + extraJobs / 4 + followUpValue;
	const monthlyValue = weeklyValue * 4.3;
	const annualValue = monthlyValue * 12;

	return {
		weeklyValue,
		monthlyValue,
		annualValue,
		hoursPerTech: hoursPerWeekSaved / Math.max(teamSize, 1),
	};
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("nl-NL", {
		currency: "EUR",
		style: "currency",
		maximumFractionDigits: 0,
	}).format(Math.round(value));
}

export function RoiCalculator(): JSX.Element {
	const roiT = useTranslations();

	const [teamSize, setTeamSize] = useState(8);
	const [hourlyRate, setHourlyRate] = useState(78);
	const [hoursPerWeekSaved, setHoursPerWeekSaved] = useState(14);
	const [closeRateBoost, setCloseRateBoost] = useState(0.12);
	const [followupsEnabled, setFollowupsEnabled] = useState(true);
	const [focus, setFocus] = useState<"weekly" | "annual">("annual");

	const result = useMemo(
		() =>
			calculateScenario({
				teamSize,
				hourlyRate,
				hoursPerWeekSaved,
				closeRateBoost,
				followupsEnabled,
			}),
		[teamSize, hourlyRate, hoursPerWeekSaved, closeRateBoost, followupsEnabled],
	);

	const hoursPerTechLabel = roiT("launch.roi.outputs.hours_label", {
		value: result.hoursPerTech.toFixed(1),
	});

	return (
		<section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-white to-white p-6">
			<Card className="border-emerald-100 shadow-[0_20px_70px_rgba(34,139,94,0.18)]">
				<CardHeader className="flex flex-col gap-2 border-b border-emerald-100/60 bg-emerald-50/80">
					<CardTitle className="flex items-center gap-2 text-emerald-900">
						<CalculatorIcon className="h-5 w-5" /> {roiT("launch.roi.title")}
					</CardTitle>
					<CardDescription className="text-sm text-emerald-700">
						{roiT("launch.roi.subtitle")}
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_18rem]">
					<div className="space-y-6">
						<div className="grid gap-4 md:grid-cols-2">
							<label className="space-y-2 text-sm">
								<span className="font-semibold text-slate-900">
									{roiT("launch.roi.inputs.team_size")}
								</span>
								<Input
									type="number"
									min={2}
									max={25}
									value={teamSize}
									onChange={(event) => {
										setTeamSize(Number(event.target.value) || 0);
									}}
								/>
							</label>
							<label className="space-y-2 text-sm">
								<span className="font-semibold text-slate-900">
									{roiT("launch.roi.inputs.hourly_rate")}
								</span>
								<Input
									type="number"
									min={45}
									max={150}
									value={hourlyRate}
									onChange={(event) => {
										setHourlyRate(Number(event.target.value) || 0);
									}}
								/>
							</label>
							<label className="space-y-2 text-sm">
								<span className="font-semibold text-slate-900">
									{roiT("launch.roi.inputs.hours_saved")}
								</span>
								<Input
									type="number"
									min={4}
									max={40}
									value={hoursPerWeekSaved}
									onChange={(event) => {
										setHoursPerWeekSaved(Number(event.target.value) || 0);
									}}
								/>
							</label>
							<label className="space-y-2 text-sm">
								<span className="font-semibold text-slate-900">
									{roiT("launch.roi.inputs.win_rate")}
								</span>
								<Input
									type="number"
									step={0.01}
									min={0.02}
									max={0.5}
									value={closeRateBoost}
									onChange={(event) => {
										setCloseRateBoost(Number(event.target.value) || 0);
									}}
								/>
							</label>
						</div>

						<div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
									{roiT("launch.roi.inputs.followups")}
								</p>
								<p className="text-xs text-emerald-700">
									{roiT("launch.roi.inputs.followups_hint")}
								</p>
							</div>
							<Switch
								checked={followupsEnabled}
								onCheckedChange={(checked) => {
									setFollowupsEnabled(checked);
								}}
							/>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
								{roiT("launch.roi.inputs.focus")}
							</Label>
							<RadioGroup
								className="grid grid-cols-2 gap-2"
								defaultValue="annual"
								onValueChange={(value) => {
									setFocus(value as "weekly" | "annual");
								}}
							>
								<div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2">
									<RadioGroupItem id="weekly" value="weekly" />
									<Label htmlFor="weekly" className="text-xs text-slate-700">
										{roiT("launch.roi.inputs.focus_weekly")}
									</Label>
								</div>
								<div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2">
									<RadioGroupItem id="annual" value="annual" />
									<Label htmlFor="annual" className="text-xs text-slate-700">
										{roiT("launch.roi.inputs.focus_annual")}
									</Label>
								</div>
							</RadioGroup>
						</div>
					</div>

					<div className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 to-white p-5">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
								{focus === "weekly"
									? roiT("launch.roi.outputs.weekly_label")
									: roiT("launch.roi.outputs.annual_label")}
							</p>
							<p className="mt-1 text-3xl font-bold text-emerald-900">
								{focus === "weekly"
									? formatCurrency(result.weeklyValue)
									: formatCurrency(result.annualValue)}
							</p>
						</div>
						<div className="space-y-3 text-xs text-slate-700">
							<div className="flex items-center justify-between">
								<span>{roiT("launch.roi.outputs.per_plumber")}</span>
								<span className="font-semibold text-emerald-700">
									{hoursPerTechLabel}
								</span>
							</div>
							<Progress
								value={Math.min((result.hoursPerTech / 8) * 100, 100)}
							/>
							<p>{roiT("launch.roi.outputs.payback")}</p>
						</div>
						<Button
							className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
							onClick={() => {
								window.scrollTo({ top: 0, behavior: "smooth" });
							}}
						>
							<TrendingUpIcon className="h-4 w-4" />
							{roiT("launch.roi.cta")}
						</Button>
					</div>
				</CardContent>
			</Card>
		</section>
	);
}
