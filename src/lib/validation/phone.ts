import { useTranslations } from "next-intl";

// Lightweight: accept E.164 or common NL formats; improve later with libphonenumber-js if desired
const E164 = /^\+?[1-9]\d{6,14}$/;
const NL_LOCAL = /^0\d{9}$/; // 10 digits, starts with 0

export function isValidPhone(value: string): boolean {
	const v = value.replace(/[^\d+]/g, "");
	return E164.test(v) || NL_LOCAL.test(v);
}

export function normalizePhone(value: string): string {
	return value.trim();
}
