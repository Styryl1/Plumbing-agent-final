import type { AbstractIntlMessages, useTranslations } from "next-intl";
import { warnIfFlatKeys } from "./devGuard";
import enRaw from "./messages/en.json";
import nlRaw from "./messages/nl.json";
import { normalizeMessages } from "./normalize";

export type Locale = "en" | "nl";
export const DEFAULT_LOCALE: Locale = "nl";
export const SUPPORTED_LOCALES: Locale[] = ["en", "nl"];

/**
 * Deep merge two message objects, with target taking precedence
 * Provides fallback values from source for missing keys in target
 */
function deepMergeMessages(
	source: Record<string, unknown>,
	target: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...source };

	for (const [key, value] of Object.entries(target)) {
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			// Recursively merge nested objects
			result[key] = deepMergeMessages(
				(source[key] as Record<string, unknown>) || {},
				value as Record<string, unknown>,
			);
		} else {
			// Direct assignment for primitives (target overrides source)
			result[key] = value;
		}
	}

	return result;
}

/**
 * Load messages for the given locale with English fallbacks
 * Ensures no translation keys are ever missing in the UI
 */
export function loadMessages(locale: Locale): AbstractIntlMessages {
	const enMessages = enRaw as Record<string, unknown>;
	const nlMessages = nlRaw as Record<string, unknown>;

	if (locale === "en") {
		// For English, just normalize and return
		const messages = normalizeMessages(enMessages);
		warnIfFlatKeys(messages as Record<string, unknown>);
		return messages;
	} else {
		// For Dutch (or any other locale), merge with English fallbacks
		const mergedMessages = deepMergeMessages(enMessages, nlMessages);
		const messages = normalizeMessages(mergedMessages);
		warnIfFlatKeys(messages as Record<string, unknown>);
		return messages;
	}
}
