import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, type Locale, loadMessages } from ".";

export default getRequestConfig(async () => {
	// Detect locale from cookie (same pattern as middleware)
	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get("locale")?.value as Locale | undefined;
	const locale: Locale =
		cookieLocale === "en" || cookieLocale === "nl"
			? cookieLocale
			: DEFAULT_LOCALE;

	return {
		locale,
		messages: loadMessages(locale),
		timeZone: "Europe/Amsterdam",
		// Only return serializable properties
		// now timestamp automatically provided by next-intl if not specified
		// onError and getMessageFallback must be defined client-side
	};
});
