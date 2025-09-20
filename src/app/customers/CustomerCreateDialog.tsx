"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useAutoFillAddress } from "~/hooks/useAutoFillAddress";
import { api } from "~/lib/trpc/client";
import {
	applyZodFlattenToForm,
	getZodFlattenFromTRPC,
} from "~/lib/trpcZodClient";
import type { CreateCustomerInput } from "~/types/customer";

// Form state allows undefined values during editing
interface CreateCustomerFormData {
	name: string;
	primaryPhone: string;
	additionalPhones?: string;
	email?: string;
	address?: string; // Legacy flat address field
	postalCode?: string;
	houseNumber?: string;
	street?: string;
	city?: string;
	language: "nl" | "en";
	kvk?: string;
	btw?: string;
	customFields?: string; // JSON blob
}

interface CustomerCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCustomerCreated: () => void;
}

export default function CustomerCreateDialog({
	open,
	onOpenChange,
	onCustomerCreated,
}: CustomerCreateDialogProps): JSX.Element {
	const t = useTranslations();

	// No need for separate field error state - React Hook Form manages this

	// Initialize react-hook-form for auto-fill functionality
	const form = useForm<CreateCustomerFormData>({
		defaultValues: {
			name: "",
			primaryPhone: "",
			additionalPhones: "",
			language: "nl",
			kvk: "",
			btw: "",
			customFields: "",
		},
	});

	// Auto-fill hook for Dutch address lookup
	const { isLooking } = useAutoFillAddress(form, {
		postalCode: "postalCode",
		houseNumber: "houseNumber",
		street: "street",
		city: "city",
	});

	// Create customer mutation
	const createCustomerMutation = api.customers.create.useMutation({
		onSuccess: () => {
			onCustomerCreated();
			// Reset form and clear errors
			form.reset({
				name: "",
				primaryPhone: "",
				additionalPhones: "",
				language: "nl",
				kvk: "",
				btw: "",
				customFields: "",
				email: "",
				address: "",
				postalCode: "",
				houseNumber: "",
				street: "",
				city: "",
			});
		},
		onError: (error) => {
			const zodFlatten = getZodFlattenFromTRPC(error);
			if (zodFlatten) {
				applyZodFlattenToForm(zodFlatten, form);
				return;
			}
			// Non-validation errors: log only to avoid noisy UI
			console.warn("Customer creation failed:", error.message);
		},
	});

	const handleSubmit = form.handleSubmit((formData) => {
		const primaryPhone = formData.primaryPhone.trim();
		const additionalPhones = (formData.additionalPhones ?? "")
			.split(/[\s,;]+/)
			.map((value) => value.trim())
			.filter((value) => value.length > 0);

		const phones = [primaryPhone, ...additionalPhones].filter(
			(value) => value.length > 0,
		);
		const uniquePhones = Array.from(new Set(phones));

		if (uniquePhones.length === 0) {
			form.setError("primaryPhone", {
				type: "manual",
				message: t("customers.form.validation.phoneRequired"),
			});
			return;
		}

		let customFields: Record<string, unknown> | undefined;

		if (formData.customFields && formData.customFields.trim().length > 0) {
			try {
				const parsed: unknown = JSON.parse(formData.customFields);
				if (
					parsed === null ||
					Array.isArray(parsed) ||
					typeof parsed !== "object"
				) {
					throw new Error("Custom fields must be an object");
				}
				customFields = parsed as Record<string, unknown>;
			} catch {
				form.setError("customFields", {
					type: "validate",
					message: t("customers.form.validation.customFieldsInvalid"),
				});
				return;
			}
		}

		const cleanFormData: CreateCustomerInput = {
			name: formData.name.trim(),
			phones: uniquePhones,
			language: formData.language,
		};

		if (formData.email && formData.email.trim().length > 0) {
			cleanFormData.email = formData.email.trim();
		}
		if (formData.address && formData.address.trim().length > 0) {
			cleanFormData.address = formData.address.trim();
		}
		if (formData.postalCode && formData.postalCode.trim().length > 0) {
			cleanFormData.postalCode = formData.postalCode.trim();
		}
		if (formData.houseNumber && formData.houseNumber.trim().length > 0) {
			cleanFormData.houseNumber = formData.houseNumber.trim();
		}
		if (formData.street && formData.street.trim().length > 0) {
			cleanFormData.street = formData.street.trim();
		}
		if (formData.city && formData.city.trim().length > 0) {
			cleanFormData.city = formData.city.trim();
		}
		if (formData.kvk && formData.kvk.trim().length > 0) {
			cleanFormData.kvk = formData.kvk.trim();
		}
		if (formData.btw && formData.btw.trim().length > 0) {
			cleanFormData.btw = formData.btw.trim();
		}
		if (customFields) {
			cleanFormData.customFields = customFields;
		}

		createCustomerMutation.mutate(cleanFormData);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("customers.create.title")}</DialogTitle>
					<DialogDescription>
						{t("customers.create.description")}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					<div className="grid gap-4">
						{/* Name */}
						<div className="space-y-2">
							<Label htmlFor="name">{t("customers.form.name.label")}</Label>
							<Input
								id="name"
								type="text"
								placeholder={t("customers.form.name.placeholder")}
								{...form.register("name")}
								className={form.formState.errors.name ? "border-red-500" : ""}
								required
							/>
							{form.formState.errors.name && (
								<p className="text-sm text-red-500">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label htmlFor="email">{t("customers.form.email.label")}</Label>
							<Input
								id="email"
								type="email"
								placeholder={t("customers.form.email.placeholder")}
								{...form.register("email")}
								className={form.formState.errors.email ? "border-red-500" : ""}
							/>
							{form.formState.errors.email && (
								<p className="text-sm text-red-500">
									{form.formState.errors.email.message}
								</p>
							)}
						</div>

						{/* Primary Phone */}
						<div className="space-y-2">
							<Label htmlFor="primaryPhone">
								{t("customers.form.phone.label")}
							</Label>
							<Input
								id="primaryPhone"
								type="tel"
								placeholder={t("customers.form.phone.placeholder")}
								{...form.register("primaryPhone")}
								className={
									form.formState.errors.primaryPhone ? "border-red-500" : ""
								}
								required
							/>
							{form.formState.errors.primaryPhone && (
								<p className="text-sm text-red-500">
									{form.formState.errors.primaryPhone.message}
								</p>
							)}
						</div>

						{/* Additional Phones */}
						<div className="space-y-2">
							<Label htmlFor="additionalPhones">
								{t("customers.form.additionalPhones.label")}
							</Label>
							<Textarea
								id="additionalPhones"
								placeholder={t("customers.form.additionalPhones.placeholder")}
								{...form.register("additionalPhones")}
								className={
									form.formState.errors.additionalPhones ? "border-red-500" : ""
								}
							/>
							<p className="text-xs text-muted-foreground">
								{t("customers.form.additionalPhones.help")}
							</p>
							{form.formState.errors.additionalPhones && (
								<p className="text-sm text-red-500">
									{form.formState.errors.additionalPhones.message}
								</p>
							)}
						</div>

						{/* KVK */}
						<div className="space-y-2">
							<Label htmlFor="kvk">{t("customers.form.kvk.label")}</Label>
							<Input
								id="kvk"
								type="text"
								placeholder={t("customers.form.kvk.placeholder")}
								{...form.register("kvk")}
								className={form.formState.errors.kvk ? "border-red-500" : ""}
							/>
							{form.formState.errors.kvk && (
								<p className="text-sm text-red-500">
									{form.formState.errors.kvk.message}
								</p>
							)}
						</div>

						{/* BTW */}
						<div className="space-y-2">
							<Label htmlFor="btw">{t("customers.form.btw.label")}</Label>
							<Input
								id="btw"
								type="text"
								placeholder={t("customers.form.btw.placeholder")}
								{...form.register("btw")}
								className={form.formState.errors.btw ? "border-red-500" : ""}
							/>
							{form.formState.errors.btw && (
								<p className="text-sm text-red-500">
									{form.formState.errors.btw.message}
								</p>
							)}
						</div>

						{/* Custom Fields */}
						<div className="space-y-2">
							<Label htmlFor="customFields">
								{t("customers.form.customFields.label")}
							</Label>
							<Textarea
								id="customFields"
								placeholder={t("customers.form.customFields.placeholder")}
								{...form.register("customFields")}
								className={
									form.formState.errors.customFields ? "border-red-500" : ""
								}
							/>
							<p className="text-xs text-muted-foreground">
								{t("customers.form.customFields.help")}
							</p>
							{form.formState.errors.customFields && (
								<p className="text-sm text-red-500">
									{form.formState.errors.customFields.message}
								</p>
							)}
						</div>
						{/* Address */}
						<div className="space-y-2">
							<Label htmlFor="address">
								{t("customers.form.address.label")}
							</Label>
							<Input
								id="address"
								type="text"
								placeholder={t("customers.form.address.placeholder")}
								{...form.register("address")}
								className={
									form.formState.errors.address ? "border-red-500" : ""
								}
							/>
							{form.formState.errors.address && (
								<p className="text-sm text-red-500">
									{form.formState.errors.address.message}
								</p>
							)}
						</div>

						{/* Dutch Address Auto-fill Section */}
						<div className="space-y-4 p-4 bg-gray-50 rounded-md">
							<h4 className="text-sm font-medium text-gray-700">
								{t("customers.form.address.autoFill.title")}
							</h4>

							{/* Postal Code */}
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label htmlFor="postalCode">
										{t("customers.form.postalCode.label")}
									</Label>
									<Input
										id="postalCode"
										type="text"
										placeholder={t("customers.form.postalCode.placeholder")}
										{...form.register("postalCode")}
										className={
											form.formState.errors.postalCode ? "border-red-500" : ""
										}
									/>
									{form.formState.errors.postalCode && (
										<p className="text-sm text-red-500">
											{form.formState.errors.postalCode.message}
										</p>
									)}
								</div>

								{/* House Number */}
								<div className="space-y-2">
									<Label htmlFor="houseNumber">
										{t("customers.form.houseNumber.label")}
									</Label>
									<Input
										id="houseNumber"
										type="text"
										placeholder={t("customers.form.houseNumber.placeholder")}
										{...form.register("houseNumber")}
										className={
											form.formState.errors.houseNumber ? "border-red-500" : ""
										}
									/>
									{form.formState.errors.houseNumber && (
										<p className="text-sm text-red-500">
											{form.formState.errors.houseNumber.message}
										</p>
									)}
								</div>
							</div>

							{/* Auto-filled Street */}
							<div className="space-y-2">
								<Label htmlFor="street">
									{t("customers.form.street.label")}
								</Label>
								<Input
									id="street"
									type="text"
									placeholder={t("customers.form.street.placeholder")}
									{...form.register("street")}
									className={`${form.formState.errors.street ? "border-red-500" : ""} ${isLooking ? "bg-yellow-50" : ""}`}
									readOnly={isLooking}
								/>
								{isLooking && (
									<p className="text-xs text-yellow-600">
										{t("common.loading")}...
									</p>
								)}
								{form.formState.errors.street && (
									<p className="text-sm text-red-500">
										{form.formState.errors.street.message}
									</p>
								)}
							</div>

							{/* Auto-filled City */}
							<div className="space-y-2">
								<Label htmlFor="city">{t("customers.form.city.label")}</Label>
								<Input
									id="city"
									type="text"
									placeholder={t("customers.form.city.placeholder")}
									{...form.register("city")}
									className={`${form.formState.errors.city ? "border-red-500" : ""} ${isLooking ? "bg-yellow-50" : ""}`}
									readOnly={isLooking}
								/>
								{form.formState.errors.city && (
									<p className="text-sm text-red-500">
										{form.formState.errors.city.message}
									</p>
								)}
							</div>
						</div>

						{/* Language */}
						<div className="space-y-2">
							<Label htmlFor="language">
								{t("customers.form.language.label")}
							</Label>
							<Select
								value={form.watch("language")}
								onValueChange={(value: "nl" | "en") => {
									form.setValue("language", value);
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="nl">Nederlands</SelectItem>
									<SelectItem value="en">English</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								onOpenChange(false);
							}}
						>
							{t("actions.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={(() => {
								const nameValue = form.watch("name").trim();
								const phoneValue = form.watch("primaryPhone").trim();
								return (
									nameValue.length === 0 ||
									phoneValue.length === 0 ||
									Boolean(createCustomerMutation.isPending)
								);
							})()}
						>
							{createCustomerMutation.isPending
								? t("common.loading")
								: t("customers.addNew")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
