"use client";

import {
	CheckCircleIcon,
	AlertTriangleIcon as ExclamationTriangleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
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
import { Label } from "~/components/ui/label";

interface WaitlistFormData {
	email: string;
	phone: string;
	orgName: string;
}

export function WaitlistForm(): React.ReactElement {
	const t = useTranslations();
	const [formData, setFormData] = useState<WaitlistFormData>({
		email: "",
		phone: "",
		orgName: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		setIsSubmitting(true);
		setStatus("idle");

		try {
			const response = await fetch("/api/launch/waitlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: formData.email,
					phone: formData.phone || null,
					org_name: formData.orgName || null,
				}),
			});

			if (response.ok) {
				setStatus("success");
				setFormData({ email: "", phone: "", orgName: "" });
			} else {
				setStatus("error");
			}
		} catch {
			setStatus("error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<section id="waitlist" className="py-16 sm:py-24 bg-gray-50">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl">
					<Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
						<CardHeader className="text-center">
							<CardTitle className="text-2xl sm:text-3xl">
								{t("launch.waitlist.title")}
							</CardTitle>
							<CardDescription className="text-base">
								{t("launch.waitlist.subtitle")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								data-testid="waitlist-form"
								onSubmit={handleSubmit}
								className="space-y-6"
							>
								<div className="space-y-2">
									<Label htmlFor="email">{t("launch.waitlist.email")}</Label>
									<Input
										id="email"
										type="email"
										required
										value={formData.email}
										onChange={(e) => {
											setFormData((prev) => ({
												...prev,
												email: e.target.value,
											}));
										}}
										className="text-base"
										placeholder="naam@bedrijf.nl"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="phone">{t("launch.waitlist.phone")}</Label>
									<Input
										id="phone"
										type="tel"
										value={formData.phone}
										onChange={(e) => {
											setFormData((prev) => ({
												...prev,
												phone: e.target.value,
											}));
										}}
										className="text-base"
										placeholder="+31 6 XX XX XX XX"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="orgName">{t("launch.waitlist.org")}</Label>
									<Input
										id="orgName"
										type="text"
										value={formData.orgName}
										onChange={(e) => {
											setFormData((prev) => ({
												...prev,
												orgName: e.target.value,
											}));
										}}
										className="text-base"
										placeholder="Loodgietersbedrijf Amsterdam"
									/>
								</div>

								{status === "success" && (
									<Alert className="border-green-200 bg-green-50">
										<CheckCircleIcon className="h-4 w-4 text-green-600" />
										<AlertDescription className="text-green-800">
											{t("launch.waitlist.success")}
										</AlertDescription>
									</Alert>
								)}

								{status === "error" && (
									<Alert className="border-red-200 bg-red-50">
										<ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
										<AlertDescription className="text-red-800">
											{t("launch.waitlist.error")}
										</AlertDescription>
									</Alert>
								)}

								<Button
									type="submit"
									disabled={isSubmitting || !formData.email}
									className="w-full bg-emerald-600 hover:bg-emerald-700"
									size="lg"
								>
									{isSubmitting ? "..." : t("launch.waitlist.submit")}
								</Button>

								<p className="text-xs text-gray-500 text-center">
									{t("launch.waitlist.gdpr")}
								</p>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
