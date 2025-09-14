import { Calendar, CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { parseZdt } from "~/lib/time";
import { api } from "~/lib/trpc/client";

function formatCurrency(cents: number): string {
	return (cents / 100).toLocaleString("nl-NL", {
		style: "currency",
		currency: "EUR",
	});
}

export default function InvoiceApprovalsPage(): JSX.Element {
	const t = useTranslations();
	const [selected, setSelected] = useState<Record<string, boolean>>({});
	const [targetDate, setTargetDate] = useState(() => {
		// Default to today
		return Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.toPlainDate()
			.toString();
	});

	const {
		data: drafts = [],
		refetch: refetchDrafts,
		isLoading: isLoadingDrafts,
	} = api.invoices.listDraftsForApproval.useQuery({
		date: targetDate,
	});

	const sendManyMutation = api.invoices.sendMany.useMutation({
		onSuccess: () => {
			setSelected({});
			void refetchDrafts();
		},
	});

	const selectedIds = Object.keys(selected).filter((id) => selected[id]);
	const isAllSelected =
		drafts.length > 0 && selectedIds.length === drafts.length;

	const handleToggleSelect = (id: string): void => {
		setSelected((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	const handleSelectAll = (): void => {
		if (isAllSelected) {
			setSelected({});
		} else {
			const allSelected: Record<string, boolean> = {};
			for (const draft of drafts) {
				allSelected[draft.id] = true;
			}
			setSelected(allSelected);
		}
	};

	const handleSendSelected = (): void => {
		if (selectedIds.length === 0) return;

		sendManyMutation.mutate({
			invoiceIds: selectedIds,
		});
	};

	const handleDateChange = (value: string): void => {
		try {
			// Validate the date format
			Temporal.PlainDate.from(value);
			setTargetDate(value);
		} catch {
			// Invalid date, ignore
		}
	};

	return (
		<div className="container mx-auto py-8 space-y-6">
			<div>
				<h1 className="text-3xl font-bold flex items-center gap-2">
					<CheckCircle2 className="h-8 w-8" />
					{t("misc.approvals.title")}
				</h1>
				<p className="text-muted-foreground mt-2">
					{t("misc.approvals.subtitle")}
				</p>
			</div>

			{/* Date Filter */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						{t("misc.approvals.dateFilter.title")}
					</CardTitle>
					<CardDescription>
						{t("misc.approvals.dateFilter.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="max-w-sm">
						<Label htmlFor="targetDate">
							{t("misc.approvals.dateFilter.label")}
						</Label>
						<Input
							id="targetDate"
							type="date"
							value={targetDate}
							onChange={(e) => {
								handleDateChange(e.target.value);
							}}
							className="mt-1"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Send className="h-5 w-5" />
						{t("misc.approvals.actions.title")}
					</CardTitle>
					<CardDescription>
						{selectedIds.length > 0
							? t("misc.approvals.actions.selectedCount", {
									count: selectedIds.length,
								})
							: t("misc.approvals.actions.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={handleSendSelected}
						disabled={selectedIds.length === 0 || sendManyMutation.isPending}
						className="flex items-center gap-2"
					>
						<Send className="h-4 w-4" />
						{sendManyMutation.isPending
							? t("misc.approvals.actions.sending")
							: t("misc.approvals.actions.sendSelected", {
									count: selectedIds.length,
								})}
					</Button>
				</CardContent>
			</Card>

			{/* Invoice List */}
			<Card>
				<CardHeader>
					<CardTitle>{t("misc.approvals.list.title")}</CardTitle>
					<CardDescription>
						{isLoadingDrafts
							? t("misc.approvals.list.loading")
							: t("misc.approvals.list.count", { count: drafts.length })}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{drafts.length > 0 && (
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<Checkbox
										checked={isAllSelected}
										onCheckedChange={handleSelectAll}
										aria-label={t("misc.approvals.selectAll")}
									/>
									<span className="text-sm font-medium">
										{t("misc.approvals.selectAll")}
									</span>
								</div>
								<div className="text-sm text-muted-foreground">
									{selectedIds.length} / {drafts.length}{" "}
									{t("misc.approvals.selected")}
								</div>
							</div>
						)}

						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-12">
											<span className="sr-only">
												{t("misc.approvals.select")}
											</span>
										</TableHead>
										<TableHead>{t("misc.approvals.number")}</TableHead>
										<TableHead>{t("misc.approvals.customer")}</TableHead>
										<TableHead className="text-right">
											{t("misc.approvals.total")}
										</TableHead>
										<TableHead className="text-right">
											{t("misc.approvals.created")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{drafts.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="text-center py-8">
												<div className="text-muted-foreground">
													{isLoadingDrafts
														? t("misc.approvals.list.loading")
														: t("misc.approvals.empty")}
												</div>
											</TableCell>
										</TableRow>
									) : (
										drafts.map((draft) => (
											<TableRow key={draft.id}>
												<TableCell>
													<Checkbox
														checked={selected[draft.id] ?? false}
														onCheckedChange={() => {
															handleToggleSelect(draft.id);
														}}
														aria-label={`${t("misc.approvals.select")} ${draft.number}`}
													/>
												</TableCell>
												<TableCell>
													<div className="font-mono text-sm">
														{draft.number}
													</div>
												</TableCell>
												<TableCell>
													<div className="font-medium">
														{draft.customerName}
													</div>
												</TableCell>
												<TableCell className="text-right font-mono">
													{formatCurrency(draft.totalCents)}
												</TableCell>
												<TableCell className="text-right text-sm text-muted-foreground">
													{parseZdt(draft.createdAt).toPlainDate().toString()}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Results */}
			{sendManyMutation.data && (
				<Card>
					<CardHeader>
						<CardTitle>{t("misc.approvals.results.title")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
								<div>
									<div className="font-medium">
										{t("misc.approvals.results.total")}
									</div>
									<div className="text-2xl font-bold">
										{sendManyMutation.data.total}
									</div>
								</div>
								<div>
									<div className="font-medium text-green-600">
										{t("misc.approvals.results.sent")}
									</div>
									<div className="text-2xl font-bold text-green-600">
										{sendManyMutation.data.sent}
									</div>
								</div>
								<div>
									<div className="font-medium text-yellow-600">
										{t("misc.approvals.results.skipped")}
									</div>
									<div className="text-2xl font-bold text-yellow-600">
										{sendManyMutation.data.skipped}
									</div>
								</div>
								<div>
									<div className="font-medium text-blue-600">
										{t("misc.approvals.results.withPaymentLinks")}
									</div>
									<div className="text-2xl font-bold text-blue-600">
										{sendManyMutation.data.withPaymentLinks}
									</div>
								</div>
							</div>
							{sendManyMutation.data.errors.length > 0 && (
								<div className="mt-4">
									<div className="font-medium text-red-600 mb-2">
										{t("misc.approvals.results.errors")}
									</div>
									<div className="space-y-1 text-sm">
										{sendManyMutation.data.errors.map((error, idx) => (
											<div
												key={idx}
												className="bg-red-50 p-2 rounded text-red-800"
											>
												{error.error}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
