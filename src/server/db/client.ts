/** @server-only */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { env, serverOnlyEnv } from "~/lib/env";
import type { Database } from "~/types/supabase";

/**
 * Create user-facing Supabase client using anonymous key.
 * This client respects RLS policies and uses JWT-based org isolation.
 *
 * ✅ USE: In all tRPC routes, API endpoints serving user requests
 * ❌ NEVER: Use service role key for user-facing operations
 */
export function createUserClient(): SupabaseClient<Database> {
	return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

/**
 * Create system client with service role permissions.
 * Bypasses RLS policies - use with extreme caution.
 *
 * ✅ USE ONLY: Verified webhooks, cron jobs, system migrations
 * ❌ NEVER: User-facing requests, tRPC routes, API endpoints
 *
 * @throws {Error} In development if called from user context
 */
export function createSystemClient(): SupabaseClient<Database> {
	// Development safety check
	if (env.NODE_ENV !== "production") {
		const stack = new Error().stack;
		const userContextPatterns = [
			"/api/trpc/",
			"/api/auth/",
			"tRPC",
			"procedure",
		];

		if (
			stack &&
			userContextPatterns.some((pattern) => stack.includes(pattern))
		) {
			console.warn(
				"⚠️  WARNING: createSystemClient() called from user context. " +
					"This bypasses RLS security. Use createUserClient() instead.",
			);
		}
	}

	return createClient<Database>(
		env.SUPABASE_URL,
		serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY,
		{
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);
}

/**
 * Legacy webhook client - use createSystemClient() instead.
 * @deprecated Use createSystemClient() for consistency
 */
export function getServiceDbForWebhook(): SupabaseClient<Database> {
	return createSystemClient();
}
