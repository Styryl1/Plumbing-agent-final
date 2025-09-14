"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { formatMoney } from "~/lib/invoice-format";
import { api } from "~/lib/trpc/client";
import type { JobDTO } from "~/types/job";
import { JobToInvoiceImport } from "./JobToInvoiceImport";

// Dutch VAT rates
const VAT_RATES = [
	{ value: 0, label: "0% (Vrijgesteld)" },
	{ value: 9, label: "9% (Laag tarief)" },
	{ value: 21, label: "21% (Hoog tarief)" },
] as const;

// Payment terms
const PAYMENT_TERMS = [
	{ value: "immediate", label: "Direct" },
	{ value: "14_days", label: "14 dagen" },
	{ value: "30_days", label: "30 dagen" },
	{ value: "60_days", label: "60 dagen" },
	{ value: "on_completion", label: "Na voltooiing" },
] as const;

// Line item types
const LINE_TYPES = [
	{ value: "labor", label: "Arbeid" },
	{ value: "material", label: "Materiaal" },
	{ value: "travel", label: "Reiskosten" },
	{ value: "discount", label: "Korting" },
	{ value: "deposit", label: "Aanbetaling" },
] as const;

interface InvoiceDraftEditorProps {
	customerId?: string;
	jobId?: string;
	onSave?: (invoiceId: string) => void;
	onCancel?: () => void;
}

interface InvoiceLineItem {
	tempId: string;
	lineType:
		| "labor"
		| "materials"
		| "travel"
		| "emergency_surcharge"
		| "weekend_surcharge"
		| "evening_surcharge";
	description: string;
	qty: number;
	unitPriceExVat: number; // in cents
	vatRate: number; // as decimal (0.21 = 21%)
}

export function InvoiceDraftEditor({
	customerId,
	jobId,
	onSave,
	onCancel,
}: InvoiceDraftEditorProps): JSX.Element {
	const t = useTranslations();

	// Form state
	const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
		customerId ?? "",
	);
	const [paymentTerms, setPaymentTerms] = useState<string>("30_days");
	const [notes, setNotes] = useState<string>("");
	const [internalNotes, setInternalNotes] = useState<string>("");
	const [discountPercentage, setDiscountPercentage] = useState<number>(0);
	const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

	// Job import
	const [showJobImport, setShowJobImport] = useState<boolean>(!!jobId);

	// Fetch customers
	const { data: customers } = api.customers.list.useQuery({
		limit: 100,
	});

	// Fetch job if jobId is provided
	const { data: job } = api.jobs.byId.useQuery(
		{ id: jobId! },
		{ enabled: !!jobId },
	);

	// Create invoice mutation
	const createInvoiceMutation = api.invoices.createUnified.useMutation({
		onSuccess: (result) => {
			toast.success(tInvoices("createSuccess", { id: result.id }));
			if (result.id) onSave?.(result.id);
		},
		onError: (error) => {
			toast.error(error.message || t("invoices.createError"));
		},
	});

	// Auto-populate customer from job
	useEffect(() => {
		if (job?.customerId && !selectedCustomerId) {
			setSelectedCustomerId(job.customerId);
		}
	}, [job?.customerId, selectedCustomerId]);

	const addLineItem = (): void => {
		const newItem: InvoiceLineItem = {
			tempId: `temp-${Temporal.Now.instant().epochNanoseconds}`,
			description: "",
			qty: 1,
			unitPriceExVat: 0,
			vatRate: 0.21,
			lineType: "labor",
		};
		setLineItems((prev) => [...prev, newItem]);
	};

	const updateLineItem = (
		tempId: string,
		updates: Partial<InvoiceLineItem>,
	): void => {
		setLineItems((prev) =>
			prev.map((item) =>
				item.tempId === tempId ? { ...item, ...updates } : item,
			),
		);
	};

	const removeLineItem = (tempId: string): void => {
		setLineItems((prev) => prev.filter((item) => item.tempId !== tempId));
	};

	const handleJobImport = (importedJob: JobDTO): void => {
		// Create a labor line item based on the job
		const laborItem: InvoiceLineItem = {
			tempId: `job-labor-${Temporal.Now.instant().epochNanoseconds}`,
			description: importedJob.title,
			qty: 1,
			unitPriceExVat: 7500, // €75.00 default hourly rate in cents
			vatRate: 0.21,
			lineType: "labor",
		};

		// If job has description, add it as additional context
		if (importedJob.description) {
			laborItem.description = `${importedJob.title} - ${importedJob.description}`;
		}

		setLineItems([laborItem]);
		setShowJobImport(false);
	};

	// Calculate totals
	const calculateTotals = (): {
		subtotalCents: number;
		vatAmountCents: number;
		discountAmountCents: number;
		totalCents: number;
	} => {
		let subtotalCents = 0;
		let vatAmountCents = 0;

		lineItems.forEach((item) => {
			const lineTotalExVatCents = item.unitPriceExVat * item.qty;
			const lineVatCents = Math.round(lineTotalExVatCents * item.vatRate);

			subtotalCents += lineTotalExVatCents;
			vatAmountCents += lineVatCents;
		});

		// Apply discount
		const discountAmountCents = Math.round(
			(subtotalCents * discountPercentage) / 100,
		);
		subtotalCents -= discountAmountCents;
		vatAmountCents = Math.round(
			(vatAmountCents * (100 - discountPercentage)) / 100,
		);

		const totalCents = subtotalCents + vatAmountCents;

		return {
			subtotalCents,
			vatAmountCents,
			discountAmountCents,
			totalCents,
		};
	};

	const totals = calculateTotals();

	const handleSave = async (): Promise<void> => {
		if (!selectedCustomerId) {
			toast.error(t("invoices.form.customer.required"));
			return;
		}

		if (lineItems.length === 0) {
			toast.error(t("invoices.form.lineItems.required"));
			return;
		}

		// Calculate totals in cents for unified format
		const lines = lineItems.map((item) => ({
			description: item.description,
			qty: item.qty,
			unitPriceCents: Math.round(item.unitPriceExVat * 100), // Convert euros to cents
			vatRate: item.vatRate as 0 | 9 | 21, // Convert percentage to schema type
		}));

		// Compute totals (this logic should match the server)
		const subtotalCents = lines.reduce(
			(sum, line) => sum + line.unitPriceCents * line.qty,
			0,
		);
		const vatAmountCents = lines.reduce((sum, line) => {
			const lineSubtotal = line.unitPriceCents * line.qty;
			return sum + Math.round(lineSubtotal * (line.vatRate / 100));
		}, 0);
		const totalCents = subtotalCents + vatAmountCents;

		try {
			await createInvoiceMutation.mutateAsync({
				customerId: selectedCustomerId,
				notes: notes || undefined,
				lines,
				subtotalCents,
				vatAmountCents,
				totalCents,
			});
		} catch (error) {
			// Error handling is done in the mutation's onError
			console.error("Save failed:", error);
		}
	};

	return (
		<div className="space-y-6">
			{/* Job Import Modal */}
			{showJobImport && (
				<JobToInvoiceImport
					initialJobId={jobId ?? undefined}
					onImport={handleJobImport}
					onCancel={() => {
						setShowJobImport(false);
					}}
				/>
			)}

			{/* Header */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.draft.title")}</CardTitle>
				</CardHeader>
			</Card>

			{/* Customer Selection */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.form.customer.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="customer">
							{t("invoices.form.customer.label")}
						</Label>
						<Select
							value={selectedCustomerId}
							onValueChange={setSelectedCustomerId}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t("invoices.form.customer.placeholder")}
								/>
							</SelectTrigger>
							<SelectContent>
								{customers?.map((customer) => (
									<SelectItem key={customer.id} value={customer.id}>
										{customer.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{!jobId && (
						<div className="flex justify-end">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setShowJobImport(true);
								}}
							>
								{t("invoices.importFromJob")}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Payment Terms */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.form.paymentTerms.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Label htmlFor="paymentTerms">
							{t("invoices.form.paymentTerms.label")}
						</Label>
						<Select value={paymentTerms} onValueChange={setPaymentTerms}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAYMENT_TERMS.map((term) => (
									<SelectItem key={term.value} value={term.value}>
										{term.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Line Items */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{t("invoices.form.lineItems.title")}</CardTitle>
					<Button onClick={addLineItem} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						{t("invoices.form.lineItems.add")}
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					{lineItems.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							{t("invoices.form.lineItems.empty")}
						</div>
					) : (
						lineItems.map((item) => (
							<Card key={item.tempId} className="border-l-4 border-l-blue-500">
								<CardContent className="pt-4">
									<div className="grid grid-cols-12 gap-4">
										{/* Description */}
										<div className="col-span-12 lg:col-span-4">
											<Label htmlFor={`description-${item.tempId}`}>
												{t("invoices.form.lineItems.description")}
											</Label>
											<Textarea
												id={`description-${item.tempId}`}
												value={item.description}
												onChange={(e) => {
													updateLineItem(item.tempId, {
														description: e.target.value,
													});
												}}
												rows={2}
											/>
										</div>

										{/* Quantity */}
										<div className="col-span-6 lg:col-span-3">
											<Label htmlFor={`qty-${item.tempId}`}>
												{t("invoices.form.lineItems.quantity")}
											</Label>
											<Input
												id={`qty-${item.tempId}`}
												type="number"
												value={item.qty}
												onChange={(e) => {
													updateLineItem(item.tempId, {
														qty: Math.max(1, parseInt(e.target.value) || 1),
													});
												}}
												min="1"
											/>
										</div>

										{/* Unit Price */}
										<div className="col-span-6 lg:col-span-3">
											<Label htmlFor={`price-${item.tempId}`}>
												{t("invoices.form.lineItems.unitPrice")}
											</Label>
											<Input
												id={`price-${item.tempId}`}
												type="number"
												value={(item.unitPriceExVat / 100).toFixed(2)}
												onChange={(e) => {
													const euros = parseFloat(e.target.value) || 0;
													updateLineItem(item.tempId, {
														unitPriceExVat: Math.round(euros * 100),
													});
												}}
												step="0.01"
											/>
										</div>

										{/* VAT Rate */}
										<div className="col-span-6 lg:col-span-1">
											<Label htmlFor={`vat-${item.tempId}`}>
												{t("invoices.form.lineItems.vatRate")}
											</Label>
											<Select
												value={(item.vatRate * 100).toString()}
												onValueChange={(value) => {
													updateLineItem(item.tempId, {
														vatRate: parseInt(value) / 100,
													});
												}}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{VAT_RATES.map((rate) => (
														<SelectItem
															key={rate.value}
															value={rate.value.toString()}
														>
															{rate.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{/* Line Type & Actions */}
										<div className="col-span-12 lg:col-span-1 flex items-end gap-2">
											<Select
												value={item.lineType}
												onValueChange={(value) => {
													updateLineItem(item.tempId, {
														lineType: value as "labor" | "materials" | "travel",
													});
												}}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{LINE_TYPES.map((type) => (
														<SelectItem key={type.value} value={type.value}>
															{type.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<Button
												variant="outline"
												size="icon"
												onClick={() => {
													removeLineItem(item.tempId);
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>

									{/* Line Total */}
									<div className="mt-4 pt-4 border-t flex justify-between">
										<span className="text-sm text-muted-foreground">
											{t("invoices.form.lineItems.lineTotal")}
										</span>
										<span className="font-medium">
											{formatMoney(
												item.unitPriceExVat * item.qty +
													Math.round(
														item.unitPriceExVat * item.qty * item.vatRate,
													),
											)}
										</span>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</CardContent>
			</Card>

			{/* Discount */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.form.discount.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Label htmlFor="discount">
							{t("invoices.form.discount.percentage")}
						</Label>
						<Input
							id="discount"
							type="number"
							value={discountPercentage}
							onChange={(e) => {
								setDiscountPercentage(
									Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
								);
							}}
							min="0"
							max="100"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Totals */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.form.totals.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex justify-between">
							<span>{t("invoices.form.totals.subtotal")}</span>
							<span>
								{formatMoney(totals.subtotalCents + totals.discountAmountCents)}
							</span>
						</div>
						{discountPercentage > 0 && (
							<div className="flex justify-between text-red-600">
								<span>
									{t("invoices.form.totals.discount")} ({discountPercentage}%)
								</span>
								<span>-{formatMoney(totals.discountAmountCents)}</span>
							</div>
						)}
						<div className="flex justify-between">
							<span>{t("invoices.form.totals.subtotalAfterDiscount")}</span>
							<span>{formatMoney(totals.subtotalCents)}</span>
						</div>
						<div className="flex justify-between text-muted-foreground">
							<span>{t("invoices.form.totals.vat")}</span>
							<span>{formatMoney(totals.vatAmountCents)}</span>
						</div>
						<Separator />
						<div className="flex justify-between text-xl font-bold">
							<span>{t("invoices.form.totals.total")}</span>
							<span className="text-green-600">
								{formatMoney(totals.totalCents)}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Notes */}
			<Card>
				<CardHeader>
					<CardTitle>{t("invoices.form.notes.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="notes">{t("invoices.form.notes.public")}</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => {
								setNotes(e.target.value);
							}}
							placeholder={t("invoices.form.notes.publicPlaceholder")}
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="internalNotes">
							{t("invoices.form.notes.internal")}
						</Label>
						<Textarea
							id="internalNotes"
							value={internalNotes}
							onChange={(e) => {
								setInternalNotes(e.target.value);
							}}
							placeholder={t("invoices.form.notes.internalPlaceholder")}
							rows={3}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<Card>
				<CardFooter className="flex justify-between">
					<Button variant="outline" onClick={onCancel}>
						{t("invoices.actions.cancel")}
					</Button>
					<Button
						onClick={handleSave}
						disabled={
							createInvoiceMutation.isPending ||
							!selectedCustomerId ||
							lineItems.length === 0
						}
					>
						<Save className="h-4 w-4 mr-2" />
						{t("invoices.actions.saveDraft")}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
