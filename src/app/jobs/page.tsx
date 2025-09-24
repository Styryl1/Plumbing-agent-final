"use client";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import EmployeeChips from "~/components/calendar/EmployeeChips";
import JobDrawer from "~/components/jobs/JobDrawer";
import Unscheduled from "~/components/jobs/Unscheduled";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { getCurrentWeekRange } from "~/lib/dates";
import type { JobStatusUI } from "~/lib/job-status";
import { api } from "~/lib/trpc/client";
import type { JobDTO } from "~/types/job";
import JobsCalendar from "./calendar/Calendar";
import Legend from "./calendar/Legend";
import JobEditorDialog from "./JobEditorDialog";

export default function JobsPage(): JSX.Element {
	// Translation hook
	const t = useTranslations();
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
	const [statusFilter, setStatusFilter] = useState<JobStatusUI | "all">("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createDialogPrefillStart, setCreateDialogPrefillStart] = useState<
		string | null
	>(null);
	const [editingJob, setEditingJob] = useState<JobDTO | undefined>();

	// Job drawer state
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [isJobDrawerOpen, setIsJobDrawerOpen] = useState(false);

	// Fetch jobs for stats only (calendar handles its own query)
	const {
		data: jobs = [],
		isLoading,
		error,
		refetch: refetchJobs,
	} = api.jobs.list.useQuery({
		from: getCurrentWeekRange().start,
		to: getCurrentWeekRange().end,
		employeeIds:
			selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
		status: statusFilter === "all" ? undefined : statusFilter,
	});

	// Fetch employees for filtering and calendar colors
	const { data: employees = [] } = api.employees.list.useQuery({});

	// Calculate stats
	const stats = useMemo(() => {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const today = now.toPlainDate().toString();
		const startOfWeek = now
			.toPlainDate()
			.subtract({ days: now.dayOfWeek - 1 })
			.toString();
		const startOfMonth = now.with({ day: 1 }).toPlainDate().toString();

		const todayJobs = jobs.filter((job) => job.start.startsWith(today));
		const weekJobs = jobs.filter((job) => job.start >= startOfWeek);
		const monthJobs = jobs.filter((job) => job.start >= startOfMonth);

		return {
			todayTotal: todayJobs.length,
			weekTotal: weekJobs.length,
			monthCompleted: monthJobs.filter((job) => job.status === "done").length,
			urgent: jobs.filter(
				(job) =>
					job.status === "planned" &&
					(job.priority === "urgent" || job.priority === "emergency"),
			).length,
		};
	}, [jobs]);

	const handleJobCreated = (): void => {
		void refetchJobs();
	};

	const handleJobDrawerClose = (): void => {
		setIsJobDrawerOpen(false);
		setSelectedJobId(null);
		// Refetch to get latest changes
		void refetchJobs();
	};

	if (error) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<p className="text-lg font-medium text-destructive">
						{t("jobs.error.load")}
					</p>
					<p className="text-sm text-muted-foreground">{error.message}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with filters */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-bold text-foreground">
							{t("jobs.title")}
						</h1>
						<p className="mt-2 text-muted-foreground">
							{t("jobs.description")}
						</p>
					</div>

					<div className="flex items-center gap-4">
						{/* Status filter */}
						<Select
							value={statusFilter}
							onValueChange={(value) => {
								setStatusFilter(value as JobStatusUI | "all");
							}}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Alle statussen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t("jobs.filter.status.all")}
								</SelectItem>
								<SelectItem value="planned">
									{t("common.status.planned")}
								</SelectItem>
								<SelectItem value="in_progress">
									{t("common.status.in_progress")}
								</SelectItem>
								<SelectItem value="done">{t("common.status.done")}</SelectItem>
								<SelectItem value="cancelled">
									{t("common.status.cancelled")}
								</SelectItem>
							</SelectContent>
						</Select>

						<Button
							onClick={() => {
								setCreateDialogPrefillStart(null);
								setIsCreateDialogOpen(true);
							}}
						>
							<Plus className="mr-2 h-4 w-4" />
							{t("actions.cta.newJob")}
						</Button>
					</div>
				</div>

				{/* Employee Filter Chips */}
				<div className="-mx-3 border rounded-lg bg-white/50">
					<EmployeeChips
						employees={employees}
						selectedEmployeeIds={selectedEmployeeIds}
						onSelectionChange={setSelectedEmployeeIds}
					/>
				</div>
			</div>

			{/* Status Overview Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("jobs.stats.today.title")}
							</CardTitle>
							<Badge variant="secondary">{stats.todayTotal}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats.todayTotal}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("jobs.stats.today.desc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("jobs.stats.week.title")}
							</CardTitle>
							<Badge variant="default">{stats.weekTotal}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats.weekTotal}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("jobs.stats.week.desc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("jobs.stats.monthCompleted.title")}
							</CardTitle>
							<Badge variant="outline">{stats.monthCompleted}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats.monthCompleted}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("jobs.stats.monthCompleted.desc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("jobs.stats.emergency.title")}
							</CardTitle>
							<Badge variant="destructive">{stats.urgent}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-destructive">
							{stats.urgent}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("jobs.stats.emergency.desc")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Empty State */}
			{!isLoading && jobs.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("jobs.empty.title")}</CardTitle>
						<CardDescription>{t("jobs.empty.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center text-center py-8">
							<div className="mb-4">
								<div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
									<Plus className="h-6 w-6 text-muted-foreground" />
								</div>
							</div>
							<p className="text-muted-foreground mb-6">
								{t("jobs.empty.description")}
							</p>
							<Button
								onClick={() => {
									setCreateDialogPrefillStart(null);
									setIsCreateDialogOpen(true);
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								{t("actions.cta.newJob")}
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				/* Schedule-X Calendar */
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>{t("jobs.calendar.title")}</CardTitle>
								<CardDescription>{t("jobs.calendar.desc")}</CardDescription>
							</div>
							<Legend employees={employees} />
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{isLoading ? (
							<div className="flex h-96 items-center justify-center">
								<div className="text-center">
									<div className="text-lg font-medium text-muted-foreground">
										Kalender laden...
									</div>
								</div>
							</div>
						) : (
							<JobsCalendar
								onEditJob={(jobId) => {
									setSelectedJobId(jobId);
									setIsJobDrawerOpen(true);
								}}
								onCreateJob={(startISO) => {
									setCreateDialogPrefillStart(startISO);
									setIsCreateDialogOpen(true);
								}}
							/>
						)}
					</CardContent>
				</Card>
			)}

			{/* Create/Edit Dialog */}
			<JobEditorDialog
				open={isCreateDialogOpen}
				onOpenChange={(open) => {
					setIsCreateDialogOpen(open);
					if (!open) {
						setCreateDialogPrefillStart(null);
					}
				}}
				initialStartISO={createDialogPrefillStart}
			/>

			<JobEditorDialog
				open={!!editingJob}
				onOpenChange={(open) => {
					if (!open) setEditingJob(undefined);
				}}
				job={editingJob}
			/>

			{/* Job Drawer */}
			<JobDrawer
				jobId={selectedJobId}
				open={isJobDrawerOpen}
				onOpenChange={(open) => {
					if (!open) handleJobDrawerClose();
				}}
				employees={employees}
				currentUserRole="admin"
				currentEmployeeId={undefined}
			/>

			{/* Unscheduled FAB */}
			<Unscheduled employees={employees} onJobCreated={handleJobCreated} />
		</div>
	);
}
