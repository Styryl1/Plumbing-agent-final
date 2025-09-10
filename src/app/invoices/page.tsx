"use client";

import { Plus, Settings, Zap } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";
import ProviderBadge from "~/components/invoices/ProviderBadge";
import ProvidersPanel from "~/components/invoices/ProvidersPanel";
import OAuthFeedbackHandler from "~/components/providers/OAuthFeedbackHandler";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";

export default function InvoicesPage(): JSX.Element {
	const t = useT();

	// Fetch all invoices and stats
	const { data: invoices, isLoading } = api.invoices.list.useQuery();
	const { data: stats } = api.invoices.getStats.useQuery();

	// Filter invoices by status
	const drafts =
		invoices?.filter((invoice) => invoice.status === "draft") ?? [];
	const sent =
		invoices?.filter(
			(invoice) => invoice.status === "sent" || invoice.status === "paid",
		) ?? [];

	// Check if any provider is configured (for Connect CTA)
	const hasProviders =
		invoices?.some((invoice) => invoice.provider && !invoice.isLegacy) ?? false;
	return (
		<div className="space-y-6">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-3xl font-bold text-foreground">
						{t("invoice.title")}
					</h1>
					<p className="mt-2 text-muted-foreground">{t("invoice.manage")}</p>
				</div>
				<div className="flex gap-2">
					<Link href="/invoices/approvals">
						<Button variant="outline" size="sm">
							<Settings className="mr-2 h-4 w-4" />
							{t("invoice.approvals")}
						</Button>
					</Link>
				</div>
			</div>

			{/* OAuth Feedback Handler */}
			<OAuthFeedbackHandler />

			{/* Providers Panel */}
			<ProvidersPanel />

			{/* Overview Stats */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t("invoice.totalOutstanding")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{stats ? (
								`€${(stats.totalOutstanding / 100).toFixed(2)}`
							) : (
								<Skeleton className="h-8 w-20" />
							)}
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{stats ? (
								`${stats.draftCount + stats.issuedCount} ${t("invoice.totalInvoices")}`
							) : (
								<Skeleton className="h-4 w-40" />
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t("invoice.thisMonth")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats ? (
								`€${(stats.thisMonth / 100).toFixed(2)}`
							) : (
								<Skeleton className="h-8 w-20" />
							)}
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{stats && stats.draftCount > 0
								? `${stats.draftCount} ${t("invoice.draftsReady")}`
								: t("invoice.noPendingDrafts")}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t("invoice.overdue")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-destructive">
							{stats ? (
								`€${(stats.overdue / 100).toFixed(2)}`
							) : (
								<Skeleton className="h-8 w-20" />
							)}
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{stats && stats.overdue > 0
								? t("invoice.requiresAttention")
								: t("invoice.noOverdue")}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t("invoice.average")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{stats ? (
								`€${(stats.averagePerInvoice / 100).toFixed(2)}`
							) : (
								<Skeleton className="h-8 w-20" />
							)}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("invoice.perInvoiceYear")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Provider Setup CTA */}
			{!hasProviders && (
				<Card className="border-primary/50 bg-primary/5">
					<CardHeader>
						<div className="flex items-center gap-3">
							<Zap className="h-6 w-6 text-primary" />
							<div>
								<CardTitle>{t("invoice.connectProvider")}</CardTitle>
								<CardDescription>
									{t("invoice.connectProviderDesc")}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col sm:flex-row gap-3">
							<Link href="/api/providers/moneybird/oauth/start">
								<Button className="w-full sm:w-auto">
									<Settings className="mr-2 h-4 w-4" />
									{t("invoice.connectMoneybird")}
								</Button>
							</Link>
							<p className="text-sm text-muted-foreground flex items-center">
								{t("invoice.moreProvidersComingSoon")}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Global Empty State */}
			{!isLoading && drafts.length === 0 && sent.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("invoice.empty.title")}</CardTitle>
						<CardDescription>{t("invoice.empty.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center text-center py-8">
							<div className="mb-4">
								<div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
									<Plus className="h-6 w-6 text-muted-foreground" />
								</div>
							</div>
							<p className="text-muted-foreground mb-6">
								{t("invoice.empty.getStarted")}
							</p>
							<Link href="/jobs">
								<Button>
									<Plus className="mr-2 h-4 w-4" />
									{t("invoice.createFromJob")}
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			) : (
				/* Invoice Tables */
				<Card>
					<CardHeader>
						<CardTitle>{t("invoice.overview")}</CardTitle>
						<CardDescription>{t("invoice.managePending")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="drafts" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="drafts">
									{t("invoice.drafts")}{" "}
									<Badge variant="secondary" className="ml-2">
										{drafts.length}
									</Badge>
								</TabsTrigger>
								<TabsTrigger value="issued">
									{t("invoice.issued")}{" "}
									<Badge variant="outline" className="ml-2">
										{sent.length}
									</Badge>
								</TabsTrigger>
							</TabsList>

							<TabsContent value="drafts" className="space-y-4">
								{isLoading ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("table.invoice")}</TableHead>
												<TableHead>{t("table.customer")}</TableHead>
												<TableHead>{t("table.date")}</TableHead>
												<TableHead>{t("table.dueDate")}</TableHead>
												<TableHead className="text-right">
													{t("table.amount")}
												</TableHead>
												<TableHead>{t("table.status")}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{Array.from({ length: 3 }).map((_, i) => (
												<TableRow key={i}>
													<TableCell>
														<Skeleton className="h-4 w-24" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-4 w-32" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-4 w-20" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-4 w-20" />
													</TableCell>
													<TableCell className="text-right">
														<Skeleton className="h-4 w-16" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-6 w-16" />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : drafts.length > 0 ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("table.draft")}</TableHead>
												<TableHead>{t("table.customer")}</TableHead>
												<TableHead>{t("table.job")}</TableHead>
												<TableHead className="text-right">
													{t("table.amount")}
												</TableHead>
												<TableHead>{t("table.status")}</TableHead>
												<TableHead>{t("table.actions")}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{drafts.map((draft) => (
												<TableRow key={draft.id}>
													<TableCell className="font-medium">
														{draft.invoiceNumber
															? draft.invoiceNumber
															: t("invoice.draftLabel")}
													</TableCell>
													<TableCell>{draft.customer.name}</TableCell>
													<TableCell>{draft.job.title}</TableCell>
													<TableCell className="text-right">
														€{(draft.totalIncVat / 100).toFixed(2)}
													</TableCell>
													<TableCell>
														<ProviderBadge
															provider={draft.provider}
															providerStatus={draft.providerStatus}
															isLegacy={draft.isLegacy}
														/>
													</TableCell>
													<TableCell>
														<Link href={`/invoices/${draft.id}`}>
															<Button size="sm" variant="outline">
																{t("actions.edit")}
															</Button>
														</Link>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<div className="text-center py-12">
										<p className="text-muted-foreground mb-4">
											{t("invoice.noDrafts")}
										</p>
										<Link href="/jobs">
											<Button>
												<Plus className="mr-2 h-4 w-4" />
												{t("invoice.createFromJob")}
											</Button>
										</Link>
									</div>
								)}
							</TabsContent>

							<TabsContent value="issued" className="space-y-4">
								{isLoading ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("table.invoice")}</TableHead>
												<TableHead>{t("table.customer")}</TableHead>
												<TableHead>{t("table.issuedOn")}</TableHead>
												<TableHead>{t("table.provider")}</TableHead>
												<TableHead className="text-right">
													{t("table.amount")}
												</TableHead>
												<TableHead>{t("table.status")}</TableHead>
												<TableHead>{t("table.actions")}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{Array.from({ length: 3 }).map((_, i) => (
												<TableRow key={i}>
													<TableCell>
														<Skeleton className="h-4 w-24" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-4 w-32" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-4 w-20" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-4 w-16" />
													</TableCell>
													<TableCell className="text-right">
														<Skeleton className="h-4 w-16" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-6 w-16" />
													</TableCell>
													<TableCell>
														<Skeleton className="h-6 w-16" />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : sent.length > 0 ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("table.invoice")}</TableHead>
												<TableHead>{t("table.customer")}</TableHead>
												<TableHead>{t("table.issuedOn")}</TableHead>
												<TableHead>{t("table.provider")}</TableHead>
												<TableHead className="text-right">
													{t("table.amount")}
												</TableHead>
												<TableHead>{t("table.status")}</TableHead>
												<TableHead>{t("table.actions")}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{sent.map((invoice) => (
												<TableRow key={invoice.id}>
													<TableCell className="font-medium">
														{invoice.invoiceNumber || invoice.id.slice(0, 8)}
													</TableCell>
													<TableCell>{invoice.customer.name}</TableCell>
													<TableCell>
														{invoice.issuedAt
															? Temporal.Instant.from(invoice.issuedAt)
																	.toZonedDateTimeISO("Europe/Amsterdam")
																	.toPlainDate()
																	.toLocaleString("nl-NL")
															: "-"}
													</TableCell>
													<TableCell>
														<ProviderBadge
															provider={invoice.provider}
															providerStatus={invoice.providerStatus}
															isLegacy={invoice.isLegacy}
														/>
													</TableCell>
													<TableCell className="text-right">
														€{(invoice.totalIncVat / 100).toFixed(2)}
													</TableCell>
													<TableCell>
														<Badge
															variant={
																invoice.providerStatus === "paid"
																	? "default"
																	: "outline"
															}
															className={
																invoice.providerStatus === "paid"
																	? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
																	: ""
															}
														>
															{invoice.providerStatus === "paid"
																? t("invoice.paid")
																: invoice.providerStatus === "sent"
																	? t("invoice.sent")
																	: t("invoice.unknown")}
														</Badge>
													</TableCell>
													<TableCell className="flex gap-2">
														{invoice.pdfUrl && (
															<Link
																href={invoice.pdfUrl}
																target="_blank"
																rel="noopener noreferrer"
															>
																<Button size="sm" variant="outline">
																	{t("invoice.viewPdf")}
																</Button>
															</Link>
														)}
														{invoice.paymentUrl && (
															<Link
																href={invoice.paymentUrl}
																target="_blank"
																rel="noopener noreferrer"
															>
																<Button size="sm" variant="outline">
																	{t("invoice.payOnline")}
																</Button>
															</Link>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<div className="text-center py-12">
										<p className="text-muted-foreground mb-4">
											{t("invoice.noSentInvoices")}
										</p>
									</div>
								)}
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			)}

			{/* Recent Activity */}
			<Card>
				<CardHeader>
					<CardTitle>
						<Skeleton className="h-6 w-48" />
					</CardTitle>
					<CardDescription>
						<Skeleton className="h-4 w-64" />
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between border-b border-border pb-4 last:border-b-0"
							>
								<div className="flex items-center gap-3">
									<div className="h-2 w-2 rounded-full bg-muted-foreground" />
									<div>
										<div className="font-medium text-foreground">
											<Skeleton className="h-4 w-32" />
										</div>
										<div className="text-sm text-muted-foreground mt-1">
											<Skeleton className="h-3 w-40" />
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="text-sm font-medium text-foreground">
										<Skeleton className="h-4 w-20" />
									</div>
									<div className="mt-1">
										<Skeleton className="h-5 w-16" />
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
