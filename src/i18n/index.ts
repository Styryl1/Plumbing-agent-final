import type { AbstractIntlMessages } from "next-intl";
import enRaw from "./messages/en.json";
import nlRaw from "./messages/nl.json";
import { normalizeMessages } from "./normalize";

export type Locale = "en" | "nl";
export const DEFAULT_LOCALE: Locale = "nl";
export const SUPPORTED_LOCALES: Locale[] = ["en", "nl"];

export function loadMessages(locale: Locale): AbstractIntlMessages {
	const raw =
		locale === "en"
			? (enRaw as Record<string, unknown>)
			: (nlRaw as Record<string, unknown>);
	return normalizeMessages(raw);
}
