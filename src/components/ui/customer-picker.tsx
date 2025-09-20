"use client";

import { Check, ChevronsUpDown, Search, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { formatPhoneNumber } from "~/lib/phone";
import { api } from "~/lib/trpc/client";
import { cn } from "~/lib/utils";
import type { CustomerDTO } from "~/types/customer";

interface CustomerPickerProps {
	value?: string | undefined;
	onChange: (customerId: string | undefined) => void;
	required?: boolean;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function CustomerPicker({
	value,
	onChange,
	placeholder,
	className,
	disabled = false,
}: CustomerPickerProps): JSX.Element {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [createFormData, setCreateFormData] = useState({
		name: "",
		phone: "",
		email: "",
	});

	// Fetch recent customers (updated in last 14 days, sorted by updated_at desc)
	const { data: recentCustomers = [] } = api.customers.list.useQuery({
		limit: 10,
		sortBy: "updated_at",
		sortOrder: "desc",
	});

	// Fetch all customers (sorted by name for easier browsing)
	const { data: allCustomers = [], isLoading } = api.customers.list.useQuery({
		limit: 50,
		sortBy: "name",
		sortOrder: "asc",
	});

	// Filter out recent customers from all customers to avoid duplicates
	const recentCustomerIds = new Set(recentCustomers.map((c) => c.id));
	const otherCustomers = allCustomers.filter(
		(c) => !recentCustomerIds.has(c.id),
	);

	// Customer creation mutation
	const utils = api.useUtils();
	const createCustomerMutation = api.customers.create.useMutation({
		onSuccess: (newCustomer) => {
			// Clear form and hide it
			setCreateFormData({ name: "", phone: "", email: "" });
			setShowCreateForm(false);
			// Select the new customer
			onChange(newCustomer.id);
			setOpen(false);
			// Invalidate customer queries to show the new customer in lists
			void utils.customers.list.invalidate();
			toast.success(t("customers.success.created"));
		},
		onError: (error) => {
			console.error("Failed to create customer:", error);
			toast.error(t("customers.error.create"));
		},
	});

	// Filter function for search
	const filterCustomer = (customer: CustomerDTO) => {
		if (!search) return true;
		const searchLower = search.toLowerCase();
		const nameMatch = customer.name.toLowerCase().includes(searchLower);
		const phoneMatch = customer.phones.some((phone) =>
			phone.toLowerCase().includes(searchLower),
		);
		const emailMatch =
			customer.email?.toLowerCase().includes(searchLower) ?? false;
		return nameMatch || phoneMatch || emailMatch;
	};

	// Filter customers based on search
	const filteredRecentCustomers = recentCustomers.filter(filterCustomer);
	const filteredOtherCustomers = otherCustomers.filter(filterCustomer);

	// Find selected customer from all available customers
	const allCustomersList = [...recentCustomers, ...otherCustomers];
	const selectedCustomer = allCustomersList.find(
		(c: CustomerDTO) => c.id === value,
	);

	// Helper functions for customer creation
	const handleCreateCustomer = () => {
		if (!createFormData.name.trim() || !createFormData.phone.trim()) {
			toast.error(t("customers.errors.name.required"));
			return;
		}

		createCustomerMutation.mutate({
			name: createFormData.name.trim(),
			phones: [createFormData.phone.trim()],
			email: createFormData.email.trim() || undefined,
			language: "nl", // Default to Dutch for Netherlands plumber
		});
	};

	const handleCancelCreate = () => {
		setCreateFormData({ name: "", phone: "", email: "" });
		setShowCreateForm(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label={t("customers.selectCustomer")}
					className={cn(
						"w-full justify-between",
						!value && "text-muted-foreground",
						className,
					)}
					disabled={disabled || isLoading}
				>
					{value ? (
						<div className="flex items-center gap-2 truncate">
							<span className="truncate">{selectedCustomer?.name}</span>
							{(() => {
								const preferredPhone =
									selectedCustomer?.primaryPhone ?? selectedCustomer?.phones[0];
								if (!preferredPhone) {
									return null;
								}

								return (
									<span className="text-xs text-muted-foreground">
										({formatPhoneNumber(preferredPhone)})
									</span>
								);
							})()}
						</div>
					) : (
						<span>{placeholder ?? t("customers.selectCustomer")}</span>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0" align="start">
				<Command>
					<div className="flex items-center border-b px-3">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<input
							className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
							placeholder={t("customers.searchPlaceholder")}
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
							}}
						/>
					</div>
					<CommandList>
						{/* Quick Customer Creation Form */}
						{showCreateForm && (
							<div className="p-4 border-b border-border">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-sm font-medium">
										{t("customers.create.title")}
									</h3>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 w-6 p-0"
										onClick={handleCancelCreate}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
								<div className="space-y-2">
									<div>
										<Label htmlFor="create-name" className="text-xs">
											{t("customers.form.name.label")} *
										</Label>
										<Input
											id="create-name"
											placeholder={t("customers.form.name.placeholder")}
											value={createFormData.name}
											onChange={(e) => {
												setCreateFormData((prev) => ({
													...prev,
													name: e.target.value,
												}));
											}}
											className="h-8 text-sm"
										/>
									</div>
									<div>
										<Label htmlFor="create-phone" className="text-xs">
											{t("customers.form.phone.label")} *
										</Label>
										<Input
											id="create-phone"
											placeholder={t("customers.form.phone.placeholder")}
											value={createFormData.phone}
											onChange={(e) => {
												setCreateFormData((prev) => ({
													...prev,
													phone: e.target.value,
												}));
											}}
											className="h-8 text-sm"
										/>
									</div>
									<div>
										<Label htmlFor="create-email" className="text-xs">
											{t("customers.form.email.label")}
										</Label>
										<Input
											id="create-email"
											placeholder={t("customers.form.email.placeholder")}
											type="email"
											value={createFormData.email}
											onChange={(e) => {
												setCreateFormData((prev) => ({
													...prev,
													email: e.target.value,
												}));
											}}
											className="h-8 text-sm"
										/>
									</div>
									<div className="flex gap-2 pt-2">
										<Button
											size="sm"
											onClick={handleCreateCustomer}
											disabled={createCustomerMutation.isPending}
											className="flex-1"
										>
											{createCustomerMutation.isPending
												? t("actions.creating")
												: t("actions.create")}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={handleCancelCreate}
										>
											{t("common.cancel")}
										</Button>
									</div>
								</div>
							</div>
						)}

						<CommandEmpty className="py-6 text-center text-sm">
							{t("customers.noCustomersFound")}
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 gap-1"
								onClick={() => {
									setShowCreateForm(true);
									setSearch(""); // Clear search when creating
								}}
							>
								<UserPlus className="h-3 w-3" />
								{t("customers.addNew")}
							</Button>
						</CommandEmpty>

						{/* Recent Customers Group */}
						{filteredRecentCustomers.length > 0 && (
							<CommandGroup heading={t("customers.recent")}>
								{filteredRecentCustomers.map((customer: CustomerDTO) => (
									<CommandItem
										key={customer.id}
										value={customer.id}
										onSelect={() => {
											onChange(customer.id);
											setOpen(false);
										}}
										className="cursor-pointer"
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												value === customer.id ? "opacity-100" : "opacity-0",
											)}
										/>
										<div className="flex flex-col">
											<span className="font-medium">{customer.name}</span>
											<div className="flex gap-3 text-xs text-muted-foreground">
												{(() => {
													const preferredPhone =
														customer.primaryPhone ?? customer.phones[0];
													return preferredPhone ? (
														<span>{formatPhoneNumber(preferredPhone)}</span>
													) : null;
												})()}
												{customer.email && <span>{customer.email}</span>}
											</div>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						)}

						{/* All Other Customers Group */}
						{filteredOtherCustomers.length > 0 && (
							<CommandGroup
								heading={
									filteredRecentCustomers.length > 0
										? t("customers.allOthers")
										: undefined
								}
							>
								{filteredOtherCustomers.map((customer: CustomerDTO) => (
									<CommandItem
										key={customer.id}
										value={customer.id}
										onSelect={() => {
											onChange(customer.id);
											setOpen(false);
										}}
										className="cursor-pointer"
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												value === customer.id ? "opacity-100" : "opacity-0",
											)}
										/>
										<div className="flex flex-col">
											<span className="font-medium">{customer.name}</span>
											<div className="flex gap-3 text-xs text-muted-foreground">
												{(() => {
													const preferredPhone =
														customer.primaryPhone ?? customer.phones[0];
													return preferredPhone ? (
														<span>{formatPhoneNumber(preferredPhone)}</span>
													) : null;
												})()}
												{customer.email && <span>{customer.email}</span>}
											</div>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
