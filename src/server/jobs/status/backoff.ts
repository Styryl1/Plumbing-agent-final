import { useTranslations } from "next-intl";
import "server-only";
import "~/lib/time";

/**
 * Calculate next run time using exponential backoff with jitter
 *
 * @param attempt Current attempt number (0-based)
 * @param baseSec Base delay in seconds (default: 60s)
 * @param capMin Maximum delay in minutes (default: 60min)
 * @returns Next run time as Temporal.ZonedDateTime in Europe/Amsterdam
 */
export function calcNextRun(
	attempt: number,
	baseSec: number = 60,
	capMin: number = 60,
): Temporal.ZonedDateTime {
	// Exponential backoff: base * 2^attempt
	const exponentialSec = baseSec * Math.pow(2, attempt);

	// Cap at maximum minutes converted to seconds
	const cappedSec = Math.min(exponentialSec, capMin * 60);

	// Add jitter: ±20% of the capped delay
	const jitterRange = cappedSec * 0.2;
	const jitter = (Math.random() - 0.5) * 2 * jitterRange;
	const finalSec = Math.max(1, cappedSec + jitter); // Minimum 1 second

	// Calculate next run time
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	return now.add({ seconds: Math.round(finalSec) });
}

/**
 * Get delay description for logging/debugging
 */
export function getBackoffDescription(
	attempt: number,
	baseSec: number = 60,
): string {
	const exponentialSec = baseSec * Math.pow(2, attempt);
	const minutes = Math.round(exponentialSec / 60);

	if (minutes < 60) {
		return `${minutes}min`;
	}

	const hours = Math.round(minutes / 60);
	return `${hours}h`;
}
