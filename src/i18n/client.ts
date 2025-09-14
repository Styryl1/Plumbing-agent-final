import { useTranslations } from "next-intl";

// src/i18n/client.ts
export {
	NextIntlClientProvider,
	useLocale,
	useTranslations,
} from "next-intl";

/** @deprecated Do not pass namespaces; prefer full-root keys with useTranslations() */
export const useT = (): ReturnType<typeof useTranslations> => useTranslations();
