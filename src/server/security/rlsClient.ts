/**
 * RLS-Aware Supabase Client
 * Creates per-request Supabase clients with a verified Third-Party JWT (Clerk)
 * for secure multi-tenant data access
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import type { Database } from "~/types/supabase";

/**
 * Creates an RLS-aware Supabase client with the provided JWT
 * @param clerkJwt - Clerk JWT token containing org_id and user claims
 * @returns Supabase client with RLS enforcement
 */
export function getRlsDb(clerkJwt: string): SupabaseClient<Database> {
	// This enforces RLS policies based on JWT claims provided by Clerk.
	// Supabase will validate the token via the configured Third-Party provider (Clerk).
	return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		global: {
			headers: {
				// Supply Clerk JWT so RLS policies can use auth.jwt()
				Authorization: `Bearer ${clerkJwt}`,
			},
		},
	});
}
