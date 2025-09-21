// src/lib/calendar-temporal.ts
// Global polyfill loaded via layout, using globalThis.Temporal

export const TZ = "Europe/Amsterdam";

/**
 * Convert ISO UTC string from DB → ZonedDateTime in Amsterdam
 * Used at tRPC boundary for incoming data
 */
export const toZDT = (iso: string): Temporal.ZonedDateTime =>
	Temporal.Instant.from(iso).toZonedDateTimeISO(TZ);

/**
 * Convert ZonedDateTime → ISO UTC string for DB storage
 * Used at tRPC boundary for outgoing data
 */
export const toISO = (zdt: Temporal.ZonedDateTime): string =>
	zdt.toInstant().toString();

/**
 * Create ZonedDateTime from PlainDate and time components
 * Used for form submission conversions
 */
export const zdtFromPlainDateAndTime = (
	date: Temporal.PlainDate,
	time: { hour: number; minute: number },
): Temporal.ZonedDateTime =>
	date
		.toZonedDateTime({ timeZone: TZ, plainTime: Temporal.PlainTime.from(time) })
		.with({ second: 0, millisecond: 0 });

/**
 * Snap ZonedDateTime to 15-minute grid (business requirement)
 * Used for drag/drop and create operations
 */
export const snapTo15Min = (
	zdt: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime => {
	const minutes = zdt.minute;
	const snappedMinutes = Math.round(minutes / 15) * 15;

	return zdt
		.with({
			minute: 0,
			second: 0,
			millisecond: 0,
			microsecond: 0,
			nanosecond: 0,
		})
		.add({ minutes: snappedMinutes });
};

/**
 * Create ZonedDateTime for business hours start (08:00 Amsterdam)
 * Used for empty slot creation
 */
export const businessHoursStart = (
	date: Temporal.PlainDate,
): Temporal.ZonedDateTime =>
	date.toZonedDateTime({
		timeZone: TZ,
		plainTime: Temporal.PlainTime.from("08:00"),
	});

/**
 * Create ZonedDateTime for business hours end (17:00 Amsterdam)
 * Used for validation and rails
 */
export const businessHoursEnd = (
	date: Temporal.PlainDate,
): Temporal.ZonedDateTime =>
	date.toZonedDateTime({
		timeZone: TZ,
		plainTime: new Temporal.PlainTime(17, 0), // 17:00
	});

/**
 * Create ZonedDateTime for lunch break start (12:00 Amsterdam)
 * Used for rails overlay
 */
export const lunchStart = (date: Temporal.PlainDate): Temporal.ZonedDateTime =>
	date.toZonedDateTime({
		timeZone: TZ,
		plainTime: new Temporal.PlainTime(12, 0), // 12:00
	});

/**
 * Create ZonedDateTime for lunch break end (13:00 Amsterdam)
 * Used for rails overlay
 */
export const lunchEnd = (date: Temporal.PlainDate): Temporal.ZonedDateTime =>
	date.toZonedDateTime({
		timeZone: TZ,
		plainTime: new Temporal.PlainTime(13, 0), // 13:00
	});

/**
 * Check if ZonedDateTime is within business hours
 * Used for drag/drop validation
 */
export const isWithinBusinessHours = (zdt: Temporal.ZonedDateTime): boolean => {
	const date = zdt.toPlainDate();
	const start = businessHoursStart(date);
	const end = businessHoursEnd(date);

	return (
		Temporal.ZonedDateTime.compare(zdt, start) >= 0 &&
		Temporal.ZonedDateTime.compare(zdt, end) <= 0
	);
};

/**
 * Check if ZonedDateTime range overlaps with lunch break
 * Used for validation warnings
 */
export const overlapsLunchBreak = (
	startZdt: Temporal.ZonedDateTime,
	endZdt: Temporal.ZonedDateTime,
): boolean => {
	const date = startZdt.toPlainDate();
	const lunchStartZdt = lunchStart(date);
	const lunchEndZdt = lunchEnd(date);

	// Check if ranges overlap
	return (
		Temporal.ZonedDateTime.compare(startZdt, lunchEndZdt) < 0 &&
		Temporal.ZonedDateTime.compare(endZdt, lunchStartZdt) > 0
	);
};

/**
 * Get current week range (Monday to Sunday) in Amsterdam timezone
 * Used for weekly calendar data fetching
 */
export const getCurrentWeekRange = (): { start: string; end: string } => {
	const now = Temporal.Now.zonedDateTimeISO(TZ);
	const dayOfWeek = now.dayOfWeek; // 1 = Monday, 7 = Sunday
	const startOfWeek = now.subtract({ days: dayOfWeek - 1 }).startOfDay();
	const endOfWeek = startOfWeek
		.add({ days: 6 })
		.with({ hour: 23, minute: 59, second: 59 });

	return {
		start: startOfWeek.toInstant().toString(),
		end: endOfWeek.toInstant().toString(),
	};
};

/**
 * Format ZonedDateTime for display in Dutch locale
 */
export function formatZDT(
	zdt: Temporal.ZonedDateTime,
	options?: Intl.DateTimeFormatOptions,
): string {
	return zdt.toLocaleString("nl-NL", options);
}

/**
 * Get duration between two ZonedDateTimes
 */
export function getDuration(
	start: Temporal.ZonedDateTime,
	end: Temporal.ZonedDateTime,
): Temporal.Duration {
	return start.until(end);
}

/**
 * Format duration in a human-readable way (Dutch)
 */
export function formatDuration(duration: Temporal.Duration): string {
	const hours = duration.hours + duration.days * 24;
	const minutes = duration.minutes;

	if (hours > 0 && minutes > 0) {
		return `${hours} uur ${minutes} minuten`;
	} else if (hours > 0) {
		return `${hours} uur`;
	} else {
		return `${minutes} minuten`;
	}
}

/**
 * Create ZonedDateTime from date and time form pieces
 */
export function fromDateTime(
	dateISO: string,
	timeHHmm: string,
): Temporal.ZonedDateTime {
	const [h, m] = timeHHmm.split(":").map(Number);
	const plainDate = Temporal.PlainDate.from(dateISO);
	const plainTime = Temporal.PlainTime.from({ hour: h ?? 0, minute: m ?? 0 });

	return plainDate.toZonedDateTime({ timeZone: TZ, plainTime });
}

/**
 * Get current ZonedDateTime in Amsterdam timezone
 */
export function nowZDT(): Temporal.ZonedDateTime {
	return Temporal.Now.zonedDateTimeISO(TZ);
}

/**
 * Get current ZonedDateTime for provided timezone (defaults to Amsterdam)
 */
export function nowZoned(timeZone: string = TZ): Temporal.ZonedDateTime {
	return Temporal.Now.zonedDateTimeISO(timeZone);
}

/**
 * Convert ZonedDateTime to ISO Instant string for database storage
 */
export function zdtToISO(zdt: Temporal.ZonedDateTime): string {
	return zdt.toInstant().toString();
}

/**
 * Convert Date object to PlainDate for Temporal operations
 */
export function dateToPlainDate(date: globalThis.Date): Temporal.PlainDate {
	return Temporal.PlainDate.from({
		year: date.getFullYear(),
		month: date.getMonth() + 1,
		day: date.getDate(),
	});
}

/**
 * Calculate whole minutes between two ZonedDateTime instances
 */
export function minutesBetween(
	start: Temporal.ZonedDateTime,
	end: Temporal.ZonedDateTime,
): number {
	return Math.round(start.until(end).total({ unit: "minutes" }));
}

/**
 * Round minutes to nearest 5-minute increment
 */
export function round5(value: number): number {
	return Math.round(value / 5) * 5;
}
