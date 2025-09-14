"use client";
import { useTranslations } from "next-intl";

import "~/lib/polyfills"; // <-- must come before any Schedule-X imports

import {
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createResizePlugin } from "@schedule-x/resize";
import "@schedule-x/theme-default/dist/index.css";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { jobsToSxEvents } from "~/lib/calendar-adapter";
import {
	businessHoursStart,
	snapTo15Min,
	TZ,
	toISO,
} from "~/lib/calendar-temporal";
import { api } from "~/lib/trpc/client";
import BusinessRails from "./BusinessRails";

interface JobsCalendarProps {
	readonly onEditJob?: (jobId: string) => void;
	readonly onCreateJob?: (startLocal: string) => void;
}

export default function JobsCalendar({
	onEditJob,
	onCreateJob,
}: JobsCalendarProps): JSX.Element {
	// Memoize plugins to prevent re-instantiation (Schedule-X v3 pattern)
	const eventsService = useState(() => createEventsServicePlugin())[0];
	const dnd = useMemo(() => createDragAndDropPlugin(), []);
	const resize = useMemo(() => createResizePlugin(), []);
	const currentTime = useMemo(() => createCurrentTimePlugin(), []);

	// State for range-driven fetching - single source of truth
	const [visibleRange, setVisibleRange] = useState(() => {
		const now = Temporal.Now.plainDateISO(TZ);
		const startOfWeek = now.subtract({ days: now.dayOfWeek - 1 });
		const endOfWeek = startOfWeek.add({ days: 6 });
		return {
			start: startOfWeek
				.toZonedDateTime({ timeZone: TZ, plainTime: "06:00" })
				.toInstant()
				.toString(),
			end: endOfWeek
				.toZonedDateTime({ timeZone: TZ, plainTime: "21:00" })
				.toInstant()
				.toString(),
		};
	});

	// State for tracking current date for business rails
	const [currentDate, setCurrentDate] = useState(() =>
		Temporal.Now.plainDateISO(TZ),
	);

	// tRPC mutations for optimistic updates
	const utils = api.useUtils();
	const reschedule = api.jobs.reschedule.useMutation();

	// Fetch jobs with visible range - this IS the query architecture fix
	const { data: jobs = [], isLoading } = api.jobs.list.useQuery({
		from: visibleRange.start,
		to: visibleRange.end,
		// Could add employee filtering here if needed
	});

	// Transform jobs to calendar events with new adapter
	const events = useMemo(() => {
		return jobsToSxEvents(jobs);
	}, [jobs]);

	const selectedDate = useMemo(() => Temporal.Now.plainDateISO(TZ), []);

	const calendar = useCalendarApp({
		views: [createViewWeek(), createViewDay(), createViewMonthGrid()],
		defaultView: "week",
		locale: "nl-NL", // Force Dutch locale for proper date formatting (31/8 not 8/31)
		selectedDate,
		timezone: TZ, // Explicitly set timezone to Europe/Amsterdam
		dayBoundaries: {
			start: "06:00", // Extended hours: 06:00-21:00 for better scrolling
			end: "21:00",
		},
		events,
		plugins: [eventsService, dnd, resize, currentTime],
		callbacks: {
			// Handle event click
			onEventClick: (event) => {
				onEditJob?.(String(event.id));
			},

			// Handle double-click on empty slot
			onDoubleClickDate: (date: Temporal.PlainDate) => {
				// Use business hours start helper and snap to 15min grid
				const startZdt = snapTo15Min(businessHoursStart(date));
				const localStartISO = toISO(startZdt);
				onCreateJob?.(localStartISO);
			},

			// Handle range updates - THIS FIXES THE NAVIGATION BUG
			onRangeUpdate: (range: {
				start: Temporal.ZonedDateTime;
				end: Temporal.ZonedDateTime;
			}) => {
				// Update visible range state - this triggers query refetch
				setVisibleRange({
					start: toISO(range.start),
					end: toISO(range.end),
				});
				// Update current date for business rails
				setCurrentDate(range.start.toPlainDate());
			},

			// Handle view changes to update business rails
			onSelectedDateUpdate: (date: Temporal.PlainDate) => {
				setCurrentDate(date);
			},

			// Handle drag & drop and resize with optimistic updates (v3 API)
			onEventUpdate: (event: {
				id: string | number;
				start: Temporal.ZonedDateTime | Temporal.PlainDate;
				end: Temporal.ZonedDateTime | Temporal.PlainDate;
				calendarId?: string | undefined;
			}): void => {
				// Convert to ZonedDateTime if needed and use toISO helper
				const startZdt =
					event.start instanceof Temporal.ZonedDateTime
						? event.start
						: event.start.toZonedDateTime({
								timeZone: TZ,
								plainTime: Temporal.PlainTime.from("08:00"),
							});
				const endZdt =
					event.end instanceof Temporal.ZonedDateTime
						? event.end
						: event.end.toZonedDateTime({
								timeZone: TZ,
								plainTime: Temporal.PlainTime.from("17:00"),
							});
				const nextStartISO = toISO(startZdt);
				const nextEndISO = toISO(endZdt);

				// Safe parsing of event ID for multi-assignee patterns
				const parseEventId = (
					id: string | number,
				): { jobId: string; employeeId?: string } => {
					const idStr = String(id);
					const parts = idStr.split("__");
					const jobId = parts[0]!;
					const employeeId = parts[1];
					return employeeId ? { jobId, employeeId } : { jobId };
				};

				const { jobId } = parseEventId(event.id);

				// Use fire-and-forget mutation
				reschedule.mutate(
					{
						jobId,
						starts_at: nextStartISO,
						ends_at: nextEndISO,
					},
					{
						onSuccess: () => {
							void utils.jobs.list.invalidate();
							toast.success("Klus bijgewerkt");
						},
						onError: (err: unknown) => {
							const message =
								err instanceof Error ? err.message : "Bewerking mislukt";
							toast.error(message);
						},
					},
				);
			},
		},
	});

	// Critical: Handle events service updates when jobs change
	// v3: use eventsService.set() instead of removeAll() + add() to prevent flicker
	useEffect(() => {
		// Atomic update to prevent calendar flicker on navigation
		eventsService.set(events);
	}, [eventsService, events]);

	// Show loading state while fetching jobs
	if (isLoading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<div className="text-lg font-medium text-muted-foreground">
						Kalender laden...
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="sx-react-calendar-wrapper h-[72vh] w-full relative"
			data-testid="calendar-root"
		>
			<div data-testid="calendar-grid">
				<ScheduleXCalendar calendarApp={calendar} />
			</div>
			{/* Business rails overlay - positioned behind calendar events */}
			<div className="absolute inset-0 pointer-events-none z-0">
				<BusinessRails view="week" currentDate={currentDate} />
			</div>
		</div>
	);
}
