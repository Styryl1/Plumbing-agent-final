import { useTranslations } from "next-intl";
// Calendar adapter for JobDTO → Schedule-X v3 events

import { toZDT } from "~/lib/calendar-temporal";
import type { JobDTO } from "~/types/job";

export interface SxEvent {
	id: string;
	title: string;
	start: Temporal.ZonedDateTime;
	end: Temporal.ZonedDateTime;
	calendarId: string; // employee lane id
	_employeeId?: string | null;
	_colorClass?: string;
	_isArchivedCustomer?: boolean;
}

export const getEmployeeColor = (employeeId?: string | null): string =>
	employeeId ? `emp-${employeeId}` : "emp-default";

export const jobsToSxEvents = (jobs: JobDTO[]): SxEvent[] =>
	jobs.map((job) => {
		const start = toZDT(job.start);
		const end = toZDT(job.end);
		const calendarId = job.employeeId ?? "default";
		const isArchivedCustomer = job.customer?.isArchived ?? false;
		return {
			id: job.id,
			title: isArchivedCustomer ? `${job.title} 📁` : job.title,
			start,
			end,
			calendarId,
			_employeeId: job.employeeId ?? null,
			_colorClass: getEmployeeColor(job.employeeId),
			_isArchivedCustomer: isArchivedCustomer,
		};
	});
