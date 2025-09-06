"use client";

import { useAuth } from "@clerk/nextjs";
import type { JSX } from "react";
import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";

export default function DashboardPage(): JSX.Element {
	const auth = useAuth();
	const t = useT();

	// Fetch stats from API
	const { data: jobsToday } = api.jobs.list.useQuery({
		from: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.toPlainDate()
			.toString(),
		to: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.toPlainDate()
			.toString(),
	});

	const { data: customers } = api.customers.list.useQuery({ limit: 100 });
	const { data: invoiceStats } = api.invoices.getStats.useQuery();

	// Calculate stats
	const stats = useMemo(() => {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const startOfWeek = now.toPlainDate().subtract({ days: now.dayOfWeek - 1 });

		const newCustomersThisWeek =
			customers?.filter((c) => {
				const createdDate = Temporal.Instant.from(c.createdAt)
					.toZonedDateTimeISO("Europe/Amsterdam")
					.toPlainDate();
				return Temporal.PlainDate.compare(createdDate, startOfWeek) >= 0;
			}).length ?? 0;

		return {
			activeJobsToday: jobsToday?.length ?? 0,
			newCustomersThisWeek,
			outstandingInvoices: invoiceStats?.totalOutstanding ?? 0,
			revenueThisMonth: invoiceStats?.thisMonth ?? 0,
		};
	}, [jobsToday, customers, invoiceStats]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">
					{t("nav.dashboard")}
				</h1>
				<p className="text-gray-600 mt-2">{t("dashboard.welcome")}</p>
			</div>

			{/* Auth Context Display */}
			<Card>
				<CardHeader>
					<CardTitle>{t("auth.context.title")}</CardTitle>
					<CardDescription>{t("auth.context.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<h3 className="font-medium text-sm text-gray-500">
								{t("auth.userId")}
							</h3>
							<p className="font-mono text-sm bg-gray-100 p-2 rounded">
								{auth.userId ?? t("auth.notSignedIn")}
							</p>
						</div>
						<div className="space-y-2">
							<h3 className="font-medium text-sm text-gray-500">
								{t("auth.orgId")}
							</h3>
							<p className="font-mono text-sm bg-gray-100 p-2 rounded">
								{auth.orgId ?? t("auth.noOrganization")}
							</p>
						</div>
						<div className="space-y-2">
							<h3 className="font-medium text-sm text-gray-500">
								{t("auth.role")}
							</h3>
							<p className="font-mono text-sm bg-gray-100 p-2 rounded">
								{auth.orgRole ?? t("auth.noRole")}
							</p>
						</div>
					</div>

					{!auth.orgId && (
						<div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
							<p className="text-sm text-yellow-800">
								💡 <strong>{t("ui.tip")}:</strong> {t("auth.tip")}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-gray-500">
							{t("stats.activeJobs")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeJobsToday}</div>
						<p className="text-xs text-gray-500 mt-1">{t("stats.today")}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-gray-500">
							{t("stats.newCustomers")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats.newCustomersThisWeek}
						</div>
						<p className="text-xs text-gray-500 mt-1">{t("stats.thisWeek")}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-gray-500">
							{t("stats.outstandingInvoices")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{t("money.euro")}
							{(stats.outstandingInvoices / 100).toFixed(2)}
						</div>
						<p className="text-xs text-gray-500 mt-1">{t("stats.toCollect")}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-gray-500">
							{t("stats.revenue")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{t("money.euro")}
							{(stats.revenueThisMonth / 100).toFixed(2)}
						</div>
						<p className="text-xs text-gray-500 mt-1">{t("stats.thisMonth")}</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
