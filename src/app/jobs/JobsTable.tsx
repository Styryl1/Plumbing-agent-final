"use client";

import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatDutchDate, formatDutchTime } from "~/lib/dates";
import { api } from "~/lib/trpc/client";
import type { JobDTO } from "~/types/job";
import { statusNL, statusVariants } from "~/types/job";

interface JobsTableProps {
	readonly jobs: JobDTO[];
	readonly onEdit?: (job: JobDTO) => void;
}

export default function JobsTable({
	jobs,
	onEdit,
}: JobsTableProps): JSX.Element {
	const [jobToDelete, setJobToDelete] = useState<string | null>(null);
	const utils = api.useUtils();
	// Translation hook
	const t = useTranslations();

	// Delete job mutation
	const deleteMutation = api.jobs.remove.useMutation({
		onSuccess: () => {
			// Job was successfully deleted
			setJobToDelete(null);
			toast.success(t("jobs.delete.success"));
			// Invalidate queries to refresh the UI
			void utils.invalidate();
		},
		onError: () => {
			toast.error(t("jobs.delete.failed"));
		},
	});

	const handleDelete = async (jobId: string): Promise<void> => {
		try {
			await deleteMutation.mutateAsync({ id: jobId });
		} catch (error) {
			// Error handling is done in mutation callbacks
			console.error("Failed to delete job:", error);
		}
	};

	return (
		<>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("ui.table.title")}</TableHead>
							<TableHead>{t("ui.table.date")}</TableHead>
							<TableHead>{t("ui.table.time")}</TableHead>
							<TableHead>{t("ui.form.address")}</TableHead>
							<TableHead>{t("ui.table.status")}</TableHead>
							<TableHead className="w-[70px]">
								{t("ui.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{jobs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="h-24 text-center text-muted-foreground"
								>
									{t("ui.table.noJobs")}
								</TableCell>
							</TableRow>
						) : (
							jobs.map((job) => (
								<TableRow key={job.id}>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											<span>{job.title}</span>
											{job.customer?.isArchived && (
												<Badge variant="secondary" className="text-xs">
													{t("customers.archived.badge")}
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell>{formatDutchDate(job.start)}</TableCell>
									<TableCell>
										{formatDutchTime(job.start)} - {formatDutchTime(job.end)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{job.address ?? "-"}
									</TableCell>
									<TableCell>
										<Badge variant={statusVariants[job.status]}>
											{statusNL[job.status]}
										</Badge>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													<MoreHorizontal className="h-4 w-4" />
													<span className="sr-only">
														{t("actions.openActions")}
													</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => onEdit?.(job)}>
													<Edit className="mr-2 h-4 w-4" />
													{t("actions.edit")}
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => {
														setJobToDelete(job.id);
													}}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													{t("actions.delete")}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<AlertDialog
				open={!!jobToDelete}
				onOpenChange={() => {
					setJobToDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("jobs.job.deleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("jobs.job.deleteDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (jobToDelete) {
									void handleDelete(jobToDelete);
								}
							}}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending
								? t("actions.deleting")
								: t("actions.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
