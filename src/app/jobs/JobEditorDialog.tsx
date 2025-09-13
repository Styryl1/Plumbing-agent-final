"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { CustomerPicker } from "~/components/ui/customer-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useAutoFillAddress } from "~/hooks/useAutoFillAddress";
import {
	dateToPlainDate,
	formatZDT,
	toISO,
	toZDT,
	zdtFromPlainDateAndTime,
} from "~/lib/calendar-temporal";
import { plainDateToDate } from "~/lib/date-bridge";
import { E } from "~/lib/i18n/errors";
import { api } from "~/lib/trpc/client";
import type { JobDTO } from "~/types/job";
import { statusNL } from "~/types/job";

// Dutch postal code validation
const NL_POSTCODE = /^\d{4}\s?[A-Za-z]{2}$/;

// Helper function to create error message with i18n key
function zMsg(key: string): { message: string } {
	return { message: key };
}

const jobFormSchema = z.object({
	title: z.string().min(1, zMsg(E.titleRequired)),
	startDate: z.date(),
	startTime: z
		.string()
		.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Ongeldige tijd (HH:MM)"),
	endDate: z.date(),
	endTime: z
		.string()
		.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Ongeldige tijd (HH:MM)"),
	employeeId: z.uuid().optional(),
	customerId: z.uuid({ message: "Klant is verplicht" }),
	// Structured address matching server schema
	address: z.object({
		postalCode: z.string().regex(NL_POSTCODE, zMsg(E.postalInvalid)),
		houseNumber: z
			.union([z.string(), z.number()])
			.refine((v) => String(v).trim() !== "", zMsg(E.houseNumberRequired)),
		addition: z.string().optional(),
		street: z.string().optional(),
		city: z.string().optional(),
	}),
	status: z.enum(["planned", "in_progress", "done", "cancelled"]),
	notes: z.string().optional(),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface JobEditorDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly job?: JobDTO | undefined; // undefined for create, defined for edit
}

export default function JobEditorDialog({
	open,
	onOpenChange,
	job,
}: JobEditorDialogProps): JSX.Element {
	const isEdit = !!job;
	const utils = api.useUtils();
	// Translation hook - root hook with full paths
	const t = useTranslations();

	// Fetch employees
	const { data: employees = [] } = api.employees.list.useQuery({});

	const form = useForm<JobFormData>({
		resolver: zodResolver(jobFormSchema),
		defaultValues: {
			title: "",
			startTime: "09:00",
			endTime: "10:00",
			employeeId: undefined,
			address: {
				postalCode: "",
				houseNumber: "",
				addition: "",
				street: "",
				city: "",
			},
			status: "planned",
			notes: "",
		},
	});

	// Auto-fill address hook
	const { isLooking } = useAutoFillAddress(form, {
		postalCode: "address.postalCode",
		houseNumber: "address.houseNumber",
		street: "address.street",
		city: "address.city",
	});

	// Watch for customer selection to auto-fill address
	const selectedCustomerId = form.watch("customerId");
	const { data: selectedCustomer } = api.customers.byId.useQuery(
		{ id: selectedCustomerId },
		// The selectedCustomerId is guaranteed to exist when enabled condition is true
		{
			enabled: Boolean(selectedCustomerId),
			refetchOnWindowFocus: false,
		},
	);

	// Auto-fill address from selected customer
	useEffect(() => {
		if (selectedCustomer) {
			// Only auto-fill if address fields are empty (to not override manual edits)
			const currentAddress = form.getValues("address");
			if (currentAddress.postalCode === "" && selectedCustomer.postalCode) {
				form.setValue("address.postalCode", selectedCustomer.postalCode);
			}
			if (
				String(currentAddress.houseNumber).trim() === "" &&
				selectedCustomer.houseNumber
			) {
				form.setValue("address.houseNumber", selectedCustomer.houseNumber);
			}
			if (currentAddress.street === "" && selectedCustomer.street) {
				form.setValue("address.street", selectedCustomer.street);
			}
			if (!currentAddress.city && selectedCustomer.city) {
				form.setValue("address.city", selectedCustomer.city);
			}
		}
	}, [selectedCustomer, form]);

	const createMutation = api.jobs.create.useMutation({
		onSuccess: () => {
			toast.success(t("jobs.create.success"));
			void utils.jobs.list.invalidate();
			onOpenChange(false);
			form.reset();
		},
		onError: () => {
			toast.error(t("jobs.create.failed"));
		},
	});

	const updateMutation = api.jobs.update.useMutation({
		onSuccess: () => {
			toast.success(t("jobs.update.success"));
			void utils.jobs.list.invalidate();
			onOpenChange(false);
			form.reset();
		},
		onError: () => {
			toast.error(t("jobs.update.failed"));
		},
	});

	// Populate form when editing
	useEffect(() => {
		if (job && open) {
			const startZDT = toZDT(job.start);
			const endZDT = toZDT(job.end);

			const startDate = plainDateToDate(startZDT.toPlainDate());
			const endDate = plainDateToDate(endZDT.toPlainDate());

			// Handle legacy string address by parsing or defaulting to empty structure
			const addressObj = job.address
				? {
						postalCode: "",
						houseNumber: "",
						addition: "",
						street: job.address, // Put existing string address in street for now
						city: "",
					}
				: {
						postalCode: "",
						houseNumber: "",
						addition: "",
						street: "",
						city: "",
					};

			form.reset({
				title: job.title,
				startDate,
				startTime: formatZDT(startZDT, {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				}),
				endDate,
				endTime: formatZDT(endZDT, {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				}),
				employeeId: job.employeeId ?? undefined,
				customerId: job.customerId ?? "",
				address: addressObj,
				status: job.status,
				notes: job.notes ?? "",
			});
		} else if (!isEdit && open) {
			// Reset form for create - use current time + 1 hour
			const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
			const startTime = now.add({ hours: 1 }).round({
				smallestUnit: "minute",
				roundingIncrement: 15,
				roundingMode: "ceil",
			});
			const endTime = startTime.add({ hours: 1 });

			form.reset({
				title: "",
				startDate: plainDateToDate(startTime.toPlainDate()),
				startTime: formatZDT(startTime, { hour: "2-digit", minute: "2-digit" }),
				endDate: plainDateToDate(endTime.toPlainDate()),
				endTime: formatZDT(endTime, { hour: "2-digit", minute: "2-digit" }),
				employeeId: undefined,
				customerId: "",
				address: {
					postalCode: "",
					houseNumber: "",
					addition: "",
					street: "",
					city: "",
				},
				status: "planned",
				notes: "",
			});
		}
	}, [job, open, isEdit, form]);

	const onSubmit = async (data: JobFormData): Promise<void> => {
		try {
			// Combine date and time using Temporal
			const startPlainDate = dateToPlainDate(data.startDate);
			const startZDT = zdtFromPlainDateAndTime(startPlainDate, {
				hour: Number(data.startTime.slice(0, 2)),
				minute: Number(data.startTime.slice(3, 5)),
			});

			const endPlainDate = dateToPlainDate(data.endDate);
			const endZDT = zdtFromPlainDateAndTime(endPlainDate, {
				hour: Number(data.endTime.slice(0, 2)),
				minute: Number(data.endTime.slice(3, 5)),
			});

			// Check if scheduling in the past
			const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
			if (Temporal.ZonedDateTime.compare(startZDT, now) < 0) {
				const confirmed = window.confirm(
					"Je plant deze klus in het verleden. Weet je zeker dat je door wilt gaan?",
				);
				if (!confirmed) {
					return;
				}
			}

			// Convert to UTC ISO strings for database storage
			const startUTC = toISO(startZDT);
			const endUTC = toISO(endZDT);

			if (job) {
				// For updates, convert structured address back to string format temporarily
				// TODO: Update JobDTO and update mutation to accept structured address
				const addressString =
					data.address.street ??
					`${data.address.postalCode} ${data.address.houseNumber}${data.address.addition ?? ""}, ${data.address.city}`.trim();

				await updateMutation.mutateAsync({
					id: job.id,
					patch: {
						title: data.title,
						start: startUTC,
						end: endUTC,
						employeeId: data.employeeId ?? undefined,
						address: addressString.length > 0 ? addressString : undefined,
						status: data.status,
					},
				});
			} else {
				await createMutation.mutateAsync({
					title: data.title,
					start: startUTC,
					end: endUTC,
					customerId: data.customerId,
					address: data.address,
					...(data.employeeId && { employeeId: data.employeeId }),
					status: data.status,
				});
			}
		} catch (error) {
			// Error handling is done in mutation callbacks
			console.error("Failed to save job:", error);
		}
	};

	// Boolean logic: checking if either mutation is pending
	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? t("jobs.job.editJob") : t("jobs.job.newJob")}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? t("jobs.job.editDescription")
							: t("jobs.job.createDescription")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col flex-1 overflow-hidden"
					>
						<div className="flex-1 overflow-y-auto space-y-4 pr-2">
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("ui.form.title")} {t("ui.form.required")}
										</FormLabel>
										<FormControl>
											<Input placeholder="Lekkage repareren..." {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="startDate"
									render={({ field }) => (
										<FormItem className="flex flex-col">
											<FormLabel>
												{t("ui.form.startDate")} {t("ui.form.required")}
											</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant="outline"
															className="w-full pl-3 text-left font-normal"
														>
															{format(field.value, "PPP", { locale: nl })}
															<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={field.onChange}
														disabled={(date) =>
															date < new globalThis.Date("1900-01-01")
														}
														autoFocus
													/>
												</PopoverContent>
											</Popover>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="startTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("ui.form.startTime")} {t("ui.form.required")}
											</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="endDate"
									render={({ field }) => (
										<FormItem className="flex flex-col">
											<FormLabel>
												{t("ui.form.endDate")} {t("ui.form.required")}
											</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant="outline"
															className="w-full pl-3 text-left font-normal"
														>
															{format(field.value, "PPP", { locale: nl })}
															<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={field.onChange}
														disabled={(date) =>
															date < new globalThis.Date("1900-01-01")
														}
														autoFocus
													/>
												</PopoverContent>
											</Popover>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="endTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("ui.form.endTime")} {t("ui.form.required")}
											</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Employee Selection */}
							<FormField
								control={form.control}
								name="employeeId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ui.form.employee")}</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value ?? ""}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Kies medewerker (optioneel)" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">
													{t("ui.form.noEmployee")}
												</SelectItem>
												{employees.map((employee) => (
													<SelectItem key={employee.id} value={employee.id}>
														{employee.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Customer Selection */}
							<FormField
								control={form.control}
								name="customerId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ui.form.customer")}</FormLabel>
										<FormControl>
											<CustomerPicker
												value={field.value}
												onChange={(value) => {
													field.onChange(value ?? undefined);
												}}
												placeholder={t("customers.selectCustomer")}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Address fields */}
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="address.postalCode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("customers.form.postalCode.label")}{" "}
													{t("ui.form.required")}
												</FormLabel>
												<FormControl>
													<Input
														placeholder={t(
															"customers.form.postalCode.placeholder",
														)}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="address.houseNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("customers.form.houseNumber.label")}{" "}
													{t("ui.form.required")}
												</FormLabel>
												<FormControl>
													<Input
														placeholder={t(
															"customers.form.houseNumber.placeholder",
														)}
														{...field}
														value={String(field.value)}
														onChange={(e) => {
															field.onChange(e.target.value);
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="address.addition"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Toevoeging</FormLabel>
											<FormControl>
												<Input placeholder="A, B, bis" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="address.street"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("customers.form.street.label")}
												</FormLabel>
												<FormControl>
													<Input
														placeholder={t("customers.form.street.placeholder")}
														{...field}
														disabled={isLooking}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="address.city"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("customers.form.city.label")}</FormLabel>
												<FormControl>
													<Input
														placeholder={t("customers.form.city.placeholder")}
														{...field}
														disabled={isLooking}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								{isLooking && (
									<div className="text-sm text-muted-foreground">
										{t("customers.form.address.autoFill.title")}...
									</div>
								)}
							</div>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ui.form.status")}</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Kies status" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{Object.entries(statusNL).map(([value, label]) => (
													<SelectItem key={value} value={value}>
														{label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("ui.form.notes")}</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Extra informatie over de klus..."
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter className="flex-shrink-0 pt-4 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									onOpenChange(false);
								}}
								disabled={isPending}
							>
								{t("actions.cancel")}
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending
									? t("actions.saving")
									: isEdit
										? t("actions.update")
										: t("actions.create")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
