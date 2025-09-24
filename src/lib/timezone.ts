const SUPPORTED_TIMEZONES = new Set(
	typeof Intl.supportedValuesOf === "function"
		? Intl.supportedValuesOf("timeZone")
		: ["Europe/Amsterdam"],
);

export const DEFAULT_TIMEZONE = "Europe/Amsterdam";

export const isValidTimezone = (
	value: string | null | undefined,
): value is string =>
	typeof value === "string" && SUPPORTED_TIMEZONES.has(value);

export const normalizeTimezone = (value: string | null | undefined): string =>
	isValidTimezone(value) ? value : DEFAULT_TIMEZONE;
