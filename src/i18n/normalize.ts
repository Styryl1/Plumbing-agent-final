// src/i18n/normalize.ts
import type { AbstractIntlMessages, useTranslations } from "next-intl";

type AnyRecord = Record<string, unknown>;

/**
 * Convert { "a.b.c": "v", "x": "y" } into { a: { b: { c: "v" } }, x: "y" }.
 * If the input is already nested, it passes through.
 */
export function normalizeMessages(input: AnyRecord): AbstractIntlMessages {
	const out: AnyRecord = {};

	const setDeep = (obj: AnyRecord, path: string, value: unknown): void => {
		const parts = path.split(".");
		let cur = obj;
		for (let i = 0; i < parts.length; i++) {
			const key = parts[i]!;
			if (i === parts.length - 1) {
				cur[key] = value;
			} else {
				if (typeof cur[key] !== "object" || cur[key] === null) {
					cur[key] = {};
				}
				cur = cur[key] as AnyRecord;
			}
		}
	};

	let hasDotKey = false;
	for (const [k, v] of Object.entries(input)) {
		if (k.includes(".")) {
			hasDotKey = true;
			setDeep(out, k, v);
		} else {
			out[k] = v;
		}
	}

	// If there were no dotted keys, assume already nested; return original input.
	return (hasDotKey ? out : input) as AbstractIntlMessages;
}
