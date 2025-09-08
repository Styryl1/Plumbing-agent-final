"use client";

import {
	CalendarIcon,
	Clock,
	Copy,
	Edit,
	Mail,
	Phone,
	Receipt,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect, useState } from "react";
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
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { useT } from "~/i18n/client";
import { formatZDT, getDuration, toZDT } from "~/lib/calendar-temporal";
import { formatPhoneNumber } from "~/lib/phone";
import { api } from "~/lib/trpc/client";
import type { JobStatusUI } from "~/types/job";
import { statusNL } from "~/types/job";

export type JobDrawerProps = {
	jobId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	employees?: { id: string; name: string; color: string | null }[] | undefined;
	currentUserRole: "owner" | "admin" | "staff";
	currentEmployeeId?: string | undefined;
};

export default function JobDrawer({
	jobId,
	open,
	onOpenChange,
	employees = [],
	currentUserRole,
	currentEmployeeId,
}: JobDrawerProps): JSX.Element {
	const router = useRouter();
	const t = useT();
	const tForm = useTranslations("form");
	const tCustomers = useTranslations("customers");
	const tJobs = useTranslations("jobs");
	const tCommon = useTranslations("common");
	const [isEditing, setIsEditing] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	type JobPriority = "normal" | "urgent" | "emergency";

	type JobForm = {
		title: string;
		description?: string;
		priority: JobPriority;
		status: JobStatusUI;
		primaryEmployeeId?: string;
		secondaryEmployeeIds: string[];
		start: string;
		end: string;
		customerId?: string;
	};

	const [formData, setFormData] = useState<JobForm>({
		title: "",
		priority: "normal",
		status: "planned",
		secondaryEmployeeIds: [],
		start: "",
		end: "",
	});

	// Fetch job data
	const { data: job, isLoading } = api.jobs.byId.useQuery(
		{ id: jobId! },
		{
			enabled: !!jobId,
			refetchOnWindowFocus: false,
		},
	);

	// Fetch customer data if job has a customer
	const { data: customer } = api.customers.byId.useQuery(
		{ id: job?.customerId ?? "" },
		{
			enabled: !!job?.customerId,
			refetchOnWindowFocus: false,
		},
	);

	// Fetch all customers for picker when editing
	const { data: customers = [] } = api.customers.list.useQuery(
		{},
		{
			enabled: isEditing,
			refetchOnWindowFocus: false,
		},
	);

	const updateJobMutation = api.jobs.update.useMutation({
		onSuccess: () => {
			toast.success("Klus bijgewerkt");
			setIsEditing(false);
		},
		onError: (error) => {
			const msg = error instanceof Error ? error.message : "Fout bij bijwerken";
			toast.error(msg);
		},
	});

	const updateAssigneesMutation = api.jobs.updateAssignees.useMutation({
		onSuccess: () => {
			toast.success("Toewijzingen bijgewerkt");
		},
		onError: (error) => {
			const msg = error instanceof Error ? error.message : "Fout bij toewijzen";
			toast.error(msg);
		},
	});

	const rescheduleMutation = api.jobs.reschedule.useMutation({
		onSuccess: () => {
			toast.success("Tijd aangepast");
		},
		onError: (error) => {
			const msg =
				error instanceof Error ? error.message : "Fout bij herplannen";
			toast.error(msg);
		},
	});

	const utils = api.useUtils();
	const deleteJobMutation = api.jobs.remove.useMutation({
		onSuccess: () => {
			toast.success(tJobs("delete.success"));
			setShowDeleteConfirm(false);
			onOpenChange(false); // Close drawer after successful delete
			// Invalidate queries to refresh the calendar
			void utils.jobs.list.invalidate();
			void utils.jobs.byId.invalidate();
		},
		onError: (error) => {
			const msg =
				error instanceof Error ? error.message : tJobs("delete.failed");
			toast.error(msg);
		},
	});

	const createDraftMutation = api.invoiceFlow.createDraftFromJob.useMutation({
		onSuccess: (result) => {
			toast.success(t("jobs.invoice.createDraft.success"));
			onOpenChange(false); // Close drawer
			router.push(`/invoices/${result.invoiceId}`);
		},
		onError: (error) => {
			toast.error(t("jobs.invoice.createDraft.error") + ": " + error.message);
		},
	});

	// Load job data into form when job changes
	useEffect(() => {
		if (job) {
			setFormData({
				title: job.title,
				...(job.description && { description: job.description }),
				priority: job.priority,
				status: job.status,
				...(job.employeeId && { primaryEmployeeId: job.employeeId }),
				secondaryEmployeeIds: job.secondaryEmployeeIds,
				start: job.start,
				end: job.end,
				customerId: job.customerId,
			});
		}
	}, [job]);

	const canEdit = (): boolean => {
		if (!job) return false;

		// Role-based permissions
		switch (currentUserRole) {
			case "owner":
			case "admin":
				return true;
			case "staff":
				return (
					job.employeeId === currentEmployeeId &&
					job.secondaryEmployeeIds.length === 0
				);
			default:
				return false;
		}
	};

	const handleSave = async (): Promise<void> => {
		if (!job || !jobId) return;

		try {
			// Update basic job details (title, description, status)
			if (
				formData.title !== job.title ||
				formData.description !== job.description ||
				formData.status !== job.status
			) {
				await updateJobMutation.mutateAsync({
					id: jobId,
					patch: {
						title: formData.title,
						description: formData.description,
						status: formData.status,
					},
				});
			}

			// Update time if changed (reschedule)
			if (formData.start !== job.start || formData.end !== job.end) {
				await rescheduleMutation.mutateAsync({
					jobId,
					starts_at: formData.start,
					ends_at: formData.end,
				});
			}

			// Update assignees if changed
			if (
				formData.primaryEmployeeId !== job.employeeId ||
				JSON.stringify(formData.secondaryEmployeeIds.sort()) !==
					JSON.stringify(job.secondaryEmployeeIds.sort())
			) {
				await updateAssigneesMutation.mutateAsync({
					jobId,
					primaryEmployeeId:
						formData.primaryEmployeeId === ""
							? undefined
							: formData.primaryEmployeeId,
					secondaryEmployeeIds: formData.secondaryEmployeeIds,
				});
			}

			// TODO: Handle customer change when customer update endpoint is available
			// Currently job.update doesn't include customer_id in patch
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("Error updating job:", message);
		}
	};

	const formatDateTime = (isoString: string): string => {
		const zdt = toZDT(isoString);
		return formatZDT(zdt, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getDurationMinutes = (start: string, end: string): number => {
		const startZDT = toZDT(start);
		const endZDT = toZDT(end);
		const duration = getDuration(startZDT, endZDT);
		return duration.total({ unit: "minutes" });
	};

	const getPriorityColor = (
		p: JobPriority,
	): "destructive" | "default" | "secondary" => {
		return p === "emergency"
			? "destructive"
			: p === "urgent"
				? "default"
				: "secondary";
	};

	const getPriorityLabel = (p: JobPriority): string => {
		return p === "emergency" ? "Spoed" : p === "urgent" ? "Urgent" : "Normaal";
	};

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

	// Helper to convert ISO string to datetime-local format
	const toDateTimeLocal = (isoString: string): string => {
		if (!isoString) return "";
		try {
			const zdt = toZDT(isoString);
			// Format as YYYY-MM-DDTHH:MM for datetime-local input
			return zdt.toPlainDateTime().toString().slice(0, 16);
		} catch {
			return "";
		}
	};

	// Helper to convert datetime-local format back to ISO
	const fromDateTimeLocal = (localString: string): string => {
		if (!localString) return "";
		try {
			// datetime-local gives us YYYY-MM-DDTHH:MM, add seconds and timezone
			const dt = Temporal.PlainDateTime.from(`${localString}:00`);
			const zdt = dt.toZonedDateTime("Europe/Amsterdam");
			return zdt.toInstant().toString();
		} catch {
			return "";
		}
	};

	if (!jobId) return <div />;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md overflow-y-auto max-h-screen"
				data-testid="job-drawer"
			>
				<SheetHeader>
					<SheetTitle className="flex items-center justify-between">
						<span>{t("jobs.details")}</span>
						{canEdit() && !isEditing && (
							<div className="flex gap-2">
								<Button
									onClick={() => {
										if (job) {
											// Populate form with current job data
											setFormData({
												title: job.title,
												description: job.description || "",
												priority: job.priority,
												status: job.status,
												primaryEmployeeId: job.employeeId ?? "",
												secondaryEmployeeIds: job.secondaryEmployeeIds,
												start: job.start,
												end: job.end,
												customerId: job.customerId || "",
											});
										}
										setIsEditing(true);
									}}
									variant="outline"
									size="sm"
								>
									<Edit className="h-4 w-4 mr-1" />
									{t("action.edit")}
								</Button>

								{/* Generate Invoice Button - only for completed jobs with customers */}
								{job && job.status === "done" && job.customerId && (
									<Button
										onClick={async () => {
											try {
												const result = await createDraftMutation.mutateAsync({
													jobId: job.id,
												});
												toast.success(t("jobs.invoice.createDraft.success"));
												router.push(`/invoices/${result.invoiceId}`);
											} catch (error) {
												console.error("Failed to create draft:", error);
											}
										}}
										variant="default"
										size="sm"
										className="bg-green-600 hover:bg-green-700"
										disabled={createDraftMutation.isPending}
									>
										<Receipt className="h-4 w-4 mr-1" />
										{createDraftMutation.isPending
											? t("actions.creating")
											: t("jobs.invoice.createDraft.label")}
									</Button>
								)}

								<Button
									onClick={() => {
										setShowDeleteConfirm(true);
									}}
									variant="destructive"
									size="sm"
								>
									<Trash2 className="h-4 w-4 mr-1" />
									{t("action.delete")}
								</Button>
							</div>
						)}
					</SheetTitle>
				</SheetHeader>

				{isLoading && (
					<div className="flex items-center justify-center h-32">
						<div className="text-sm text-gray-500">Laden...</div>
					</div>
				)}

				{job && (
					<div className="space-y-6 py-4">
						{/* Job Info Section */}
						<div className="space-y-4">
							{isEditing ? (
								<>
									<div>
										<Label htmlFor="edit-title" className="text-sm font-medium">
											{t("form.title")} *
										</Label>
										<Input
											id="edit-title"
											value={formData.title}
											onChange={(e) => {
												setFormData((prev) => ({
													...prev,
													title: e.target.value,
												}));
											}}
											className="mt-1"
										/>
									</div>

									<div>
										<Label
											htmlFor="edit-description"
											className="text-sm font-medium"
										>
											{t("field.description")}
										</Label>
										<Textarea
											id="edit-description"
											value={formData.description}
											onChange={(e) => {
												setFormData((prev) => ({
													...prev,
													description: e.target.value,
												}));
											}}
											className="mt-1"
											rows={3}
										/>
									</div>

									<div>
										<Label
											htmlFor="edit-priority"
											className="text-sm font-medium"
										>
											{t("field.priority")}
										</Label>
										<Select
											value={formData.priority}
											onValueChange={(value: JobPriority) => {
												setFormData((prev) => ({ ...prev, priority: value }));
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="normal">
													{t("priority.normal")}
												</SelectItem>
												<SelectItem value="urgent">
													{t("priority.urgent")}
												</SelectItem>
												<SelectItem value="emergency">
													{t("priority.emergency")}
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label
											htmlFor="edit-status"
											className="text-sm font-medium"
										>
											{t("field.status")}
										</Label>
										<Select
											value={formData.status}
											onValueChange={(value: JobStatusUI) => {
												setFormData((prev) => ({ ...prev, status: value }));
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="planned">
													{statusNL.planned}
												</SelectItem>
												<SelectItem value="in_progress">
													{statusNL.in_progress}
												</SelectItem>
												<SelectItem value="done">{statusNL.done}</SelectItem>
												<SelectItem value="cancelled">
													{statusNL.cancelled}
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Time editing section */}
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label
												htmlFor="edit-start"
												className="text-sm font-medium"
											>
												{tForm("startTime")}
											</Label>
											<Input
												id="edit-start"
												type="datetime-local"
												value={toDateTimeLocal(formData.start)}
												onChange={(e) => {
													setFormData((prev) => ({
														...prev,
														start: fromDateTimeLocal(e.target.value),
													}));
												}}
												className="mt-1"
											/>
										</div>
										<div>
											<Label htmlFor="edit-end" className="text-sm font-medium">
												{tForm("endTime")}
											</Label>
											<Input
												id="edit-end"
												type="datetime-local"
												value={toDateTimeLocal(formData.end)}
												onChange={(e) => {
													setFormData((prev) => ({
														...prev,
														end: fromDateTimeLocal(e.target.value),
													}));
												}}
												className="mt-1"
											/>
										</div>
									</div>

									{/* Customer selection */}
									<div>
										<Label
											htmlFor="edit-customer"
											className="text-sm font-medium"
										>
											{tForm("customer")}
										</Label>
										<Select
											value={formData.customerId ?? ""}
											onValueChange={(value) => {
												setFormData((prev) => ({
													...prev,
													customerId: value,
												}));
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue placeholder="Selecteer klant" />
											</SelectTrigger>
											<SelectContent>
												{customers.map((cust) => (
													<SelectItem key={cust.id} value={cust.id}>
														{cust.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Status selection */}
									<div>
										<Label
											htmlFor="edit-status"
											className="text-sm font-medium"
										>
											{t("field.status")}{" "}
											<span aria-hidden="true">{t("form.requiredSymbol")}</span>
										</Label>
										<Select
											value={formData.status}
											onValueChange={(value) => {
												setFormData((prev) => ({
													...prev,
													status: value as JobStatusUI,
												}));
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue placeholder="Selecteer status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="planned">
													{statusNL.planned}
												</SelectItem>
												<SelectItem value="in_progress">
													{statusNL.in_progress}
												</SelectItem>
												<SelectItem value="done">{statusNL.done}</SelectItem>
												<SelectItem value="cancelled">
													{statusNL.cancelled}
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</>
							) : (
								<>
									<div>
										<h2 className="text-lg font-semibold">{job.title}</h2>
										<div className="flex items-center gap-2 mt-1">
											<Badge variant={getPriorityColor(job.priority)}>
												{getPriorityLabel(job.priority)}
											</Badge>
											<Badge variant="outline">{job.status}</Badge>
										</div>
									</div>

									{job.description && (
										<div>
											<h3 className="text-sm font-medium text-gray-700 mb-1">
												{t("field.description")}
											</h3>
											<p className="text-sm text-gray-600">{job.description}</p>
										</div>
									)}
								</>
							)}
						</div>

						<Separator />

						{/* Time & Duration */}
						<div className="space-y-3">
							<h3 className="text-sm font-medium text-gray-700">
								{t("jobs.calendar.title")}
							</h3>
							<div className="space-y-2 text-sm">
								{job.start && (
									<div className="flex items-center gap-2">
										<CalendarIcon className="h-4 w-4 text-gray-400" />
										<span>
											{t("field.start")}: {formatDateTime(job.start)}
										</span>
									</div>
								)}
								{job.end && job.start && (
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-gray-400" />
										<span>
											{t("label.durationMinutes", {
												minutes: getDurationMinutes(job.start, job.end),
											})}
										</span>
									</div>
								)}
							</div>
						</div>

						<Separator />

						{/* Customer Section */}
						{customer && (
							<>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-medium text-gray-700">
											{t("field.customer")}
										</h3>
										{job.customer?.isArchived && (
											<Badge variant="secondary" className="text-xs">
												{tCustomers("archived.badge")}
											</Badge>
										)}
									</div>
									<div className="space-y-2">
										<div className="text-sm">
											<span className="font-medium">{customer.name}</span>
										</div>
										{customer.email && (
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<Mail className="h-3 w-3" />
												<a
													href={`mailto:${customer.email}`}
													className="text-blue-600 hover:text-blue-800 underline"
													title={`Email ${customer.email}`}
												>
													{customer.email}
												</a>
											</div>
										)}
										{customer.phone && (
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<Phone className="h-3 w-3" />
												<a
													href={`tel:${customer.phone}`}
													className="text-blue-600 hover:text-blue-800 underline"
													title={`Call ${customer.phone}`}
												>
													{formatPhoneNumber(customer.phone)}
												</a>
											</div>
										)}
										{customer.address && (
											<div className="flex items-center justify-between text-sm text-gray-600">
												<div>
													<span>{customer.address}</span>
													{customer.postalCode && (
														<span className="ml-1">
															({customer.postalCode})
														</span>
													)}
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => {
														void copyAddress(
															customer.address!,
															customer.postalCode,
														);
													}}
													className="h-6 w-6 p-0"
													title="Copy address for navigation"
												>
													<Copy className="h-3 w-3" />
												</Button>
											</div>
										)}
									</div>
								</div>

								<Separator />
							</>
						)}

						{/* Assignees Section */}
						<div className="space-y-3">
							<h3 className="text-sm font-medium text-gray-700">
								<Users className="h-4 w-4 inline mr-1" />
								{t("jobs.assignments.title")}
							</h3>

							{isEditing ? (
								<>
									<div>
										<Label
											htmlFor="edit-primary"
											className="text-sm font-medium"
										>
											{t("field.primaryEmployee")}
										</Label>
										<Select
											value={formData.primaryEmployeeId ?? ""}
											onValueChange={(value) => {
												setFormData((prev) => ({
													...prev,
													primaryEmployeeId: value,
												}));
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue placeholder="Selecteer monteur" />
											</SelectTrigger>
											<SelectContent>
												{employees.map((emp) => (
													<SelectItem key={emp.id} value={emp.id}>
														{emp.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* TODO: Add multi-select for secondary employees */}
									<div>
										<Label className="text-sm font-medium text-gray-500">
											{t("field.secondaryEmployees")}
										</Label>
									</div>
								</>
							) : (
								<div className="space-y-2">
									{job.employeeId ? (
										<div className="text-sm">
											<span className="font-medium">
												{t("field.primaryEmployee")}:{" "}
											</span>
											{employees.find((e) => e.id === job.employeeId)?.name ??
												"Onbekend"}
										</div>
									) : null}
									{job.secondaryEmployeeIds.length > 0 ? (
										<div className="text-sm">
											<span className="font-medium">
												{t("field.secondaryEmployees")}:{" "}
											</span>
											{job.secondaryEmployeeIds
												.map(
													(id) =>
														employees.find((e) => e.id === id)?.name ??
														"Onbekend",
												)
												.join(", ")}
										</div>
									) : null}
								</div>
							)}
						</div>

						{/* Action Buttons */}
						<div className="space-y-3 pt-4">
							{isEditing ? (
								<div className="flex gap-3">
									<Button
										onClick={() => {
											setIsEditing(false);
										}}
										variant="outline"
										className="flex-1"
										disabled={
											updateJobMutation.isPending ||
											updateAssigneesMutation.isPending ||
											rescheduleMutation.isPending
										}
									>
										{t("actions.cancel")}
									</Button>
									<Button
										onClick={handleSave}
										className="flex-1"
										disabled={
											updateJobMutation.isPending ||
											updateAssigneesMutation.isPending ||
											rescheduleMutation.isPending
										}
									>
										{updateJobMutation.isPending ||
										updateAssigneesMutation.isPending ||
										rescheduleMutation.isPending
											? "Bezig..."
											: "Opslaan"}
									</Button>
								</div>
							) : (
								job.status === "done" && (
									<Button
										className="w-full"
										size="lg"
										onClick={() => {
											createDraftMutation.mutate({ jobId: job.id });
										}}
										disabled={createDraftMutation.isPending}
									>
										<Receipt className="h-4 w-4 mr-2" />
										{createDraftMutation.isPending
											? t("jobs.invoice.createDraft.creating")
											: t("jobs.invoice.createDraft.label")}
									</Button>
								)
							)}
						</div>
					</div>
				)}
			</SheetContent>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{tJobs("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{tJobs("delete.description")}
							{job && (
								<span className="font-medium"> &quot;{job.title}&quot;</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (jobId) {
									deleteJobMutation.mutate({ id: jobId });
								}
							}}
							disabled={deleteJobMutation.isPending}
						>
							{deleteJobMutation.isPending
								? tCommon("deleting")
								: t("action.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sheet>
	);
}
