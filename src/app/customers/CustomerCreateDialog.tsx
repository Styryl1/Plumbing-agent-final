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
	phone?: string | undefined;
	email?: string | undefined;
	address?: string | undefined; // Legacy flat address field
	postalCode?: string | undefined;
	houseNumber?: string | undefined;
	street?: string | undefined;
	city?: string | undefined;
	language: "nl" | "en";
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
	const tCustomers = useTranslations("customers");
	const tForm = useTranslations("customers.form");
	const tCommon = useTranslations("common");

	// No need for separate field error state - React Hook Form manages this

	// Initialize react-hook-form for auto-fill functionality
	const form = useForm<CreateCustomerFormData>({
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

	// Create customer mutation
	const createCustomerMutation = api.customers.create.useMutation({
		onSuccess: () => {
			onCustomerCreated();
			// Reset form and clear errors
			form.reset({
				name: "",
				language: "nl",
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
		// Build clean form data with required fields
		const cleanFormData: CreateCustomerInput = {
			name: formData.name,
			phone: formData.phone?.trim() ?? "", // Required field
		};

		// Language is always defined in create form
		cleanFormData.language = formData.language;

		// Only add optional fields if they have values
		if (formData.email !== undefined && formData.email.trim() !== "") {
			cleanFormData.email = formData.email.trim();
		}
		if (formData.address !== undefined && formData.address.trim() !== "") {
			cleanFormData.address = formData.address.trim();
		}
		if (
			formData.postalCode !== undefined &&
			formData.postalCode.trim() !== ""
		) {
			cleanFormData.postalCode = formData.postalCode.trim();
		}
		if (
			formData.houseNumber !== undefined &&
			formData.houseNumber.trim() !== ""
		) {
			cleanFormData.houseNumber = formData.houseNumber.trim();
		}
		if (formData.street !== undefined && formData.street.trim() !== "") {
			cleanFormData.street = formData.street.trim();
		}
		if (formData.city !== undefined && formData.city.trim() !== "") {
			cleanFormData.city = formData.city.trim();
		}

		createCustomerMutation.mutate(cleanFormData);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{tCustomers("create.title")}</DialogTitle>
					<DialogDescription>
						{tCustomers("create.description")}
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
								<Label htmlFor="street">{tForm("street.label")}</Label>
								<Input
									id="street"
									type="text"
									placeholder={tForm("street.placeholder")}
									{...form.register("street")}
									className={`${form.formState.errors.street ? "border-red-500" : ""} ${isLooking ? "bg-yellow-50" : ""}`}
									readOnly={isLooking}
								/>
								{isLooking && (
									<p className="text-xs text-yellow-600">
										{tCommon("loading")}...
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
								<Label htmlFor="city">{tForm("city.label")}</Label>
								<Input
									id="city"
									type="text"
									placeholder={tForm("city.placeholder")}
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
							disabled={(() => {
								const nameValue = form.watch("name").trim();
								return (
									nameValue.length === 0 ||
									Boolean(createCustomerMutation.isPending)
								);
							})()}
						>
							{createCustomerMutation.isPending
								? tCommon("loading")
								: tCustomers("addNew")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
