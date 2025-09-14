import { useTranslations } from "next-intl";
// src/lib/date-bridge.ts
import "temporal-polyfill";

const TZ = "Europe/Amsterdam";

/**
 * @todo Remove this bridge when all UI components support Temporal directly
 */

export function plainDateToDate(
	date: Temporal.PlainDate,
	time?: { hour: number; minute: number },
	tz: string = TZ,
): Date {
	const plainTime = time
		? Temporal.PlainTime.from(time)
		: Temporal.PlainTime.from({ hour: 12 });
	const zdt = date.toZonedDateTime({ timeZone: tz, plainTime });
	return new Date(zdt.toInstant().epochMilliseconds);
}

export function mergePlainDateAndTime(
	date: Temporal.PlainDate,
	hhmm: string,
	tz: string = TZ,
): Temporal.ZonedDateTime {
	const [h, m] = hhmm.split(":").map(Number);
	const zdt = date.toZonedDateTime({
		timeZone: tz,
		plainTime: Temporal.PlainTime.from({ hour: h ?? 0, minute: m ?? 0 }),
	});
	return zdt.with({ second: 0, millisecond: 0 });
}
