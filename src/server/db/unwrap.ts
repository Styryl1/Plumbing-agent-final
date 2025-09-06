import type { PostgrestError } from "@supabase/supabase-js";

// For SELECT returning multiple rows
type ArrayResp<T> = { data: T[] | null; error: PostgrestError | null };

// For SELECT returning a single row
type SingleResp<T> = { data: T | null; error: PostgrestError | null };

/**
 * rowsOrEmpty:
 * - Throws on error
 * - Returns [] when data === null
 * - Produces a non-nullable T[] for lint-clean loops (no ??, no truthiness)
 */
export function rowsOrEmpty<T>(resp: ArrayResp<T>): T[] {
	if (resp.error !== null) throw resp.error;
	if (resp.data === null) return [];
	return resp.data;
}

/**
 * mustSingle:
 * - Throws on error
 * - Throws if data === null
 * - Produces a non-nullable T
 */
export function mustSingle<T>(resp: SingleResp<T>): T {
	if (resp.error !== null) throw resp.error;
	if (resp.data === null) throw new Error("Row not found");
	return resp.data;
}
