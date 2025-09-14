import { useTranslations } from "next-intl";
import type { ZodError } from "zod";

export type ZodFlatten = {
	formErrors: string[];
	fieldErrors: Record<string, string[]>;
};

export function isZodFlatten(x: unknown): x is ZodFlatten {
	if (x === null || x === undefined || typeof x !== "object") return false;
	const o = x as Record<string, unknown>;
	const fe = o.fieldErrors;
	return (
		Array.isArray(o.formErrors) &&
		fe !== null &&
		fe !== undefined &&
		typeof fe === "object" &&
		!Array.isArray(fe)
	);
}

export function toZodFlatten(err: ZodError): ZodFlatten {
	const formErrors: string[] = [];
	const fieldErrors: Record<string, string[]> = {};
	for (const issue of err.issues) {
		const path = issue.path.length > 0 ? issue.path.join(".") : "";
		if (path !== "") {
			(fieldErrors[path] ??= []).push(issue.message);
		} else {
			formErrors.push(issue.message);
		}
	}
	return { formErrors, fieldErrors };
}
