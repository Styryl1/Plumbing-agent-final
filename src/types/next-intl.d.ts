import { useTranslations } from "next-intl";
// next-intl type augmentation (correct)
import type en from "~/i18n/messages/en.json";

type Messages = typeof en;

declare module "next-intl" {
	interface IntlMessages extends Messages {}
}

export {}; // keep this a module
