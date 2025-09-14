// src/i18n/devGuard.ts
import { env } from "~/lib/env";

/* DEV ONLY – Warns if keys still look flat after normalization */
export function warnIfFlatKeys(messages: Record<string, unknown>): void {
	if (env.NODE_ENV === "production") return;

	const flatKeys: string[] = [];
	const check = (obj: Record<string, unknown>, prefix = ""): void => {
		for (const [k, v] of Object.entries(obj)) {
			const full = prefix !== "" ? `${prefix}.${k}` : k;
			if (k.includes(".")) {
				flatKeys.push(full);
			}
			if (v !== null && typeof v === "object" && !Array.isArray(v)) {
				check(v as Record<string, unknown>, full);
			}
		}
	};
	check(messages);

	if (flatKeys.length > 0) {
		console.warn(
			"[i18n] Detected flat keys post-normalization:",
			flatKeys.slice(0, 10),
			"…",
		);
	}
}
