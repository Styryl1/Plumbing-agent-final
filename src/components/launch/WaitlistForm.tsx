"use client";

import { CheckCircle2Icon, Loader2Icon, ShieldIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

interface WaitlistFormData {
	email: string;
	phone: string;
	orgName: string;
	teamSize: string;
	priority: string;
	stack: string;
	note: string;
}

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm(): JSX.Element {
	const t = useTranslations();
	const [formData, setFormData] = useState<WaitlistFormData>({
		email: "",
		phone: "",
		orgName: "",
		teamSize: "6-10",
		priority: "emergency",
		stack: "moneybird",
		note: "",
	});
	const [status, setStatus] = useState<Status>("idle");
	const teamSizeOptions = [
		{ value: "2-5", label: t("launch.waitlist.team_size_options.2-5") },
		{ value: "6-10", label: t("launch.waitlist.team_size_options.6-10") },
		{ value: "11-15", label: t("launch.waitlist.team_size_options.11-15") },
		{ value: "16+", label: t("launch.waitlist.team_size_options.16+") },
	];
	const stackOptions = [
		{ value: "moneybird", label: t("launch.waitlist.stack_options.moneybird") },
		{
			value: "eboekhouden",
			label: t("launch.waitlist.stack_options.eboekhouden"),
		},
		{ value: "wefact", label: t("launch.waitlist.stack_options.wefact") },
		{ value: "paper", label: t("launch.waitlist.stack_options.paper") },
	];

	const handleChange =
		(field: keyof WaitlistFormData) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			setFormData((prev) => ({ ...prev, [field]: event.target.value }));
		};

	const handleSubmit = async (
		event: React.FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();
		if (!formData.email) {
			return;
		}
		setStatus("loading");

		try {
			const trimmedOrg = formData.orgName.trim();
			const trimmedNote = formData.note.trim();
			const orgSegments: string[] = [];
			if (trimmedOrg) {
				orgSegments.push(trimmedOrg);
			}
			orgSegments.push(`team:${formData.teamSize}`);
			orgSegments.push(`priority:${formData.priority}`);
			orgSegments.push(`stack:${formData.stack}`);
			if (trimmedNote) {
				orgSegments.push(`note:${trimmedNote}`);
			}

			const response = await fetch("/api/launch/waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: formData.email,
					phone: formData.phone || null,
					org_name: orgSegments.join(" | ") || null,
				}),
			});

			if (!response.ok) {
				throw new Error("waitlist_failed");
			}

			setStatus("success");
			setFormData({
				email: "",
				phone: "",
				orgName: "",
				teamSize: "6-10",
				priority: "emergency",
				stack: "moneybird",
				note: "",
			});
		} catch (error) {
			console.error("Waitlist submission failed", error);
			setStatus("error");
		}
	};

	return (
		<Card className="rounded-3xl border-emerald-100 shadow-[0_20px_70px_rgba(34,139,94,0.12)]">
			<CardHeader className="bg-emerald-50/70 rounded-t-3xl border-b border-emerald-100">
				<CardTitle className="text-emerald-900">
					{t("launch.waitlist.title")}
				</CardTitle>
				<CardDescription className="text-sm text-emerald-700">
					{t("launch.waitlist.subtitle")}
				</CardDescription>
			</CardHeader>
			<CardContent className="p-6">
				<form
					className="grid gap-5"
					onSubmit={handleSubmit}
					data-testid="waitlist-form"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<label className="space-y-2 text-sm">
							<span className="font-semibold text-slate-900">
								{t("launch.waitlist.email")}
							</span>
							<Input
								type="email"
								required
								value={formData.email}
								onChange={handleChange("email")}
								placeholder="naam@bedrijf.nl"
							/>
						</label>
						<label className="space-y-2 text-sm">
							<span className="font-semibold text-slate-900">
								{t("launch.waitlist.phone")}
							</span>
							<Input
								type="tel"
								value={formData.phone}
								onChange={handleChange("phone")}
								placeholder="+31 6 xx xx xx xx"
							/>
						</label>
					</div>

					<label className="space-y-2 text-sm">
						<span className="font-semibold text-slate-900">
							{t("launch.waitlist.org")}
						</span>
						<Input
							type="text"
							value={formData.orgName}
							onChange={handleChange("orgName")}
							placeholder="Loodgietersbedrijf Haarlem"
						/>
					</label>

					<div className="grid gap-4 md:grid-cols-2">
						<label className="space-y-2 text-sm">
							<span className="font-semibold text-slate-900">
								{t("launch.waitlist.team_size")}
							</span>
							<Select
								value={formData.teamSize}
								onValueChange={(value) => {
									setFormData((prev) => ({ ...prev, teamSize: value }));
								}}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={
											teamSizeOptions.find((option) => option.value === "6-10")
												?.label
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{teamSizeOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>
						<label className="space-y-2 text-sm">
							<span className="font-semibold text-slate-900">
								{t("launch.waitlist.priority")}
							</span>
							<Select
								value={formData.priority}
								onValueChange={(value) => {
									setFormData((prev) => ({ ...prev, priority: value }));
								}}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t(
											"launch.waitlist.priority_options.emergency",
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="emergency">
										{t("launch.waitlist.priority_options.emergency")}
									</SelectItem>
									<SelectItem value="project">
										{t("launch.waitlist.priority_options.project")}
									</SelectItem>
									<SelectItem value="service">
										{t("launch.waitlist.priority_options.service")}
									</SelectItem>
								</SelectContent>
							</Select>
						</label>
					</div>

					<label className="space-y-2 text-sm">
						<span className="font-semibold text-slate-900">
							{t("launch.waitlist.stack")}
						</span>
						<Select
							value={formData.stack}
							onValueChange={(value) => {
								setFormData((prev) => ({ ...prev, stack: value }));
							}}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										stackOptions.find((option) => option.value === "moneybird")
											?.label
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{stackOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</label>

					<label className="space-y-2 text-sm">
						<span className="font-semibold text-slate-900">
							{t("launch.waitlist.note")}
						</span>
						<Textarea
							value={formData.note}
							onChange={handleChange("note")}
							placeholder={t("launch.waitlist.note_placeholder")}
							rows={3}
						/>
					</label>

					{status === "success" && (
						<Alert className="border-emerald-200 bg-emerald-50">
							<CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
							<AlertDescription className="text-emerald-700">
								{t("launch.waitlist.success")}
							</AlertDescription>
						</Alert>
					)}

					{status === "error" && (
						<Alert className="border-red-200 bg-red-50">
							<AlertDescription className="text-red-700">
								{t("launch.waitlist.error")}
							</AlertDescription>
						</Alert>
					)}

					<Button
						type="submit"
						disabled={status === "loading"}
						className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
					>
						{status === "loading" ? (
							<Loader2Icon className="h-4 w-4 animate-spin" />
						) : null}
						{status === "loading"
							? t("launch.waitlist.submitting")
							: t("launch.waitlist.submit")}
					</Button>

					<p className="flex items-center gap-2 text-xs text-slate-500">
						<ShieldIcon className="h-4 w-4" />
						{t("launch.waitlist.gdpr")}
					</p>
				</form>
			</CardContent>
		</Card>
	);
}
