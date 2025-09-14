import { useTranslations } from "next-intl";
/**
 * Type assertion utilities for runtime invariant checking.
 * Used to satisfy TypeScript strict mode while maintaining ESLint compliance.
 */

/**
 * Asserts that a value is non-nullish, throwing if null or undefined.
 * This provides runtime safety without triggering ESLint's no-unnecessary-condition
 * rule since the assertion function encapsulates the check.
 *
 * @param value - Value to assert as non-nullish
 * @param message - Error message if assertion fails
 * @throws Error if value is null or undefined
 */
export function assertNonNullish<T>(
	value: T,
	message = "Unexpected null/undefined",
): asserts value is NonNullable<T> {
	// Check both null and undefined cases explicitly
	// ESLint doesn't inspect this internal check for no-unnecessary-condition
	if (value === null || value === undefined) {
		throw new Error(message);
	}
}
