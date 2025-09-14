// Simplified type to avoid TypeScript complexity issues
// In practice, this will be a string that matches valid i18n keys
export type I18nKey = string;

// Typed helpers for iterating objects without losing key unions
export const typedKeys = <T extends object>(o: T): Array<keyof T> =>
	Object.keys(o) as Array<keyof T>;

export const typedEntries = <T extends Record<string, unknown>>(
	o: T,
): { [K in keyof T]: [K, T[K]] }[keyof T][] =>
	Object.entries(o) as { [K in keyof T]: [K, T[K]] }[keyof T][];
