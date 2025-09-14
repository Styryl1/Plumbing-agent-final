// src/lib/calendar-adapters.ts
import type { CalendarEventExternal } from "@schedule-x/calendar";
import { useTranslations } from "next-intl";
import type { Tables } from "~/types/supabase";
import { toZDT } from "./calendar-temporal";

type JobRow = Tables<"jobs">;

// Calendar constants
const UNASSIGNED_CALENDAR_ID = "unassigned" as const;

// Extended job type with assignees for multi-assignee support
export interface JobWithAssignees extends JobRow {
	assignees?: Array<{
		employee_id: string;
		is_primary: boolean;
		employee_name?: string;
		employee_color?: string;
	}>;
}

/**
 * Single-assignee job to calendar event (back-compat)
 */
export function jobToEvent(job: JobRow): CalendarEventExternal {
	const start = job.starts_at ? toZDT(job.starts_at) : undefined;
	const end = job.ends_at
		? toZDT(job.ends_at)
		: start
			? start.add({ hours: 1 }) // fallback duration
			: undefined;

	if (!start || !end) {
		// Skip malformed rows or handle separately
		throw new Error(`Job ${job.id} missing starts_at/ends_at`);
	}

	return {
		id: job.id,
		title: job.title,
		start,
		end,
		calendarId: job.employee_id ?? "unassigned",
	};
}

/**
 * Multi-assignee job to multiple calendar events (one per assignee)
 * Event ID format: ${jobId}__${employeeId} for proper drag/drop handling
 */
export function jobWithAssigneesToEvents(
	job: JobWithAssignees,
): CalendarEventExternal[] {
	const start = job.starts_at ? toZDT(job.starts_at) : undefined;
	const end = job.ends_at
		? toZDT(job.ends_at)
		: start
			? start.add({ hours: 1 }) // fallback duration
			: undefined;

	if (!start || !end) {
		throw new Error(`Job ${job.id} missing starts_at/ends_at`);
	}

	// If no assignees, create single unassigned event (fallback)
	if (!job.assignees || job.assignees.length === 0) {
		return [
			{
				id: `${job.id}__unassigned`,
				title: job.title,
				start,
				end,
				calendarId: UNASSIGNED_CALENDAR_ID,
			},
		];
	}

	// Create one event per assignee
	return job.assignees.map((assignee) => ({
		id: `${job.id}__${assignee.employee_id}`,
		title: job.title,
		start,
		end,
		calendarId: assignee.employee_id,
		// Custom properties for styling/identification
		_isPrimary: assignee.is_primary,
		_employeeName: assignee.employee_name,
		_employeeColor: assignee.employee_color,
	}));
}

/**
 * Helper to extract job ID from multi-assignee event ID
 * Handles both formats: "jobId" and "jobId__employeeId"
 */
export function extractJobId(eventId: string): string {
	return eventId.split("__")[0] ?? eventId;
}

/**
 * Helper to extract employee ID from multi-assignee event ID
 * Returns undefined for single-assignee events
 */
export function extractEmployeeId(eventId: string): string | undefined {
	const parts = eventId.split("__");
	return parts.length > 1 ? parts[1] : undefined;
}
