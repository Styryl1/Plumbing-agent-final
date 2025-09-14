import { useTranslations } from "next-intl";
import type en from "./en.json";

type Locales = "en" | "nl";

declare module "next-intl" {
	interface AppConfig {
		Messages: typeof en;
		Locale: Locales;
	}
}
export {};
