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
	jobs.flatMap((job) => {
		const start = toZDT(job.start);
		const end = toZDT(job.end);
		const isArchivedCustomer = job.customer?.isArchived ?? false;

		const assigneeLanes =
			job.secondaryEmployeeIds.length > 0
				? [
						...(job.employeeId ? [job.employeeId] : []),
						...job.secondaryEmployeeIds,
					]
				: job.employeeId
					? [job.employeeId]
					: [null];

		const uniqueLanes = Array.from(new Set(assigneeLanes));

		return uniqueLanes.map((lane) => {
			const calendarId = lane ?? "default";
			const eventId = lane ? `${job.id}__${lane}` : job.id;
			return {
				id: eventId,
				title: isArchivedCustomer ? `${job.title} 📁` : job.title,
				start,
				end,
				calendarId,
				_employeeId: lane,
				_colorClass: getEmployeeColor(lane),
				_isArchivedCustomer: isArchivedCustomer,
			};
		});
	});
