"use client";

import { Calendar, FileText, Send, Zap } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import ReviewList from "~/components/invoices/ReviewList";
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
import { Switch } from "~/components/ui/switch";
import { useT } from "~/i18n/client";
import { parseZdt } from "~/lib/time";
import { api } from "~/lib/trpc/client";

export default function InvoiceReviewPage(): JSX.Element {
	const t = useT("invoices.review");
	const [selected, setSelected] = useState<Record<string, boolean>>({});
	const [alsoWhatsApp, setAlsoWhatsApp] = useState(false);
	const [sinceDate, setSinceDate] = useState(() => {
		// Default to yesterday at 00:00 Amsterdam time
		const yesterday = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.subtract({ days: 1 })
			.with({ hour: 0, minute: 0, second: 0, microsecond: 0 });
		return yesterday.toString();
	});

	const {
		data: drafts = [],
		refetch: refetchDrafts,
		isLoading: isLoadingDrafts,
	} = api.invoices.listReadyDrafts.useQuery({
		sinceISO: sinceDate,
	});

	const createDraftsMutation =
		api.invoiceFlow.createDraftsFromCompletedJobsSince.useMutation({
			onSuccess: () => {
				void refetchDrafts();
			},
		});

	const bulkSendMutation = api.invoices.bulkSend.useMutation({
		onSuccess: () => {
			setSelected({});
			void refetchDrafts();
			// Show success message with result details
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

	const handleCreateDrafts = (): void => {
		createDraftsMutation.mutate({
			sinceISO: sinceDate,
		});
	};

	const handleBulkSend = (): void => {
		if (selectedIds.length === 0) return;

		bulkSendMutation.mutate({
			invoiceIds: selectedIds,
			alsoWhatsApp,
			locale: "nl",
		});
	};

	const handleSinceDateChange = (value: string): void => {
		try {
			// Parse the date and set to start of day in Amsterdam timezone
			const zdtDate =
				Temporal.PlainDate.from(value).toZonedDateTime("Europe/Amsterdam");
			setSinceDate(zdtDate.toString());
		} catch {
			// Invalid date, ignore
		}
	};

	return (
		<div className="container mx-auto py-8 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">{t("title")}</h1>
				<p className="text-muted-foreground mt-2">{t("subtitle")}</p>
			</div>

			{/* Controls Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						{t("controls.title")}
					</CardTitle>
					<CardDescription>{t("controls.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex-1">
							<Label htmlFor="sinceDate">{t("controls.sinceDate")}</Label>
							<Input
								id="sinceDate"
								type="date"
								value={parseZdt(sinceDate).toPlainDate().toString()}
								onChange={(e) => {
									handleSinceDateChange(e.target.value);
								}}
								className="mt-1"
							/>
						</div>
						<div className="flex gap-2 items-end">
							<Button
								variant="outline"
								onClick={handleCreateDrafts}
								disabled={createDraftsMutation.isPending}
								className="flex items-center gap-2"
							>
								<FileText className="h-4 w-4" />
								{createDraftsMutation.isPending
									? t("controls.creating")
									: t("controls.createDrafts")}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Bulk Actions Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Send className="h-5 w-5" />
						{t("bulkActions.title")}
					</CardTitle>
					<CardDescription>
						{selectedIds.length > 0
							? t("bulkActions.selectedCount", { count: selectedIds.length })
							: t("bulkActions.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center space-x-2">
						<Switch
							id="alsoWhatsApp"
							checked={alsoWhatsApp}
							onCheckedChange={setAlsoWhatsApp}
						/>
						<Label htmlFor="alsoWhatsApp" className="flex items-center gap-2">
							<Zap className="h-4 w-4" />
							{t("bulkActions.alsoWhatsApp")}
						</Label>
					</div>

					<Button
						onClick={handleBulkSend}
						disabled={selectedIds.length === 0 || bulkSendMutation.isPending}
						className="flex items-center gap-2"
					>
						<Send className="h-4 w-4" />
						{bulkSendMutation.isPending
							? t("bulkActions.sending")
							: t("bulkActions.send", { count: selectedIds.length })}
					</Button>
				</CardContent>
			</Card>

			{/* Invoice List */}
			<Card>
				<CardHeader>
					<CardTitle>{t("list.title")}</CardTitle>
					<CardDescription>
						{isLoadingDrafts
							? t("list.loading")
							: t("list.count", { count: drafts.length })}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ReviewList
						rows={drafts}
						selected={selected}
						onToggle={handleToggleSelect}
						onSelectAll={handleSelectAll}
						isAllSelected={isAllSelected}
					/>
				</CardContent>
			</Card>

			{/* Results */}
			{bulkSendMutation.data && (
				<Card>
					<CardHeader>
						<CardTitle>{t("results.title")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
								<div>
									<div className="font-medium">{t("results.total")}</div>
									<div className="text-2xl font-bold">
										{bulkSendMutation.data.total}
									</div>
								</div>
								<div>
									<div className="font-medium text-green-600">
										{t("results.sent")}
									</div>
									<div className="text-2xl font-bold text-green-600">
										{bulkSendMutation.data.sent}
									</div>
								</div>
								<div>
									<div className="font-medium text-yellow-600">
										{t("results.skipped")}
									</div>
									<div className="text-2xl font-bold text-yellow-600">
										{bulkSendMutation.data.skipped}
									</div>
								</div>
								<div>
									<div className="font-medium text-blue-600">
										{t("results.withPaymentLinks")}
									</div>
									<div className="text-2xl font-bold text-blue-600">
										{bulkSendMutation.data.withPaymentLinks}
									</div>
								</div>
							</div>
							{bulkSendMutation.data.errors.length > 0 && (
								<div className="mt-4">
									<div className="font-medium text-red-600 mb-2">
										{t("results.errors")}
									</div>
									<div className="space-y-1 text-sm">
										{bulkSendMutation.data.errors.map((error, idx) => (
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
