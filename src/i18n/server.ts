import { currentUser } from "@clerk/nextjs/server";
// src/i18n/server.ts
import { headers } from "next/headers";
import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from "./index";

function normalizeLocale(input?: string | null): Locale {
	const v = (input || "").toLowerCase();
	if (v.startsWith("nl")) return "nl";
	return "en";
}

/**
 * Resolve the user's locale with comprehensive fallback chain:
 * 1) Clerk user preference (publicMetadata.locale or user.locale if present)
 * 2) Accept-Language header
 * 3) Default locale ('en')
 */
export async function resolveLocale(): Promise<Locale> {
	try {
		const user = await currentUser();
		const fromClerk =
			(user?.publicMetadata as any)?.locale ??
			(user as any)?.locale ??
			(user?.privateMetadata as any)?.locale;
		if (fromClerk) return normalizeLocale(fromClerk);
	} catch {
		// not signed-in or serverless edge with no session
	}

	type SimpleHeaders = { get(name: string): string | null };
	const accept = (headers() as unknown as SimpleHeaders).get("accept-language");
	if (accept) return normalizeLocale(accept);
	return DEFAULT_LOCALE;
}

// Re-export next-intl server functions for backward compatibility
export {
	getFormatter as fmtServer,
	getTranslations as tServer,
} from "next-intl/server";
