import type en from "~/i18n/messages/en.json";

type Messages = typeof en;

declare global {
	interface IntlMessages extends Messages {}
}

export {}; // make this a module so global augmentation is applied
