"use client";

import {
	Archive,
	Check,
	Copy,
	Edit,
	Mail,
	Phone,
	Trash2,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatPhoneNumber } from "~/lib/phone";
import { epochMs, parseZdt } from "~/lib/time";
import { api } from "~/lib/trpc/client";
import type { CustomerDTO, UpdateCustomerInput } from "~/types/customer";

interface CustomersTableProps {
	customers: CustomerDTO[];
	onEdit: (customer: CustomerDTO) => void;
	onDelete: () => void;
	showArchived?: boolean;
}

export default function CustomersTable({
	customers,
	onEdit,
	onDelete,
	showArchived = false,
}: CustomersTableProps): JSX.Element {
	const t = useTranslations();
	const [searchQuery, setSearchQuery] = useState("");
	const [deletingCustomer, setDeletingCustomer] = useState<CustomerDTO | null>(
		null,
	);

	// Inline editing state
	const [editingCustomer, setEditingCustomer] = useState<{
		id: string;
		field: "phone" | "email";
		value: string;
	} | null>(null);

	const utils = api.useUtils();

	// Copy address to clipboard for navigation apps
	const copyAddress = async (
		address: string,
		postalCode?: string,
	): Promise<void> => {
		try {
			const fullAddress = postalCode ? `${address}, ${postalCode}` : address;
			await navigator.clipboard.writeText(fullAddress);
			toast.success("Address copied to clipboard");
		} catch (error) {
			console.error("Failed to copy address:", error);
			toast.error("Failed to copy address");
		}
	};

	// Delete customer mutation with optimistic updates
	const deleteCustomerMutation = api.customers.delete.useMutation({
		onMutate: async ({ id }) => {
			await utils.customers.list.cancel();
			const previousCustomers = utils.customers.list.getData();

			// Optimistically remove customer from cache (row disappears immediately)
			utils.customers.list.setData(
				undefined,
				(old) => old?.filter((customer) => customer.id !== id) ?? old,
			);

			// Clear any detail cache
			utils.customers.byId.setData({ id }, undefined);

			return { previousCustomers };
		},
		onError: (error, variables, context) => {
			// Rollback optimistic update on error (row reappears)
			if (context?.previousCustomers) {
				utils.customers.list.setData(undefined, context.previousCustomers);
			}

			// Check if it's a CONFLICT error (linked data exists)
			if (
				error.message.includes("linkedDataExists") ||
				error.data?.code === "CONFLICT"
			) {
				// Keep dialog open - UI will show archive option
				toast.error(t("customers.error.deleteLinked"));
			} else {
				// Other errors
				toast.error(t("customers.error.delete"));
			}
		},
		onSuccess: () => {
			// Customer was successfully deleted (hard delete)
			setDeletingCustomer(null);
			toast.success(t("customers.success.deleted"));
			onDelete();
		},
		onSettled: () => {
			// Always invalidate to ensure consistency
			void utils.customers.list.invalidate();
			void utils.customers.listArchived.invalidate();
			void utils.customers.count.invalidate();
			void utils.customers.countArchived.invalidate();
		},
	});

	// Archive customer mutation
	const archiveCustomerMutation = api.customers.archive.useMutation({
		onSuccess: () => {
			setDeletingCustomer(null);
			toast.success(t("customers.success.archived"));
			// Invalidate all customer queries to ensure immediate UI update
			void utils.customers.list.invalidate();
			void utils.customers.listArchived.invalidate();
			void utils.customers.count.invalidate();
			void utils.customers.countArchived.invalidate();
			// Also call the callback for additional cleanup
			onDelete();
		},
		onError: (error) => {
			// Only log actual failures, not "customer not found" after successful operation
			if (error.message !== "Klant niet gevonden of geen permissie") {
				console.error("Failed to archive customer:", error);
				toast.error(t("customers.error.archive"));
			}
		},
	});

	// Unarchive customer mutation
	const unarchiveCustomerMutation = api.customers.unarchive.useMutation({
		onSuccess: () => {
			// Invalidate all customer queries to ensure immediate UI update
			void utils.customers.list.invalidate();
			void utils.customers.listArchived.invalidate();
			void utils.customers.count.invalidate();
			void utils.customers.countArchived.invalidate();
			// Also call the callback for additional cleanup
			onDelete();
		},
		onError: (error) => {
			// Only log actual failures, not "customer not found" after successful operation
			if (error.message !== "Klant niet gevonden of geen permissie") {
				console.error("Failed to unarchive customer:", error);
				toast.error(t("customers.unarchive.error"));
			}
		},
	});

	// Update customer mutation for inline editing
	const updateCustomerMutation = api.customers.update.useMutation({
		onSuccess: () => {
			setEditingCustomer(null);
			void utils.customers.list.invalidate();
			toast.success(t("customers.success.updated"));
		},
		onError: (error) => {
			console.error("Failed to update customer:", error);
			toast.error(t("customers.error.update"));
		},
	});

	// Linked counts query - only fetch when we have a customer to delete and not currently deleting
	const { data: linkedCounts, isLoading: isLoadingLinkedCounts } =
		api.customers.linkedCounts.useQuery(
			{ customerId: deletingCustomer?.id ?? "" },
			{
				enabled: !!deletingCustomer?.id && !deleteCustomerMutation.isPending,
				refetchOnWindowFocus: false,
			},
		);

	// Filter customers based on search
	const filteredCustomers = customers.filter((customer) => {
		const query = searchQuery.toLowerCase();
		const nameMatch = customer.name.toLowerCase().includes(query);
		const emailMatch = customer.email?.toLowerCase().includes(query) ?? false;
		const phoneMatch = customer.phones.some((phone) =>
			phone.toLowerCase().includes(query),
		);
		const addressMatch =
			customer.address?.toLowerCase().includes(query) ?? false;
		return nameMatch || emailMatch || phoneMatch || addressMatch;
	});

	const handleDeleteConfirm = (): void => {
		if (!deletingCustomer) return;

		// Always try to delete first - the API will handle whether it's safe
		// If linked data exists, the API returns 'suggested_archive' and dialog stays open
		// If no linked data, the API deletes and returns 'deleted'
		deleteCustomerMutation.mutate({ id: deletingCustomer.id });
	};

	const handleArchiveConfirm = (): void => {
		if (!deletingCustomer) return;

		archiveCustomerMutation.mutate({
			customerId: deletingCustomer.id,
			reason: "Customer archived due to linked data",
		});
	};

	const handleUnarchive = (customer: CustomerDTO): void => {
		unarchiveCustomerMutation.mutate({
			customerId: customer.id,
		});
	};

	// Inline editing functions
	const startEdit = (
		customerId: string,
		field: "phone" | "email",
		currentValue: string,
	): void => {
		setEditingCustomer({
			id: customerId,
			field,
			value: currentValue,
		});
	};

	const cancelEdit = (): void => {
		setEditingCustomer(null);
	};

	const saveEdit = (): void => {
		if (!editingCustomer) return;

		const customer = customers.find((c) => c.id === editingCustomer.id);
		if (!customer) {
			return;
		}

		const updateData: UpdateCustomerInput = {};
		if (editingCustomer.field === "phone") {
			const trimmedPhone = editingCustomer.value.trim();
			if (trimmedPhone.length === 0) {
				toast.error(t("customers.form.validation.phoneRequired"));
				return;
			}

			const [, ...restPhones] = customer.phones;
			const nextPhones = [trimmedPhone, ...restPhones]
				.map((value) => value.trim())
				.filter(
					(value, index, array) =>
						value.length > 0 && array.indexOf(value) === index,
				);
			updateData.phones = nextPhones;
		} else {
			const trimmedEmail = editingCustomer.value.trim();
			updateData.email = trimmedEmail.length > 0 ? trimmedEmail : null;
		}

		const updatePayload: UpdateCustomerInput & { phones: string[] } = {
			phones: updateData.phones ?? customer.phones,
			...updateData,
		};

		updateCustomerMutation.mutate({
			id: editingCustomer.id,
			data: updatePayload,
		});
	};
	// Determine if customer has linked data
	const hasLinkedData =
		linkedCounts && (linkedCounts.jobs > 0 || linkedCounts.invoices > 0);

	const formatDate = (dateString: string): string => {
		const zdt = parseZdt(dateString);
		const ms = epochMs(zdt);
		return new Intl.DateTimeFormat("nl-NL", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(ms);
	};

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="w-full max-w-sm">
				<Input
					placeholder={t("customers.searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.target.value);
					}}
					className="w-full"
				/>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("customers.table.columns.name")}</TableHead>
							<TableHead>{t("customers.table.columns.contact")}</TableHead>
							<TableHead>{t("customers.table.columns.address")}</TableHead>
							<TableHead>{t("customers.table.columns.created")}</TableHead>
							<TableHead className="w-[100px]">
								{t("customers.table.columns.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredCustomers.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-muted-foreground py-8"
								>
									{searchQuery !== ""
										? t("customers.noCustomersFound")
										: showArchived
											? t("customers.archived.noArchivedFound")
											: t("customers.noCustomersFound")}
								</TableCell>
							</TableRow>
						) : (
							filteredCustomers.map((customer) => (
								<TableRow key={customer.id}>
									<TableCell>
										<div className="space-y-1">
											<div className="font-medium">{customer.name}</div>
											<div className="flex items-center gap-1">
												<Badge variant="outline" className="text-xs">
													{customer.language === "nl" ? "NL" : "EN"}
												</Badge>
												{customer.isArchived && (
													<Badge variant="secondary" className="text-xs">
														{t("customers.archived.badge")}
													</Badge>
												)}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											{/* Email field - inline editable */}
											{customer.email && (
												<div className="flex items-center gap-1 text-sm">
													<Mail className="h-3 w-3 text-muted-foreground" />
													{editingCustomer?.id === customer.id &&
													editingCustomer.field === "email" ? (
														<div className="flex items-center gap-1 flex-1">
															<Input
																value={editingCustomer.value}
																onChange={(e) => {
																	setEditingCustomer({
																		...editingCustomer,
																		value: e.target.value,
																	});
																}}
																className="h-6 text-xs max-w-[150px]"
																onKeyDown={(e) => {
																	if (e.key === "Enter") saveEdit();
																	if (e.key === "Escape") cancelEdit();
																}}
																autoFocus
															/>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0"
																onClick={saveEdit}
																disabled={updateCustomerMutation.isPending}
															>
																<Check className="h-3 w-3 text-green-600" />
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0"
																onClick={cancelEdit}
															>
																<X className="h-3 w-3 text-red-600" />
															</Button>
														</div>
													) : (
														<div className="flex items-center gap-1 flex-1">
															<a
																href={`mailto:${customer.email}`}
																className="text-blue-600 hover:text-blue-800 underline truncate max-w-[150px]"
																title={`Email ${customer.email}`}
															>
																{customer.email}
															</a>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
																onClick={() => {
																	startEdit(
																		customer.id,
																		"email",
																		customer.email ?? "",
																	);
																}}
																title="Edit email"
															>
																<Edit className="h-3 w-3" />
															</Button>
														</div>
													)}
												</div>
											)}

											{/* Phone field - inline editable */}
											{(() => {
												const isEditingPhone =
													editingCustomer?.id === customer.id &&
													editingCustomer.field === "phone";
												const resolvedPhone =
													customer.primaryPhone ?? customer.phones.at(0) ?? "";
												if (resolvedPhone.length === 0 && !isEditingPhone) {
													return null;
												}

												return (
													<div className="flex items-center gap-1 text-sm">
														<Phone className="h-3 w-3 text-muted-foreground" />
														{isEditingPhone ? (
															<div className="flex items-center gap-1 flex-1">
																<Input
																	value={editingCustomer.value}
																	onChange={(e) => {
																		setEditingCustomer({
																			...editingCustomer,
																			value: e.target.value,
																		});
																	}}
																	className="h-6 text-xs max-w-[150px]"
																	onKeyDown={(e) => {
																		if (e.key === "Enter") saveEdit();
																		if (e.key === "Escape") cancelEdit();
																	}}
																	autoFocus
																/>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-6 w-6 p-0"
																	onClick={saveEdit}
																	disabled={updateCustomerMutation.isPending}
																>
																	<Check className="h-3 w-3 text-green-600" />
																</Button>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-6 w-6 p-0"
																	onClick={cancelEdit}
																>
																	<X className="h-3 w-3 text-red-600" />
																</Button>
															</div>
														) : (
															<div className="flex items-center gap-1 flex-1">
																<a
																	href={`tel:${resolvedPhone}`}
																	className="text-blue-600 hover:text-blue-800 underline"
																	title={`Call ${resolvedPhone}`}
																>
																	{formatPhoneNumber(resolvedPhone)}
																</a>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
																	onClick={() => {
																		startEdit(
																			customer.id,
																			"phone",
																			resolvedPhone,
																		);
																	}}
																	title="Edit phone"
																>
																	<Edit className="h-3 w-3" />
																</Button>
															</div>
														)}
													</div>
												);
											})()}
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											{customer.address && (
												<div className="flex items-center gap-1">
													<div className="text-sm text-muted-foreground max-w-[200px] truncate">
														{customer.address}
													</div>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														onClick={() => {
															void copyAddress(
																customer.address ?? "",
																customer.postalCode,
															);
														}}
														title="Copy address for navigation"
													>
														<Copy className="h-3 w-3" />
													</Button>
												</div>
											)}
											{customer.postalCode && (
												<div className="text-xs text-muted-foreground">
													{customer.postalCode}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="text-sm text-muted-foreground">
											{formatDate(customer.createdAt)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											{customer.isArchived ? (
												// Archived customers: only show unarchive button
												<Button
													variant="ghost"
													size="sm"
													onClick={() => {
														handleUnarchive(customer);
													}}
													disabled={unarchiveCustomerMutation.isPending}
													title={t("customers.unarchive.tooltip")}
												>
													<Archive className="h-3 w-3" />
												</Button>
											) : (
												// Active customers: show edit and delete buttons
												<>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															onEdit(customer);
														}}
													>
														<Edit className="h-3 w-3" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															setDeletingCustomer(customer);
														}}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</>
											)}
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Delete/Archive Confirmation Dialog */}
			<AlertDialog
				open={!!deletingCustomer}
				onOpenChange={(open) => {
					if (!open) setDeletingCustomer(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isLoadingLinkedCounts
								? t("common.loading")
								: hasLinkedData
									? t("customers.delete.archive.title")
									: t("customers.delete.title")}
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="text-muted-foreground text-sm">
								{isLoadingLinkedCounts ? (
									<div className="flex items-center gap-2">
										<div className="text-sm">{t("common.loading")}...</div>
									</div>
								) : hasLinkedData ? (
									<div className="space-y-2">
										<div className="font-medium text-orange-600">
											{t("customers.delete.archive.cannotDelete")}
										</div>
										<div className="text-sm text-muted-foreground">
											<div>{t("customers.delete.archive.linkedData")}</div>
											<ul className="list-disc list-inside ml-2">
												{linkedCounts.jobs > 0 && (
													<li>
														{linkedCounts.jobs}{" "}
														{t("customers.delete.archive.jobs")}
													</li>
												)}
												{linkedCounts.invoices > 0 && (
													<li>
														{linkedCounts.invoices}{" "}
														{t("customers.delete.archive.invoices")}
													</li>
												)}
											</ul>
										</div>
										<div className="text-sm">
											{t("customers.delete.archive.archiveInstead", {
												name: deletingCustomer?.name ?? "",
											})}
										</div>
									</div>
								) : (
									<div>
										{t("customers.delete.description")}
										{deletingCustomer !== null && (
											<span className="font-medium">
												{" "}
												&quot;{deletingCustomer.name}&quot;
											</span>
										)}
									</div>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						{isLoadingLinkedCounts ? (
							<AlertDialogAction disabled>
								{t("common.loading")}
							</AlertDialogAction>
						) : hasLinkedData ? (
							<AlertDialogAction
								onClick={handleArchiveConfirm}
								disabled={archiveCustomerMutation.isPending}
							>
								{archiveCustomerMutation.isPending
									? t("common.loading")
									: "Archiveren"}
							</AlertDialogAction>
						) : (
							<AlertDialogAction
								onClick={handleDeleteConfirm}
								disabled={deleteCustomerMutation.isPending}
							>
								{deleteCustomerMutation.isPending
									? t("actions.deleting")
									: t("actions.delete")}
							</AlertDialogAction>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
