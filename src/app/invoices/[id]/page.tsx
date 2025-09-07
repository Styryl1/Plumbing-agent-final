"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { JSX } from "react";
import { IssueActions } from "~/components/invoices/IssueActions";
import { PaymentLinks } from "~/components/invoices/PaymentLinks";
import ProviderBadge from "~/components/invoices/ProviderBadge";
import { Timeline } from "~/components/invoices/Timeline";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";

export default function InvoiceDetailPage(): JSX.Element {
	const t = useT();
	const params = useParams();
	const invoiceId = params.id as string;

	const { data: invoice, isLoading } = api.invoices.getById.useQuery({
		id: invoiceId,
	});

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-10" />
					<div>
						<Skeleton className="h-8 w-32" />
						<Skeleton className="mt-1 h-4 w-48" />
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="lg:col-span-2">
						<CardHeader>
							<Skeleton className="h-6 w-24" />
						</CardHeader>
						<CardContent className="space-y-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-4 w-full" />
							))}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-20" />
						</CardHeader>
						<CardContent className="space-y-4">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-4 w-full" />
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	if (!invoice) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Link href="/invoices">
						<Button variant="outline" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h1 className="text-3xl font-bold text-foreground">
							{t("invoice.notFound")}
						</h1>
						<p className="mt-2 text-muted-foreground">
							{t("invoice.notFoundDescription")}
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/invoices">
					<Button variant="outline" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-foreground">
						{invoice.invoiceNumber
							? `${t("invoice.title")} ${invoice.invoiceNumber}`
							: t("invoice.draftLabel")}
					</h1>
					<p className="mt-2 text-muted-foreground">
						{t("invoice.customer")}: {invoice.customer?.name}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Invoice Details */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>{t("invoice.details")}</CardTitle>
						<CardDescription>{t("invoice.detailsDescription")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Customer Information */}
						<div>
							<h3 className="font-semibold text-foreground mb-2">
								{t("invoice.customer")}
							</h3>
							<div className="text-sm space-y-1">
								<p className="font-medium">{invoice.customer?.name}</p>
								{invoice.customer?.email && (
									<p className="text-muted-foreground">
										{invoice.customer.email}
									</p>
								)}
							</div>
						</div>

						<Separator />

						{/* Job Information */}
						{invoice.job && (
							<>
								<div>
									<h3 className="font-semibold text-foreground mb-2">
										{t("invoice.job")}
									</h3>
									<div className="text-sm space-y-1">
										<p className="font-medium">{invoice.job.title}</p>
									</div>
								</div>
								<Separator />
							</>
						)}

						{/* Amount Information */}
						<div>
							<h3 className="font-semibold text-foreground mb-2">
								{t("invoice.amounts")}
							</h3>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										{t("invoice.subtotalExVat")}
									</span>
									<span>€{(invoice.subtotalExVat / 100).toFixed(2)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										{t("invoice.vatAmount")}
									</span>
									<span>€{(invoice.totalVatAmount / 100).toFixed(2)}</span>
								</div>
								<Separator />
								<div className="flex justify-between font-semibold">
									<span>{t("invoice.totalIncVat")}</span>
									<span>€{(invoice.totalIncVat / 100).toFixed(2)}</span>
								</div>
							</div>
						</div>

						{/* Notes */}
						{invoice.notes && (
							<>
								<Separator />
								<div>
									<h3 className="font-semibold text-foreground mb-2">
										{t("invoice.notes")}
									</h3>
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{invoice.notes}
									</p>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{/* Sidebar - Actions & Status */}
				<div className="space-y-6">
					{/* Show PaymentLinks above actions when invoice is issued */}
					{(invoice.issuedAt != null ||
						invoice.status === "sent" ||
						invoice.status === "paid") && (
						<PaymentLinks
							paymentUrl={invoice.paymentUrl}
							pdfUrl={invoice.pdfUrl}
							invoiceId={invoice.id!}
						/>
					)}

					{/* Issue Actions */}
					<IssueActions
						invoiceId={invoice.id!}
						status={invoice.status}
						provider={invoice.provider}
						externalId={invoice.externalId}
						issuedAt={invoice.issuedAt}
					/>

					{/* Payment & PDF Links (fallback for non-issued invoices) */}
					{invoice.issuedAt == null &&
						invoice.status !== "sent" &&
						invoice.status !== "paid" && (
							<PaymentLinks
								paymentUrl={invoice.paymentUrl}
								pdfUrl={invoice.pdfUrl}
								invoiceId={invoice.id!}
							/>
						)}

					{/* Timeline */}
					<Timeline invoiceId={invoice.id!} />

					{/* Status Card */}
					<Card>
						<CardHeader>
							<CardTitle>{t("invoice.status")}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm text-muted-foreground">
										{t("invoice.status")}
									</span>
									<Badge
										variant={
											invoice.status === "sent" || invoice.status === "paid"
												? "default"
												: "outline"
										}
									>
										{invoice.status === "draft"
											? t("status.draft")
											: invoice.status === "sent"
												? t("invoice.sent")
												: invoice.status === "paid"
													? t("invoice.paid")
													: invoice.status}
									</Badge>
								</div>

								{invoice.provider && (
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											{t("invoice.provider")}
										</span>
										<ProviderBadge
											provider={invoice.provider}
											providerStatus={invoice.providerStatus}
											isLegacy={invoice.isLegacy}
										/>
									</div>
								)}
							</div>

							{invoice.issuedAt && (
								<div className="text-sm">
									<span className="text-muted-foreground">
										{t("invoice.issuedOn")}:
									</span>
									<br />
									<span className="font-medium">
										{Temporal.Instant.from(invoice.issuedAt)
											.toZonedDateTimeISO("Europe/Amsterdam")
											.toPlainDate()
											.toLocaleString("nl-NL")}
									</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
