import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, serverOnlyEnv } from "~/lib/env";
import type { Database } from "~/types/supabase";

/**
 * Branded token proving caller validated the internal job boundary.
 * Forces call-sites to assert the system scope before accessing service-role DB.
 */
export type SystemScope = { readonly __brand: "SystemScope" };

/**
 * Validate the internal job token from a NextRequest (or any header map)
 * and return a branded scope required to obtain the system DB client.
 */
export function assertSystemScope(headers: Headers): SystemScope {
	const token = headers.get("X-Internal-Job-Token");
	if (token !== serverOnlyEnv.INTERNAL_JOB_TOKEN) {
		// Do NOT leak specifics; keep message generic
		throw new Error("Unauthorized");
	}
	return { __brand: "SystemScope" } as SystemScope;
}

/**
 * Singleton service-role client. This bypasses RLS intentionally for
 * system operations documented in docs/ops/status-refresh.md.
 * The branded parameter prevents accidental usage without the prior assert.
 */
let _systemDb: SupabaseClient<Database> | null = null;
export function getSystemDb(scope: SystemScope): SupabaseClient<Database> {
	// Branded parameter enforces prior assertSystemScope call
	void scope;
	if (_systemDb !== null) return _systemDb;
	_systemDb = createClient<Database>(
		env.SUPABASE_URL,
		serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY,
		{ auth: { persistSession: false } },
	);
	return _systemDb;
}
