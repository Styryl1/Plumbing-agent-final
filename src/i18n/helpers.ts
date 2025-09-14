import { cookies } from "next/headers";
import { useTranslations } from "next-intl";
import type { Locale } from "./index";

export async function getServerLocale(): Promise<Locale> {
	const cookieStore = await cookies();
	const cookieValue = cookieStore.get("locale")?.value;
	return cookieValue === "en" ? "en" : "nl";
}
