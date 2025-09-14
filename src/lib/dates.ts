import { useTranslations } from "next-intl";
// Temporal-based date utilities for plumbing agent
// Replaces date-fns with native Temporal API for Europe/Amsterdam timezone handling

import {
	formatZDT,
	getCurrentWeekRange as getWeekRange,
	TZ,
	toZDT,
} from "~/lib/calendar-temporal";

/**
 * Convert ISO UTC string to local Amsterdam time (as ZonedDateTime)
 * @deprecated Use toZDT from calendar-temporal directly
 */
export const toLocalISO = (isoUtc: string): string => {
	const zdt = toZDT(isoUtc);
	return zdt.toString({ timeZoneName: "never" });
};

/**
 * Convert local ISO string to UTC (assumes Amsterdam timezone)
 * @deprecated Use Temporal.ZonedDateTime.from().toInstant().toString() directly
 */
export const toUTCISO = (localIsoNoTZ: string): string => {
	const zdt = Temporal.ZonedDateTime.from(`${localIsoNoTZ}[${TZ}]`);
	return zdt.toInstant().toString();
};

// Business hours validation (08:00-18:00 Amsterdam time)
export const isWithinBusinessHours = (
	localStartISO: string,
	localEndISO: string,
): boolean => {
	// Convert to ZonedDateTime for proper timezone handling
	const startZDT = toZDT(localStartISO);
	const endZDT = toZDT(localEndISO);

	// Check hours (must be between 08:00 and 18:00)
	const startHour = startZDT.hour;
	const startMinute = startZDT.minute;
	const endHour = endZDT.hour;
	const endMinute = endZDT.minute;

	// Start must be at or after 08:00
	const startTime = startHour * 60 + startMinute;
	const businessStart = 8 * 60; // 08:00 in minutes

	// End must be at or before 18:00
	const endTime = endHour * 60 + endMinute;
	const businessEnd = 18 * 60; // 18:00 in minutes

	return (
		startTime >= businessStart && endTime <= businessEnd && endTime > startTime
	);
};

export const formatDutchDate = (isoUtc: string): string => {
	const zdt = toZDT(isoUtc);
	return formatZDT(zdt, {
		year: "numeric",
		month: "short",
		day: "2-digit",
	});
};

export const formatDutchTime = (isoUtc: string): string => {
	const zdt = toZDT(isoUtc);
	return formatZDT(zdt, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
};

export const formatDutchDateTime = (isoUtc: string): string => {
	const zdt = toZDT(isoUtc);
	return formatZDT(zdt, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
};

export const getCurrentWeekRange = getWeekRange;

export const addDays = (date: string, days: number): string => {
	const zdt = toZDT(date);
	return zdt.add({ days }).toInstant().toString();
};

export const addWeeks = (date: string, weeks: number): string => {
	return addDays(date, weeks * 7);
};
