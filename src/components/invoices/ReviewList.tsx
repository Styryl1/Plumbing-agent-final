"use client";

import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
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
import { useT } from "~/i18n/client";
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

function getProviderBadgeVariant(
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

export default function ReviewList({
	rows,
	selected,
	onToggle,
	onSelectAll,
	isAllSelected,
}: ReviewListProps): JSX.Element {
	const t = useT("invoices.review");

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Checkbox
						checked={isAllSelected}
						onCheckedChange={onSelectAll}
						aria-label={t("selectAll")}
					/>
					<span className="text-sm font-medium">{t("selectAll")}</span>
				</div>
				<div className="text-sm text-muted-foreground">
					{Object.values(selected).filter(Boolean).length} / {rows.length}{" "}
					{t("selected")}
				</div>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">
								<span className="sr-only">{t("select")}</span>
							</TableHead>
							<TableHead>{t("customer")}</TableHead>
							<TableHead>{t("job")}</TableHead>
							<TableHead className="text-right">{t("total")}</TableHead>
							<TableHead>{t("provider")}</TableHead>
							<TableHead className="text-right">{t("created")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8">
									<div className="text-muted-foreground">{t("noInvoices")}</div>
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
											aria-label={`${t("select")} ${row.customerName}`}
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
												{t("noJob")}
											</span>
										)}
									</TableCell>
									<TableCell className="text-right font-mono">
										{formatCurrency(row.totalCents)}
									</TableCell>
									<TableCell>
										{row.provider ? (
											<Badge variant={getProviderBadgeVariant(row.provider)}>
												{row.provider}
											</Badge>
										) : (
											<Badge variant="outline">{t("noProvider")}</Badge>
										)}
									</TableCell>
									<TableCell className="text-right text-sm text-muted-foreground">
										{formatDistanceToNow(
											epochMs(parseZdt(row.createdAtISO)),
											{
												addSuffix: true,
												locale: nl,
											},
										)}
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
