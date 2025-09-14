import { useTranslations } from "next-intl";

// Minimal Temporal helper - Unifies date handling across calendar/invoices
// Global polyfill loaded via layout, using globalThis.Temporal
// Single source of truth for the "three fighting date systems" problem

const TZ = "Europe/Amsterdam"; // TODO: make dynamic per-org later

/**
 * Parse ISO datetime string → ZonedDateTime (for timestamps with time)
 * Used for database timestamptz → app layer conversion
 */
export const parseZdt = (iso: string): Temporal.ZonedDateTime =>
	Temporal.Instant.from(iso).toZonedDateTimeISO(TZ);

/**
 * Convert ZonedDateTime → ISO UTC string (for database storage)
 * Used for app layer → database timestamptz conversion
 */
export const zdtToISO = (zdt: Temporal.ZonedDateTime): string =>
	zdt.toInstant().toString();

/**
 * Parse ISO date string → PlainDate (for date-only fields)
 * Used for database date columns and due dates
 */
export const parseDate = (yyyyMmDd: string): Temporal.PlainDate =>
	Temporal.PlainDate.from(yyyyMmDd);

/**
 * Convert PlainDate → ISO date string (for database storage)
 * Used for app layer → database date column conversion
 */
export const dateToISODate = (date: Temporal.PlainDate): string =>
	date.toString();

/**
 * Convert ZonedDateTime → epoch milliseconds (for next-intl formatting)
 * Used to format dates in UI components without using Date objects
 */
export const epochMs = (zdt: Temporal.ZonedDateTime): number =>
	Number(zdt.toInstant().epochMilliseconds);

// === BACKWARD COMPATIBILITY ===
// Keep existing functions working during migration

/**
 * @deprecated Use parseZdt instead
 */
export const isoUtcToZdt = parseZdt;

/**
 * @deprecated Use zdtToISO instead
 */
export const zdtToIsoUtc = zdtToISO;

/**
 * @deprecated Use parseZdt(iso, TZ) instead
 */
export const nowAms = (): Temporal.ZonedDateTime =>
	Temporal.Now.zonedDateTimeISO(TZ);

/**
 * @deprecated Use parseZdt instead
 */
export const fromISO = parseZdt;

/**
 * @deprecated Use zdtToISO instead
 */
export const toISO = zdtToISO;

/**
 * @deprecated Use TZ constant instead
 */
export const ZONE = TZ;

/**
 * @deprecated Use TZ constant instead
 */
export const AmsTZ = TZ;
