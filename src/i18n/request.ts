import { cookies } from "next/headers";
import { useTranslations } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import {
	DEFAULT_LOCALE,
	type Locale,
	loadMessages,
	SUPPORTED_LOCALES,
} from ".";

// v4: prefer requestLocale, fall back to cookie/default
export default getRequestConfig(async ({ requestLocale }) => {
	const cookieStore = await cookies();
	const cookieValue = cookieStore.get("locale")?.value;
	const requestedLocale = await requestLocale;

	// Type-safe locale validation
	const isValidLocale = (value: unknown): value is Locale => {
		return (
			typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale)
		);
	};

	// Your rule: cookie wins if present; otherwise requestLocale; else default
	let locale: Locale;
	if (isValidLocale(cookieValue)) {
		locale = cookieValue;
	} else if (isValidLocale(requestedLocale)) {
		locale = requestedLocale;
	} else {
		locale = DEFAULT_LOCALE;
	}

	return {
		locale,
		messages: loadMessages(locale),
		timeZone: "Europe/Amsterdam",
	};
});
