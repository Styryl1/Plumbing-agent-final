import { TRPCClientError } from "@trpc/client";
import { useTranslations } from "next-intl";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { isZodFlatten, type ZodFlatten } from "~/lib/zodError";

export function getZodFlattenFromTRPC(e: unknown): ZodFlatten | null {
	if (e instanceof TRPCClientError) {
		const data = e.data as Record<string, unknown> | undefined;
		const zod = data?.zodError;
		if (isZodFlatten(zod)) return zod;
	}
	return null;
}

/**
 * Convert ZodFlatten fieldErrors to simple Record<string, string> format
 * for use with React state-based forms (takes first error message per field)
 */
export function zodFlattenToFieldErrors(z: ZodFlatten): Record<string, string> {
	const fieldErrors: Record<string, string> = {};

	for (const [field, messages] of Object.entries(z.fieldErrors)) {
		if (messages.length > 0) {
			fieldErrors[field] = messages[0]!;
		}
	}

	return fieldErrors;
}

/**
 * Helper for React state-based error handling in dialogs
 * Returns null if no Zod errors, otherwise returns field error mapping
 */
export function extractZodFieldErrors(
	e: unknown,
): Record<string, string> | null {
	const zod = getZodFlattenFromTRPC(e);
	if (!zod) return null;

	return zodFlattenToFieldErrors(zod);
}

/**
 * Apply ZodFlatten errors to React Hook Form instance
 * Sets both form-level and field-level errors with translation support
 */
export function applyZodFlattenToForm<TForm extends FieldValues>(
	zodFlatten: ZodFlatten,
	form: UseFormReturn<TForm>,
): void {
	// Set form-level errors (not field-specific)
	if (zodFlatten.formErrors.length > 0) {
		form.setError("root", {
			type: "custom",
			message: zodFlatten.formErrors.join(", "),
		});
	}

	// Set field-level errors
	for (const [fieldPath, messages] of Object.entries(zodFlatten.fieldErrors)) {
		if (messages.length > 0) {
			// Use the first error message for the field
			// Use proper Path<T> typing for React Hook Form
			form.setError(fieldPath as Path<TForm>, {
				type: "custom",
				message: messages[0]!,
			});
		}
	}
}
