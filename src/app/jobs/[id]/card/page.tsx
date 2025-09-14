import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toZDT } from "~/lib/calendar-temporal";
import { api } from "~/lib/trpc/server";

interface JobCardPageProps {
	params: { id: string };
}

export default async function JobCardPage({
	params,
}: JobCardPageProps): Promise<JSX.Element> {
	const t = await getTranslations("misc.job_card_mobile");
	const jobId = params.id;

	try {
		// Fetch job with customer data using tRPC server
		const job = await api.jobs.byId({ id: jobId });

		// Job will throw if not found, no need to check

		// Parse times using temporal helpers
		const startTime = job.starts_at ? toZDT(job.starts_at) : null;
		const endTime = job.ends_at ? toZDT(job.ends_at) : null;

		// Format times for display
		const dateStr = startTime
			? format(startTime.toPlainDate().toString(), "EEEE d MMMM yyyy", {
					locale: nl,
				})
			: t("dateUnknown");
		const timeStr =
			startTime && endTime
				? `${format(startTime.toString(), "HH:mm")} - ${format(endTime.toString(), "HH:mm")}`
				: t("timeUnknown");

		// Extract customer info
		const customer = job.customer;
		const maskedPhone = t("phoneUnknown"); // Phone not available in JobDTO customer

		// Build complete address - use job address
		const fullAddress = job.address || t("addressUnknown");

		// Extract urgency from job description or title
		const isUrgent = job.title.includes("⚡") || job.priority === "urgent";

		return (
			<main className="min-h-screen bg-gray-50 p-4">
				<div className="mx-auto max-w-md space-y-4">
					{/* Header */}
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900">
							{isUrgent && "⚡ "}
							{t("title")}
						</h1>
						<p className="text-sm text-gray-600">#{jobId.substring(0, 8)}...</p>
					</div>

					{/* Job Summary Card */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">{job.title}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* When */}
							<div>
								<h3 className="font-semibold text-gray-700">{t("when")}</h3>
								<p className="text-gray-900">{dateStr}</p>
								<p className="text-gray-600">{timeStr}</p>
							</div>

							{/* Where */}
							<div>
								<h3 className="font-semibold text-gray-700">{t("where")}</h3>
								<p className="text-gray-900">{fullAddress}</p>
							</div>

							{/* Customer */}
							{customer && (
								<div>
									<h3 className="font-semibold text-gray-700">
										{t("customer")}
									</h3>
									<p className="text-gray-900">{customer.name}</p>
									<p className="text-gray-600">{maskedPhone}</p>
								</div>
							)}

							{/* Issue Summary */}
							{job.description && (
								<div>
									<h3 className="font-semibold text-gray-700">{t("issue")}</h3>
									<p className="text-gray-900 text-sm leading-relaxed">
										{job.description
											.split("\n")
											.map((line: string, idx: number) => (
												<span key={idx}>
													{line}
													{idx < job.description.split("\n").length - 1 && (
														<br />
													)}
												</span>
											))}
									</p>
								</div>
							)}

							{/* Status */}
							<div>
								<h3 className="font-semibold text-gray-700">{t("status")}</h3>
								<span
									className={`inline-block px-2 py-1 text-xs rounded-full ${
										job.status === "planned"
											? "bg-blue-100 text-blue-800"
											: job.status === "in_progress"
												? "bg-yellow-100 text-yellow-800"
												: job.status === "done"
													? "bg-green-100 text-green-800"
													: "bg-gray-100 text-gray-800"
									}`}
								>
									{job.status === "planned"
										? t("statusValues.planned")
										: job.status === "in_progress"
											? t("statusValues.in_progress")
											: job.status === "done"
												? t("statusValues.done")
												: t("statusValues.unknown")}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="space-y-3">
						{startTime && (
							<Button asChild className="w-full" size="lg">
								<a
									href={`/jobs?date=${startTime.toPlainDate().toString()}&focus=${jobId}`}
									className="flex items-center justify-center gap-2"
								>
									{t("openCalendar")}
								</a>
							</Button>
						)}

						<Button variant="outline" asChild className="w-full" size="lg">
							<a href="/jobs">{t("backToJobs")}</a>
						</Button>
					</div>

					{/* Footer info */}
					<div className="text-center text-xs text-gray-500 pt-4">
						{t("readOnlyNotice")}
					</div>
				</div>
			</main>
		);
	} catch (error) {
		console.error("Error loading job card:", error);
		notFound();
	}
}
