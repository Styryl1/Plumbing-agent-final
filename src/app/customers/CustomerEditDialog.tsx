"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import type { CustomerDTO, UpdateCustomerInput } from "~/types/customer";

// Form state matches create dialog
interface UpdateCustomerFormData {
	name: string;
	primaryPhone: string;
	additionalPhones?: string;
	email?: string;
	address?: string;
	postalCode?: string;
	houseNumber?: string;
	street?: string;
	city?: string;
	language: "nl" | "en";
	kvk?: string;
	btw?: string;
	customFields?: string;
}

interface CustomerEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	customer?: CustomerDTO | undefined;
	onCustomerUpdated: () => void;
}

export default function CustomerEditDialog({
	open,
	onOpenChange,
	customer,
	onCustomerUpdated,
}: CustomerEditDialogProps): JSX.Element {
	const t = useTranslations();

	const utils = api.useUtils();

	// Initialize react-hook-form
	const form = useForm<UpdateCustomerFormData>({
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

	// Reset form data when customer changes
	useEffect(() => {
		if (customer) {
			const secondaryPhones = customer.phones.filter(
				(phone, index) => index > 0,
			);
			const customFieldsString =
				Object.keys(customer.customFields).length > 0
					? JSON.stringify(customer.customFields, null, 2)
					: "";
			form.reset({
				name: customer.name,
				primaryPhone: customer.primaryPhone ?? customer.phones.at(0) ?? "",
				additionalPhones: secondaryPhones.join("\n"),
				email: customer.email ?? "",
				address: customer.address ?? "",
				postalCode: customer.postalCode ?? "",
				houseNumber: customer.houseNumber ?? "",
				street: customer.street ?? "",
				city: customer.city ?? "",
				language: customer.language,
				kvk: customer.kvk ?? "",
				btw: customer.btw ?? "",
				customFields: customFieldsString,
			});
		} else {
			form.reset({
				name: "",
				primaryPhone: "",
				additionalPhones: "",
				language: "nl",
				kvk: "",
				btw: "",
				customFields: "",
			});
		}
	}, [customer, form]);

	// Update customer mutation
	const updateCustomerMutation = api.customers.update.useMutation({
		onSuccess: (updatedCustomer) => {
			// Update cache with new customer data
			utils.customers.byId.setData({ id: updatedCustomer.id }, updatedCustomer);

			// Invalidate list queries to ensure consistency
			void utils.customers.list.invalidate();
			void utils.customers.search.invalidate();

			onCustomerUpdated();
			toast.success(t("customers.success.updated"));
		},
		onError: (error) => {
			const zodFlatten = getZodFlattenFromTRPC(error);
			if (zodFlatten) {
				applyZodFlattenToForm(zodFlatten, form);
				return;
			}
			// Show error toast
			toast.error(t("customers.error.update"));
		},
	});

	const handleSubmit = form.handleSubmit((formData) => {
		if (!customer) return;

		const primaryPhone = formData.primaryPhone.trim();
		const additionalPhones = (formData.additionalPhones ?? "")
			.split(/[\\s,;]+/)
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

		let customFields: Record<string, unknown> | undefined = undefined;
		const customFieldsInput = formData.customFields?.trim() ?? "";

		if (customFieldsInput.length > 0) {
			try {
				const parsed: unknown = JSON.parse(customFieldsInput);
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
		} else if (Object.keys(customer.customFields).length > 0) {
			customFields = {};
		}

		const cleanFormData: UpdateCustomerInput = {};

		const trimmedName = formData.name.trim();
		if (trimmedName !== customer.name) {
			cleanFormData.name = trimmedName;
		}

		const existingPhones = customer.phones;
		const phonesChanged =
			uniquePhones.length !== existingPhones.length ||
			uniquePhones.some((phone, index) => phone !== existingPhones[index]);

		if (phonesChanged) {
			cleanFormData.phones = uniquePhones;
		}

		const trimmedEmail = formData.email?.trim() ?? "";
		if (trimmedEmail !== (customer.email ?? "")) {
			if (trimmedEmail.length > 0) {
				cleanFormData.email = trimmedEmail;
			} else {
				cleanFormData.email = null;
			}
		}

		const trimmedAddress = formData.address?.trim() ?? "";
		if (trimmedAddress !== (customer.address ?? "")) {
			if (trimmedAddress.length > 0) {
				cleanFormData.address = trimmedAddress;
			} else {
				cleanFormData.address = null;
			}
		}

		const trimmedPostal = formData.postalCode?.trim() ?? "";
		if (trimmedPostal !== (customer.postalCode ?? "")) {
			if (trimmedPostal.length > 0) {
				cleanFormData.postalCode = trimmedPostal;
			} else {
				cleanFormData.postalCode = null;
			}
		}

		const trimmedHouseNumber = formData.houseNumber?.trim() ?? "";
		if (trimmedHouseNumber !== (customer.houseNumber ?? "")) {
			if (trimmedHouseNumber.length > 0) {
				cleanFormData.houseNumber = trimmedHouseNumber;
			} else {
				cleanFormData.houseNumber = null;
			}
		}

		const trimmedStreet = formData.street?.trim() ?? "";
		if (trimmedStreet !== (customer.street ?? "")) {
			if (trimmedStreet.length > 0) {
				cleanFormData.street = trimmedStreet;
			} else {
				cleanFormData.street = null;
			}
		}

		const trimmedCity = formData.city?.trim() ?? "";
		if (trimmedCity !== (customer.city ?? "")) {
			if (trimmedCity.length > 0) {
				cleanFormData.city = trimmedCity;
			} else {
				cleanFormData.city = null;
			}
		}

		const trimmedKvk = formData.kvk?.trim() ?? "";
		if (trimmedKvk !== (customer.kvk ?? "")) {
			cleanFormData.kvk = trimmedKvk.length > 0 ? trimmedKvk : null;
		}

		const trimmedBtw = formData.btw?.trim() ?? "";
		if (trimmedBtw !== (customer.btw ?? "")) {
			cleanFormData.btw = trimmedBtw.length > 0 ? trimmedBtw : null;
		}

		if (customFields !== undefined) {
			const nextSerialized = JSON.stringify(customFields ?? {});
			const existingSerialized = JSON.stringify(customer.customFields ?? {});
			if (nextSerialized !== existingSerialized) {
				cleanFormData.customFields = customFields ?? {};
			}
		}

		if (formData.language !== customer.language) {
			cleanFormData.language = formData.language;
		}

		if (Object.keys(cleanFormData).length > 0) {
			const updatePayload: UpdateCustomerInput & { phones: string[] } = {
				phones: cleanFormData.phones ?? customer.phones,
				...cleanFormData,
			};

			updateCustomerMutation.mutate({
				id: customer.id,
				data: updatePayload,
			});
		} else {
			onCustomerUpdated();
		}
	});

	if (!customer) {
		return <div />;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("customers.edit.title")}</DialogTitle>
					<DialogDescription>
						{t("customers.edit.description")}
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
										disabled={isLooking}
									/>
									{form.formState.errors.houseNumber && (
										<p className="text-sm text-red-500">
											{form.formState.errors.houseNumber.message}
										</p>
									)}
								</div>
							</div>

							{/* Auto-filled fields (read-only) */}
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label htmlFor="street">
										{t("customers.form.street.label")}
									</Label>
									<Input
										id="street"
										type="text"
										placeholder={t("customers.form.street.placeholder")}
										{...form.register("street")}
										className="bg-gray-50"
										readOnly
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="city">{t("customers.form.city.label")}</Label>
									<Input
										id="city"
										type="text"
										placeholder={t("customers.form.city.placeholder")}
										{...form.register("city")}
										className="bg-gray-50"
										readOnly
									/>
								</div>
							</div>

							{isLooking && (
								<p className="text-sm text-blue-600">
									{t("customers.form.address.autoFill.loading")}
								</p>
							)}
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
							disabled={
								!form.formState.isValid ||
								updateCustomerMutation.isPending ||
								isLooking ||
								form.watch("primaryPhone").trim().length === 0
							}
						>
							{updateCustomerMutation.isPending
								? t("common.loading")
								: t("actions.edit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
