import { cookies } from "next/headers";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export default async function LanguageSwitcherServer(): Promise<JSX.Element> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get("locale")?.value;
	const initialLocale = cookie === "en" ? "en" : "nl";
	return <LanguageSwitcher initialLocale={initialLocale} />;
}
