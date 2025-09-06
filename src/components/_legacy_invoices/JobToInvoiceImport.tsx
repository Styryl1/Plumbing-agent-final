"use client";

import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { Separator } from "~/components/ui/separator";
import { formatMoney } from "~/lib/invoice-format";
import { parseZdt } from "~/lib/time";
import { api } from "~/lib/trpc/client";
import type { JobDTO } from "~/types/job";
import { statusNL } from "~/types/job";

interface JobToInvoiceImportProps {
	initialJobId?: string | undefined;
	onImport: (job: JobDTO) => void;
	onCancel: () => void;
}

export function JobToInvoiceImport({
	initialJobId,
	onImport,
	onCancel,
}: JobToInvoiceImportProps): JSX.Element {
	const tInvoices = useTranslations("invoices");
	const tForm = useTranslations("invoices.import");
	const tJobDetails = useTranslations("invoices.import.jobDetails");
	const tEstimate = useTranslations("invoices.import.estimate");

	const [selectedJobId, setSelectedJobId] = useState<string>(
		initialJobId ?? "",
	);
	const [laborHours, setLaborHours] = useState<number>(1);
	const [hourlyRate, setHourlyRate] = useState<number>(75); // Default €75/hour

	// Get date range for recent jobs (last 30 days)
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	const thirtyDaysAgo = now.subtract({ days: 30 });
	const today = now;

	// Fetch recent completed jobs
	const { data: jobs } = api.jobs.list.useQuery({
		from: thirtyDaysAgo.toString(),
		to: today.toString(),
		status: "done",
	});

	// Fetch employees for display
	const { data: employees } = api.employees.list.useQuery({});

	// Fetch selected job details
	const { data: selectedJob } = api.jobs.byId.useQuery(
		{ id: selectedJobId },
		{ enabled: !!selectedJobId },
	);

	const getEmployeeName = (employeeId: string | null): string => {
		if (!employeeId) return "Niet toegewezen";
		const employee = employees?.find((emp) => emp.id === employeeId);
		return employee?.name ?? "Onbekende medewerker";
	};

	const formatJobDuration = (job: JobDTO): string => {
		if (!job.start || !job.end) return "Onbekend";

		const startDate = parseZdt(job.start);
		const endDate = parseZdt(job.end);
		const duration = startDate.until(endDate, { largestUnit: "hour" });

		return `${Math.abs(duration.total({ unit: "hour" }))} uur`;
	};

	const calculateEstimatedAmount = (): number => {
		return laborHours * hourlyRate * 100; // Convert to cents
	};

	const handleImport = (): void => {
		if (!selectedJob) return;

		// Import the job with the configured labor details
		onImport(selectedJob);
	};

	return (
		<Dialog
			open
			onOpenChange={() => {
				onCancel();
			}}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{tForm("title")}</DialogTitle>
					<DialogDescription>{tForm("description")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Job Selection */}
					<div className="space-y-2">
						<Label htmlFor="job-select">{tForm("selectJob")}</Label>
						<Select value={selectedJobId} onValueChange={setSelectedJobId}>
							<SelectTrigger>
								<SelectValue placeholder={tForm("selectJobPlaceholder")} />
							</SelectTrigger>
							<SelectContent>
								{jobs?.map((job) => (
									<SelectItem key={job.id} value={job.id}>
										<div className="flex items-center gap-2">
											<span className="font-medium">{job.title}</span>
											<span className="text-sm text-muted-foreground">
												- {job.customer?.name}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Job Details */}
					{selectedJob && (
						<Card className="border-l-4 border-l-green-500">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									{selectedJob.title}
									<span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
										{statusNL[selectedJob.status]}
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Customer Info */}
								<div className="flex items-center gap-2">
									<User className="h-4 w-4 text-muted-foreground" />
									<span className="font-medium">
										{selectedJob.customer?.name ?? "Onbekende klant"}
									</span>
								</div>

								{/* Address */}
								{selectedJob.address && (
									<div className="flex items-center gap-2">
										<MapPin className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm">{selectedJob.address}</span>
									</div>
								)}

								{/* Date & Duration */}
								<div className="grid grid-cols-2 gap-4">
									<div className="flex items-center gap-2">
										<CalendarDays className="h-4 w-4 text-muted-foreground" />
										<div>
											<div className="text-sm font-medium">
												{tJobDetails("date")}
											</div>
											<div className="text-sm text-muted-foreground">
												{parseZdt(selectedJob.start)
													.toPlainDate()
													.toLocaleString("nl-NL")}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<div>
											<div className="text-sm font-medium">
												{tJobDetails("duration")}
											</div>
											<div className="text-sm text-muted-foreground">
												{formatJobDuration(selectedJob)}
											</div>
										</div>
									</div>
								</div>

								{/* Employee */}
								<div>
									<div className="text-sm font-medium">
										{tJobDetails("employee")}
									</div>
									<div className="text-sm text-muted-foreground">
										{getEmployeeName(selectedJob.employeeId)}
									</div>
								</div>

								{/* Description */}
								{selectedJob.description && (
									<div>
										<div className="text-sm font-medium">
											{tJobDetails("description")}
										</div>
										<div className="text-sm text-muted-foreground">
											{selectedJob.description}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					<Separator />

					{/* Labor Configuration */}
					<div className="space-y-4">
						<h4 className="font-medium">{tForm("laborConfig")}</h4>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="labor-hours">{tForm("laborHours")}</Label>
								<Input
									id="labor-hours"
									type="number"
									value={laborHours}
									onChange={(e) => {
										setLaborHours(
											Math.max(0.5, parseFloat(e.target.value) || 0.5),
										);
									}}
									step="0.5"
									min="0.5"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="hourly-rate">{tForm("hourlyRate")}</Label>
								<Input
									id="hourly-rate"
									type="number"
									value={hourlyRate}
									onChange={(e) => {
										setHourlyRate(Math.max(1, parseFloat(e.target.value) || 1));
									}}
									step="5"
									min="1"
								/>
							</div>
						</div>

						{/* Estimated Amount */}
						<Card className="bg-blue-50 border-blue-200">
							<CardContent className="pt-4">
								<div className="flex justify-between items-center">
									<span className="font-medium">{tEstimate("title")}</span>
									<span className="text-xl font-bold text-blue-600">
										{formatMoney(calculateEstimatedAmount())}
									</span>
								</div>
								<div className="text-sm text-blue-800 mt-2">
									{tEstimate("calculation", {
										hours: laborHours,
										rate: hourlyRate,
										total: (laborHours * hourlyRate).toFixed(2),
									})}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						{tInvoices("actions.cancel")}
					</Button>
					<Button
						onClick={handleImport}
						disabled={!selectedJobId}
						className="bg-green-600 hover:bg-green-700"
					>
						{tForm("import")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
