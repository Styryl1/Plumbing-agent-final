"use client";

import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { epochMs, parseZdt } from "~/lib/time";

interface ReviewListRow {
	id: string;
	customerName: string;
	customerPhone?: string;
	totalCents: number;
	provider: "moneybird" | "wefact" | "eboekhouden" | "peppol" | null;
	createdAtISO: string;
	jobTitle?: string;
}

interface ReviewListProps {
	rows: ReviewListRow[];
	selected: Record<string, boolean>;
	onToggle: (id: string) => void;
	onSelectAll: () => void;
	isAllSelected: boolean;
}

function formatCurrency(cents: number): string {
	return (cents / 100).toLocaleString("nl-NL", {
		style: "currency",
		currency: "EUR",
	});
}

function getProviderBadgeVariantReview(
	provider: ReviewListRow["provider"],
): "default" | "secondary" | "outline" {
	switch (provider) {
		case "moneybird":
			return "default";
		case "wefact":
			return "secondary";
		case "eboekhouden":
			return "outline";
		case "peppol":
			return "outline";
		default:
			return "outline";
	}
}

export default function ReviewListReview({
	rows,
	selected,
	onToggle,
	onSelectAll,
	isAllSelected,
}: ReviewListProps): JSX.Element {
	const t = useTranslations();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Checkbox
						checked={isAllSelected}
						onCheckedChange={onSelectAll}
						aria-label={t("invoices.review.selectAll")}
					/>
					<span className="text-sm font-medium">
						{t("invoices.review.selectAll")}
					</span>
				</div>
				<div className="text-sm text-muted-foreground">
					{Object.values(selected).filter(Boolean).length} / {rows.length}{" "}
					{t("invoices.review.selected")}
				</div>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">
								<span className="sr-only">{t("invoices.review.select")}</span>
							</TableHead>
							<TableHead>{t("invoices.review.customer")}</TableHead>
							<TableHead>{t("invoices.review.job")}</TableHead>
							<TableHead className="text-right">
								{t("invoices.review.total")}
							</TableHead>
							<TableHead>{t("invoices.review.provider")}</TableHead>
							<TableHead className="text-right">
								{t("invoices.review.created")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8">
									<div className="text-muted-foreground">
										{t("invoices.review.noInvoices")}
									</div>
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										<Checkbox
											checked={selected[row.id] ?? false}
											onCheckedChange={() => {
												onToggle(row.id);
											}}
											aria-label={`${t("invoices.review.select")} ${row.customerName}`}
										/>
									</TableCell>
									<TableCell>
										<div className="font-medium">{row.customerName}</div>
										{row.customerPhone && (
											<div className="text-sm text-muted-foreground">
												{row.customerPhone}
											</div>
										)}
									</TableCell>
									<TableCell>
										{row.jobTitle ? (
											<div className="truncate max-w-48" title={row.jobTitle}>
												{row.jobTitle}
											</div>
										) : (
											<span className="text-muted-foreground">
												{t("invoices.review.noJob")}
											</span>
										)}
									</TableCell>
									<TableCell className="text-right font-mono">
										{formatCurrency(row.totalCents)}
									</TableCell>
									<TableCell>
										{row.provider ? (
											<Badge
												variant={getProviderBadgeVariantReview(row.provider)}
											>
												{row.provider}
											</Badge>
										) : (
											<Badge variant="outline">
												{t("invoices.review.noProvider")}
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right text-sm text-muted-foreground">
										{formatDistanceToNow(epochMs(parseZdt(row.createdAtISO)), {
											addSuffix: true,
											locale: nl,
										})}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
