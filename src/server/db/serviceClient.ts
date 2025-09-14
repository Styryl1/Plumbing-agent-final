/** @server-only */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { env, serverOnlyEnv } from "~/lib/env";
import type { Database } from "~/types/supabase";

/**
 * Webhook-safe service client.
 * Use ONLY in verified webhooks after signature check.
 */
export function getServiceDbForWebhook(): SupabaseClient<Database> {
	return createClient<Database>(
		env.SUPABASE_URL,
		serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY,
		{
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);
}
