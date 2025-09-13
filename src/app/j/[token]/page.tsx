/**
 * Minimal Job Card Page (S2 + S4 Integration)
 * Shows conversation header, last approved suggestion, and quick actions
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import { Temporal } from "temporal-polyfill";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// Job Card page doesn't need real database in MVP
// import { getServiceDbForWebhook } from "~/server/db/serviceClient";

interface JobCardPageProps {
	params: {
		token: string;
	};
}

function getJobCardData(token: string): JobCardData | null {
	// For MVP, return demo data to show the UI
	const parts = token.split("-");
	if (parts.length !== 3) {
		return null;
	}

	return {
		job: {
			id: parts[0] ?? "demo-job-123",
			title: "Lekkage in keuken",
			description: "Customer meldt waterlek onder de gootsteen",
			customer: {
				id: "demo-customer-123",
				name: "EXAMPLE: Customer Name",
				phone: "+31 6 XX XX XX XX",
				email: "customer@example.com",
				address: "EXAMPLE: Street Name XX, XXXX AB City",
			},
		},
		lastSuggestion: {
			id: "demo-suggestion-123",
			proposed_text:
				"Bedankt voor uw bericht over de lekkage. Om u zo snel mogelijk te helpen, heb ik de volgende informatie nodig:\n\n1. Uw postcode\n2. Een foto van de situatie\n3. Heeft u de hoofdkraan al dichtgedraaid?\n\nIk neem dan direct contact op om een monteur te sturen.",
			tags: ["lekkage", "urgent", "keuken"],
			urgency: "high" as const,
		},
	};
}

interface JobCardData {
	job: {
		id: string;
		title: string;
		description: string;
		customer: {
			id: string;
			name: string;
			phone: string;
			email: string;
			address: string;
		};
	};
	lastSuggestion: {
		id: string;
		proposed_text: string;
		tags: string[];
		urgency: "low" | "normal" | "high";
	};
}

export default async function JobCardPage({
	params,
}: JobCardPageProps): Promise<JSX.Element> {
	const data = getJobCardData(params.token);
	const t = await getTranslations("misc.jobCard");

	if (!data) {
		notFound();
	}

	const { job, lastSuggestion } = data;
	const customer = job.customer;

	// Mask phone number for privacy (show last 4 digits)
	const maskedPhone = customer.phone
		? customer.phone.slice(-4).padStart(customer.phone.length, "*")
		: "****";

	return (
		<div className="min-h-screen bg-gray-50 py-4">
			<div className="mx-auto max-w-md px-4">
				{/* Header */}
				<Card className="mb-4">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">{t("title")}</CardTitle>
							<Badge variant="outline" className="text-xs">
								{t("jobNumber")} #{job.id.slice(0, 8)}
							</Badge>
						</div>
						<div className="text-sm text-gray-600">
							<div className="font-medium">{customer.name}</div>
							<div className="text-xs">
								{t("phone")}: {maskedPhone}
							</div>
							{customer.address && (
								<div className="text-xs">{customer.address}</div>
							)}
						</div>
					</CardHeader>
				</Card>

				{/* Job Status */}
				<Card className="mb-4">
					<CardContent className="pt-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">{t("jobStatus")}</span>
								<Badge variant="secondary">{t("active")}</Badge>
							</div>
							{job.description && (
								<div className="mt-3">
									<p className="text-sm text-gray-700">{job.description}</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Last Approved WhatsApp Suggestion */}
				{Boolean(lastSuggestion) && (
					<Card className="mb-6">
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								💬 {t("lastResponse")}
								<Badge variant="outline" className="text-xs">
									{t("approved")}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="rounded-lg bg-blue-50 p-3 text-sm">
								<p className="whitespace-pre-wrap">
									{lastSuggestion.proposed_text}
								</p>
							</div>
							{lastSuggestion.tags.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-1">
									{lastSuggestion.tags.map((tag) => (
										<Badge key={tag} variant="secondary" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							)}
							{Boolean(lastSuggestion.urgency) && (
								<div className="mt-2 flex items-center gap-2">
									<span className="text-xs text-gray-500">{t("urgency")}:</span>
									<Badge
										variant={
											lastSuggestion.urgency === "high"
												? "destructive"
												: "outline"
										}
										className="text-xs"
									>
										{lastSuggestion.urgency}
									</Badge>
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* Quick Actions */}
				<div className="space-y-3">
					<Link
						href={`/jobs/schedule?customer=${customer.id}&token=${params.token}`}
					>
						<Button className="w-full" size="lg">
							📅 {t("schedule")} →
						</Button>
					</Link>
					<Link
						href={`/invoices/draft?customer=${customer.id}&job=${job.id}&token=${params.token}`}
					>
						<Button variant="outline" className="w-full" size="lg">
							💰 {t("draftInvoice")}
						</Button>
					</Link>
				</div>

				{/* Footer */}
				<div className="mt-8 text-center text-xs text-gray-500">
					<p>{t("tokenExpires")}</p>
					<p>
						{Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
							.add({ hours: 24 })
							.toLocaleString("nl-NL")}
					</p>
				</div>
			</div>
		</div>
	);
}

export function generateMetadata({ params }: JobCardPageProps): {
	title: string;
	description?: string;
	robots?: string;
} {
	const data = getJobCardData(params.token);

	if (!data) {
		return {
			title: "Job Card Not Found",
		};
	}

	const customerName = data.job.customer.name;

	return {
		title: `Job Card - ${customerName}`,
		description: `Job card for ${customerName}`,
		robots: "noindex, nofollow", // Private job cards should not be indexed
	};
}
