import type { JobStatusUI } from "~/lib/job-status";

export type JobPriority = "normal" | "urgent" | "emergency";
export type { JobStatusUI };

export interface JobDTO {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	// ISO strings in UTC (adapter supplies ZonedDateTime to calendar)
	readonly start: string; // derived from DB starts_at
	readonly end: string; // derived from DB ends_at
	readonly employeeId?: string | null;
	readonly secondaryEmployeeIds: string[];
	readonly status: JobStatusUI;
	readonly priority: JobPriority;
	readonly address?: string;
	readonly customerId?: string;
	readonly notes?: string;
	// Customer information for UI display (joined from customers table)
	readonly customer?: {
		readonly id: string;
		readonly name: string;
		readonly isArchived: boolean;
	} | null;
	// optional legacy/back-compat fields
	readonly starts_at?: string;
	readonly ends_at?: string;
}

// UI status translations and styling
export const statusNL: Record<JobStatusUI, string> = {
	planned: "Ingepland",
	in_progress: "Bezig",
	done: "Voltooid",
	cancelled: "Geannuleerd",
} as const;

export const statusColors: Record<JobStatusUI, string> = {
	planned: "bg-blue-500",
	in_progress: "bg-yellow-500",
	done: "bg-green-500",
	cancelled: "bg-gray-500",
} as const;

export const statusVariants: Record<
	JobStatusUI,
	"default" | "secondary" | "destructive" | "outline"
> = {
	planned: "secondary",
	in_progress: "default",
	done: "outline",
	cancelled: "destructive",
} as const;

// View model used by the calendar (not the API)
export interface CalendarEventVM {
	readonly id: string; // `${jobId}__${employeeId}`
	readonly title: string;
	readonly start: Temporal.ZonedDateTime;
	readonly end: Temporal.ZonedDateTime;
	readonly calendarId: string; // employeeId
}
