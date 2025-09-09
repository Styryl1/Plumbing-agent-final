import { Temporal } from "temporal-polyfill";

/**
 * Test helper to pin Temporal.Now to a specific ZonedDateTime for deterministic testing.
 * Does not patch global Date - keeps temporal testing isolated.
 * 
 * @param zdtISO - ISO string in Amsterdam timezone (e.g., "2025-09-02T09:59:00+02:00[Europe/Amsterdam]")
 * @param fn - Test function to run with pinned time
 * @returns Promise resolving to fn's result
 */
export async function withAmsterdamNow<T>(
	zdtISO: string,
	fn: () => Promise<T> | T,
): Promise<T> {
	// Store original Temporal.Now implementation
	const originalInstant = Temporal.Now.instant;
	const originalZonedDateTime = Temporal.Now.zonedDateTimeISO;

	try {
		// Parse the pinned time and convert to instant
		const pinnedZdt = Temporal.ZonedDateTime.from(zdtISO);
		const pinnedInstant = pinnedZdt.toInstant();

		// Override Temporal.Now methods to return pinned time
		Temporal.Now.instant = () => pinnedInstant;
		Temporal.Now.zonedDateTimeISO = (timezone?: string | Temporal.TimeZoneLike) => {
			if (!timezone) {
				return pinnedZdt;
			}
			// If a different timezone is requested, convert the pinned instant
			return pinnedInstant.toZonedDateTimeISO(timezone);
		};

		// Execute test function
		return await fn();
	} finally {
		// Always restore original implementations
		Temporal.Now.instant = originalInstant;
		Temporal.Now.zonedDateTimeISO = originalZonedDateTime;
	}
}

/**
 * Utility to create Amsterdam ZonedDateTime ISO strings for tests
 * 
 * @param dateTime - Date and time in "YYYY-MM-DDTHH:MM:SS" format
 * @returns ISO string with Amsterdam timezone
 */
export function amsterdamTime(dateTime: string): string {
	return `${dateTime}+02:00[Europe/Amsterdam]`;
}