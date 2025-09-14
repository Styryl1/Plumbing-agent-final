import { useTranslations } from "next-intl";
/** @server-only */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, serverOnlyEnv } from "~/lib/env";
import type { Database } from "~/types/supabase";

/**
 * ⚠️⚠️⚠️ DEPRECATED - DO NOT USE IN APPLICATION CODE ⚠️⚠️⚠️
 *
 * Server admin client with service role key - BYPASSES ALL RLS POLICIES!
 *
 * ONLY USE FOR:
 * - Webhook endpoints that receive verified external events
 * - Database migrations and seeding scripts
 * - Emergency admin operations (with explicit audit logging)
 *
 * ❌ NEVER USE IN:
 * - tRPC routers (use ctx.db instead - has RLS)
 * - Server components (use getRlsDb() with JWT)
 * - Any user-facing features
 *
 * 🚨 SECURITY WARNING: This client has FULL DATABASE ACCESS and
 * bypasses all Row Level Security policies. Using this in application
 * code is a CRITICAL SECURITY VULNERABILITY that exposes all tenant data!
 *
 * @deprecated Use getRlsDb() from ~/server/security/rlsClient instead
 */
export function getAdminDb(): SupabaseClient<Database> {
	return createClient<Database>(
		env.SUPABASE_URL,
		serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		},
	);
}

/**
 * Server anon client for SSR and future RLS operations.
 *
 * Use this for:
 * - Server-side rendering with user context
 * - RLS-enabled operations (Phase 1.1)
 * - Public read operations
 *
 * Safe to use in server components and API routes.
 */
export function getServerDb(): SupabaseClient<Database> {
	return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

/**
 * NOTE:
 * For user-scoped, RLS-enforced queries use getRlsDb(token) from
 * '~/server/security/rlsClient'. The token should come from Clerk:
 *    const token = await auth().getToken({ template: "supabase" });
 */
