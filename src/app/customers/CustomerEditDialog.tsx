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
	phone?: string | undefined;
	email?: string | undefined;
	address?: string | undefined;
	postalCode?: string | undefined;
	houseNumber?: string | undefined;
	street?: string | undefined;
	city?: string | undefined;
	language: "nl" | "en";
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
	const tCustomers = useTranslations("customers");
	const tForm = useTranslations("customers.form");
	const tCommon = useTranslations("common");
	const tAction = useTranslations("action");

	const utils = api.useUtils();

	// Initialize react-hook-form
	const form = useForm<UpdateCustomerFormData>({
		defaultValues: {
			name: "",
			language: "nl",
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
			form.reset({
				name: customer.name,
				phone: customer.phone,
				email: customer.email ?? "",
				address: customer.address ?? "",
				postalCode: customer.postalCode ?? "",
				houseNumber: customer.houseNumber ?? "",
				street: customer.street ?? "",
				city: customer.city ?? "",
				language: customer.language,
			});
		} else {
			form.reset({
				name: "",
				language: "nl",
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
			toast.success(tCustomers("success.updated"));
		},
		onError: (error) => {
			const zodFlatten = getZodFlattenFromTRPC(error);
			if (zodFlatten) {
				applyZodFlattenToForm(zodFlatten, form);
				return;
			}
			// Show error toast
			toast.error(tCustomers("error.update"));
		},
	});

	const handleSubmit = form.handleSubmit((formData) => {
		if (!customer) return;

		// Build clean form data - only send changed fields
		const cleanFormData: UpdateCustomerInput = {};

		// Check and add each field if it changed
		if (formData.name !== customer.name) {
			cleanFormData.name = formData.name;
		}
		if (formData.phone?.trim() !== customer.phone) {
			cleanFormData.phone = formData.phone?.trim() ?? "";
		}
		if ((formData.email?.trim() ?? "") !== (customer.email ?? "")) {
			const trimmed = formData.email?.trim();
			if (trimmed) {
				cleanFormData.email = trimmed;
			}
		}
		if ((formData.address?.trim() ?? "") !== (customer.address ?? "")) {
			const trimmed = formData.address?.trim();
			if (trimmed) {
				cleanFormData.address = trimmed;
			}
		}
		if ((formData.postalCode?.trim() ?? "") !== (customer.postalCode ?? "")) {
			const trimmed = formData.postalCode?.trim();
			if (trimmed) {
				cleanFormData.postalCode = trimmed;
			}
		}
		if ((formData.houseNumber?.trim() ?? "") !== (customer.houseNumber ?? "")) {
			const trimmed = formData.houseNumber?.trim();
			if (trimmed) {
				cleanFormData.houseNumber = trimmed;
			}
		}
		if ((formData.street?.trim() ?? "") !== (customer.street ?? "")) {
			const trimmed = formData.street?.trim();
			if (trimmed) {
				cleanFormData.street = trimmed;
			}
		}
		if ((formData.city?.trim() ?? "") !== (customer.city ?? "")) {
			const trimmed = formData.city?.trim();
			if (trimmed) {
				cleanFormData.city = trimmed;
			}
		}
		if (formData.language !== customer.language) {
			cleanFormData.language = formData.language;
		}

		// Only update if there are actual changes
		if (Object.keys(cleanFormData).length > 0) {
			updateCustomerMutation.mutate({
				id: customer.id,
				data: cleanFormData,
			});
		} else {
			onCustomerUpdated(); // Close dialog if no changes
		}
	});

	if (!customer) {
		return <div />;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{tCustomers("edit.title")}</DialogTitle>
					<DialogDescription>
						{tCustomers("edit.description")}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					<div className="grid gap-4">
						{/* Name */}
						<div className="space-y-2">
							<Label htmlFor="name">{tForm("name.label")}</Label>
							<Input
								id="name"
								type="text"
								placeholder={tForm("name.placeholder")}
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
							<Label htmlFor="email">{tForm("email.label")}</Label>
							<Input
								id="email"
								type="email"
								placeholder={tForm("email.placeholder")}
								{...form.register("email")}
								className={form.formState.errors.email ? "border-red-500" : ""}
							/>
							{form.formState.errors.email && (
								<p className="text-sm text-red-500">
									{form.formState.errors.email.message}
								</p>
							)}
						</div>

						{/* Phone */}
						<div className="space-y-2">
							<Label htmlFor="phone">{tForm("phone.label")}</Label>
							<Input
								id="phone"
								type="tel"
								placeholder={tForm("phone.placeholder")}
								{...form.register("phone")}
								className={form.formState.errors.phone ? "border-red-500" : ""}
							/>
							{form.formState.errors.phone && (
								<p className="text-sm text-red-500">
									{form.formState.errors.phone.message}
								</p>
							)}
						</div>

						{/* Address */}
						<div className="space-y-2">
							<Label htmlFor="address">{tForm("address.label")}</Label>
							<Input
								id="address"
								type="text"
								placeholder={tForm("address.placeholder")}
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
								{tForm("address.autoFill.title")}
							</h4>

							{/* Postal Code */}
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label htmlFor="postalCode">
										{tForm("postalCode.label")}
									</Label>
									<Input
										id="postalCode"
										type="text"
										placeholder={tForm("postalCode.placeholder")}
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
										{tForm("houseNumber.label")}
									</Label>
									<Input
										id="houseNumber"
										type="text"
										placeholder={tForm("houseNumber.placeholder")}
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
									<Label htmlFor="street">{tForm("street.label")}</Label>
									<Input
										id="street"
										type="text"
										placeholder={tForm("street.placeholder")}
										{...form.register("street")}
										className="bg-gray-50"
										readOnly
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="city">{tForm("city.label")}</Label>
									<Input
										id="city"
										type="text"
										placeholder={tForm("city.placeholder")}
										{...form.register("city")}
										className="bg-gray-50"
										readOnly
									/>
								</div>
							</div>

							{isLooking && (
								<p className="text-sm text-blue-600">
									{tForm("address.autoFill.loading")}
								</p>
							)}
						</div>

						{/* Language */}
						<div className="space-y-2">
							<Label htmlFor="language">{tForm("language.label")}</Label>
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
							{tCommon("cancel")}
						</Button>
						<Button
							type="submit"
							disabled={
								!form.formState.isValid ||
								updateCustomerMutation.isPending ||
								isLooking
							}
						>
							{updateCustomerMutation.isPending
								? tCommon("loading")
								: tAction("edit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
