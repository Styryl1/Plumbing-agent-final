// src/lib/predicates.ts
// Type-safe boolean predicates for strict ESLint rules

export const hasText = (v: unknown): v is string =>
	typeof v === "string" && v.trim() !== "";

export const isNonEmptyString = (v: unknown): v is string =>
	typeof v === "string" && v.length > 0;

export const isNonZeroNumber = (v: unknown): v is number =>
	typeof v === "number" && !Number.isNaN(v) && v !== 0;

export const isValidNumber = (v: unknown): v is number =>
	typeof v === "number" && !Number.isNaN(v);

export const isEmpty = (v: unknown): boolean => {
	if (v === null || v === undefined || v === "") return true;
	if (Array.isArray(v)) return v.length === 0;
	if (typeof v === "object") return Object.keys(v).length === 0;
	return false;
};
