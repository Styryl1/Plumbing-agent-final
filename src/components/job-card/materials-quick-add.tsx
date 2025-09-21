"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";

export interface MaterialLineVM {
	readonly id: string;
	readonly name: string;
	readonly qty: number;
	readonly unit: string;
	readonly unitPriceCents: number;
	readonly vatRate: 21 | 9 | 0;
	readonly createdAtISO: string;
}

export interface MaterialTotals {
	readonly subtotalCents: number;
	readonly vatCents: number;
	readonly totalCents: number;
}

export interface MaterialInput {
	readonly name: string;
	readonly qty: number;
	readonly unit: string;
	readonly unitPriceCents: number;
	readonly vatRate: 21 | 9 | 0;
}

interface MaterialsQuickAddProps {
	readonly lines: MaterialLineVM[];
	readonly totals: MaterialTotals;
	readonly onAdd: (line: MaterialInput) => Promise<void> | void;
	readonly isProcessing?: boolean;
	readonly isOffline?: boolean;
}

const formatCurrency = (valueCents: number): string =>
	new Intl.NumberFormat("nl-NL", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 2,
	}).format(valueCents / 100);

const normalizeVatRate = (value: number): 21 | 9 | 0 => {
	if (value === 21 || value === 9 || value === 0) {
		return value;
	}
	return 21;
};

export function MaterialsQuickAdd({
	lines,
	totals,
	onAdd,
	isProcessing = false,
	isOffline = false,
}: MaterialsQuickAddProps): JSX.Element {
	const t = useTranslations();
	const [name, setName] = useState("");
	const [qty, setQty] = useState("1");
	const [unit, setUnit] = useState("st");
	const [price, setPrice] = useState("");
	const [vatRate, setVatRate] = useState<21 | 9 | 0>(21);
	const [pending, setPending] = useState(false);

	const totalsDisplay = useMemo(
		() => ({
			ex: formatCurrency(totals.subtotalCents),
			vat: formatCurrency(totals.vatCents),
			inc: formatCurrency(totals.totalCents),
		}),
		[totals],
	);
	const totalsSummary = useMemo(
		() =>
			t("jobCard.materials.totals.summary", {
				ex: totalsDisplay.ex,
				vat: totalsDisplay.vat,
				inc: totalsDisplay.inc,
			}),
		[totalsDisplay, t],
	);

	const handleSubmit = async (
		event: React.FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();
		if (!name.trim()) {
			toast.error(t("jobCard.materials.validation.name"));
			return;
		}

		const qtyValue = Number.parseFloat(qty.replace(",", "."));
		if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
			toast.error(t("jobCard.materials.validation.qty"));
			return;
		}

		const priceValue = Number.parseFloat(price.replace(",", "."));
		if (!Number.isFinite(priceValue) || priceValue < 0) {
			toast.error(t("jobCard.materials.validation.price"));
			return;
		}

		const unitPriceCents = Math.round(priceValue * 100);

		try {
			setPending(true);
			await onAdd({
				name: name.trim(),
				qty: qtyValue,
				unit: unit.trim() || "st",
				unitPriceCents,
				vatRate,
			});
			setName("");
			setQty("1");
			setUnit("st");
			setPrice("");
			setVatRate(21);
		} catch (error) {
			console.error(error);
			throw error;
		} finally {
			setPending(false);
		}
	};

	return (
		<section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<header className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						{t("jobCard.materials.title")}
					</p>
					<p className="text-lg text-slate-600">{totalsSummary}</p>
					{isOffline ? (
						<p className="mt-1 text-sm text-amber-600">
							{t("jobCard.materials.offline")}
						</p>
					) : null}
				</div>
				<Badge variant="outline">
					{t("jobCard.materials.vatBadge", {
						rate: t(`jobCard.materials.option.${vatRate}`),
					})}
				</Badge>
			</header>

			<form className="space-y-3" onSubmit={handleSubmit}>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor="material-name">{t("jobCard.materials.name")}</Label>
						<Input
							id="material-name"
							value={name}
							onChange={(event) => {
								setName(event.target.value);
							}}
							placeholder={t("jobCard.materials.placeholder.name")}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="material-qty">
							{t("jobCard.materials.quantity")}
						</Label>
						<Input
							id="material-qty"
							inputMode="decimal"
							value={qty}
							onChange={(event) => {
								setQty(event.target.value);
							}}
							placeholder={t("jobCard.materials.placeholder.quantity")}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="material-unit">{t("jobCard.materials.unit")}</Label>
						<Input
							id="material-unit"
							value={unit}
							onChange={(event) => {
								setUnit(event.target.value);
							}}
							placeholder={t("jobCard.materials.placeholder.unit")}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="material-price">
							{t("jobCard.materials.price")}
						</Label>
						<Input
							id="material-price"
							inputMode="decimal"
							value={price}
							onChange={(event) => {
								setPrice(event.target.value);
							}}
							placeholder={t("jobCard.materials.placeholder.price")}
						/>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="min-w-[160px]">
						<Label className="text-sm text-slate-600">
							{t("jobCard.materials.vat")}
						</Label>
						<Select
							value={String(vatRate)}
							onValueChange={(value) => {
								setVatRate(normalizeVatRate(Number(value)));
							}}
						>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder={t("jobCard.materials.vat")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="21">
									{t("jobCard.materials.option.21")}
								</SelectItem>
								<SelectItem value="9">
									{t("jobCard.materials.option.9")}
								</SelectItem>
								<SelectItem value="0">
									{t("jobCard.materials.option.0")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex-1" />
					<Button
						type="submit"
						size="lg"
						className="min-h-12"
						disabled={pending || isProcessing}
					>
						{t("jobCard.materials.button")}
					</Button>
				</div>
			</form>

			{lines.length > 0 ? (
				<ul className="space-y-3" aria-label={t("jobCard.materials.listLabel")}>
					{lines.map((line) => {
						const ex = Math.round(line.unitPriceCents * line.qty);
						const vat = Math.round((ex * line.vatRate) / 100);
						const inc = ex + vat;
						return (
							<li
								key={line.id}
								className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
							>
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="font-medium text-slate-800">{line.name}</p>
										<p className="text-sm text-slate-600">
											{t("jobCard.materials.line.summary", {
												qty: line.qty,
												unit: line.unit,
												price: formatCurrency(line.unitPriceCents),
											})}
										</p>
									</div>
									<div className="text-right text-sm text-slate-700">
										<div>
											{t("jobCard.materials.line.ex", {
												amount: formatCurrency(ex),
											})}
										</div>
										<div>
											{t("jobCard.materials.line.vat", {
												amount: formatCurrency(vat),
												rate: t(`jobCard.materials.option.${line.vatRate}`),
											})}
										</div>
										<div className="font-semibold text-slate-900">
											{t("jobCard.materials.line.inc", {
												amount: formatCurrency(inc),
											})}
										</div>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="text-sm text-slate-500">{t("jobCard.materials.empty")}</p>
			)}
		</section>
	);
}
