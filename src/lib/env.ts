import { useTranslations } from "next-intl";
import "server-only";
import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
	CLERK_SECRET_KEY: z.string().min(1),
	SUPABASE_URL: z.url(),
	SUPABASE_ANON_KEY: z.string().min(1),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1), // never expose client-side
	SUPABASE_JWT_SECRET: z.string().min(1), // Required for RLS JWT minting
	NEXT_PUBLIC_APP_URL: z.url().optional(),
	POSTCODEAPI_NU_KEY: z.string().optional(), // Optional API key for Dutch address lookup
	// Webhook secrets for signature verification
	CLERK_WEBHOOK_SECRET: z.string().optional(), // Svix signing secret from Clerk
	MOLLIE_API_KEY: z.string().optional(), // Mollie API key (test or live)
	MOLLIE_WEBHOOK_TOKEN: z.string().optional(), // Mollie webhook verification token
	MONEYBIRD_WEBHOOK_SECRET: z.string().optional(), // Moneybird webhook signature verification
	// WhatsApp Cloud API configuration
	WHATSAPP_VERIFY_TOKEN: z.string().min(1), // WhatsApp webhook verification token (required)
	WHATSAPP_WEBHOOK_SECRET: z.string().optional(), // WhatsApp webhook signature verification
	WA_APP_SECRET: z.string().min(1), // Meta app secret for HMAC verification (required)
	WA_GRAPH_TOKEN: z.string().min(1), // Meta access token for API calls (required)
	WA_CUSTOMER_NUMBER_ID: z.string().min(1), // Phone number ID for customer chat (required)
	WA_CONTROL_NUMBER_ID: z.string().min(1), // Phone number ID for control chat (required)
	WA_MEDIA_DOWNLOAD: z.enum(["true", "false"]).default("false"), // Media download feature flag
	AI_MODE: z.enum(["rule", "openai"]).default("rule"), // AI analysis mode
	OPENAI_API_KEY: z.string().optional(), // OpenAI API key (optional, required only if AI_MODE="openai")
	// Legacy WhatsApp vars (for backward compatibility)
	WHATSAPP_APP_SECRET: z.string().optional(),
	WHATSAPP_BUSINESS_PHONE_ID: z.string().optional(),
	WHATSAPP_CONTROL_PHONE_ID: z.string().optional(),
	WHATSAPP_ACCESS_TOKEN: z.string().optional(),
	WHATSAPP_DEBUG: z.enum(["0", "1"]).default("0").optional(),
	// Provider OAuth2 credentials (server-only)
	MONEYBIRD_CLIENT_ID: z.string().optional(), // OAuth2 app client ID
	MONEYBIRD_CLIENT_SECRET: z.string().optional(), // OAuth2 app secret
	// Provider API keys (server-only)
	WEFACT_API_KEY: z.string().min(16).optional(), // WeFact API key
	WEFACT_BASE_URL: z.url().default("https://api.mijnwefact.nl/v2/").optional(), // WeFact API base URL
	EBOEK_API_TOKEN: z.string().min(24).optional(), // e-Boekhouden API token
	EBOEK_BASE_URL: z.url().default("https://api.e-boekhouden.nl").optional(), // e-Boekhouden API base URL
	// S0 Feature flags for invoice provider system
	ENABLE_INVOICE_V2: z.enum(["true", "false"]).default("false"),
	ENABLE_PROVIDER_BADGES: z.enum(["true", "false"]).default("true"),
	ENABLE_LEGACY_FALLBACK: z.enum(["true", "false"]).default("true"),
	// S2 Provider feature flags
	INVOICING_MONEYBIRD: z.enum(["true", "false"]).default("false"),
	INVOICING_WEFACT: z.enum(["true", "false"]).default("false"),
	INVOICING_EB: z.enum(["true", "false"]).default("false"),
	PEPPOL_SEND: z.enum(["true", "false"]).default("false"),
	// S9 Email provider for dunning reminders
	EMAIL_PROVIDER: z
		.enum(["resend", "sendgrid", "disabled"])
		.default("disabled"),
	EMAIL_API_KEY: z.string().optional(), // API key for email provider
	EMAIL_FROM: z.email().default("noreply@loodgieter.nl").optional(), // From address for reminders
	// Internal job token for secure API operations
	INTERNAL_JOB_TOKEN: z.string().min(32), // Internal token for status refresh jobs
	// Marketing tools
	AIRTABLE_WEBHOOK_URL: z.url().optional(), // Optional Airtable webhook for waitlist mirroring
	NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(), // Google Analytics measurement ID
	NEXT_PUBLIC_ANALYTICS_ENABLED: z.enum(["true", "false"]).default("false"), // Analytics enabled flag
	// Pilot mode - master feature switch
	PILOT_MODE: z.enum(["true", "false"]).default("false"), // Enables all MVP features for pilot testing
});

const parsed = schema.safeParse({
	NODE_ENV: process.env.NODE_ENV,
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
		process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
	CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
	SUPABASE_URL: process.env.SUPABASE_URL,
	SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
	SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
	SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	POSTCODEAPI_NU_KEY: process.env.POSTCODEAPI_NU_KEY,
	CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
	MOLLIE_API_KEY: process.env.MOLLIE_API_KEY,
	MOLLIE_WEBHOOK_TOKEN: process.env.MOLLIE_WEBHOOK_TOKEN,
	MONEYBIRD_WEBHOOK_SECRET: process.env.MONEYBIRD_WEBHOOK_SECRET,
	WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
	WA_APP_SECRET: process.env.WA_APP_SECRET,
	WA_GRAPH_TOKEN: process.env.WA_GRAPH_TOKEN,
	WA_CUSTOMER_NUMBER_ID: process.env.WA_CUSTOMER_NUMBER_ID,
	WA_CONTROL_NUMBER_ID: process.env.WA_CONTROL_NUMBER_ID,
	WA_MEDIA_DOWNLOAD: process.env.WA_MEDIA_DOWNLOAD,
	AI_MODE: process.env.AI_MODE,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	// Legacy WhatsApp vars
	WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
	WHATSAPP_BUSINESS_PHONE_ID: process.env.WHATSAPP_BUSINESS_PHONE_ID,
	WHATSAPP_CONTROL_PHONE_ID: process.env.WHATSAPP_CONTROL_PHONE_ID,
	WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
	WHATSAPP_DEBUG: process.env.WHATSAPP_DEBUG,
	MONEYBIRD_CLIENT_ID: process.env.MONEYBIRD_CLIENT_ID,
	MONEYBIRD_CLIENT_SECRET: process.env.MONEYBIRD_CLIENT_SECRET,
	WEFACT_API_KEY: process.env.WEFACT_API_KEY,
	WEFACT_BASE_URL: process.env.WEFACT_BASE_URL,
	EBOEK_API_TOKEN: process.env.EBOEK_API_TOKEN,
	EBOEK_BASE_URL: process.env.EBOEK_BASE_URL,
	ENABLE_INVOICE_V2: process.env.ENABLE_INVOICE_V2,
	ENABLE_PROVIDER_BADGES: process.env.ENABLE_PROVIDER_BADGES,
	ENABLE_LEGACY_FALLBACK: process.env.ENABLE_LEGACY_FALLBACK,
	INVOICING_MONEYBIRD: process.env.INVOICING_MONEYBIRD,
	INVOICING_WEFACT: process.env.INVOICING_WEFACT,
	INVOICING_EB: process.env.INVOICING_EB,
	PEPPOL_SEND: process.env.PEPPOL_SEND,
	EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
	EMAIL_API_KEY: process.env.EMAIL_API_KEY,
	EMAIL_FROM: process.env.EMAIL_FROM,
	INTERNAL_JOB_TOKEN: process.env.INTERNAL_JOB_TOKEN,
	AIRTABLE_WEBHOOK_URL: process.env.AIRTABLE_WEBHOOK_URL,
	NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
	NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
	PILOT_MODE: process.env.PILOT_MODE,
});

if (!parsed.success) {
	// Show exactly what failed
	const errorMessage = `❌ Invalid environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`;

	// Log the error for debugging
	console.error(errorMessage);

	// Throw an error to prevent the app from running with invalid config
	// This works in both Node.js and Edge Runtime
	throw new Error(errorMessage);
}

// Export a readonly object - we know this is safe because an error was thrown above on failure
export const env = Object.freeze(parsed.data);

// Guard: block accidental import in client bundles
export const serverOnlyEnv = (() => {
	if (typeof window !== "undefined") {
		throw new Error("serverOnlyEnv imported in a client bundle");
	}
	return {
		CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
		SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
		SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET,
		MONEYBIRD_CLIENT_ID: env.MONEYBIRD_CLIENT_ID,
		MONEYBIRD_CLIENT_SECRET: env.MONEYBIRD_CLIENT_SECRET,
		MONEYBIRD_WEBHOOK_SECRET: env.MONEYBIRD_WEBHOOK_SECRET,
		WEFACT_API_KEY: env.WEFACT_API_KEY,
		WEFACT_BASE_URL: env.WEFACT_BASE_URL,
		WA_APP_SECRET: env.WA_APP_SECRET,
		WA_GRAPH_TOKEN: env.WA_GRAPH_TOKEN,
		WA_CUSTOMER_NUMBER_ID: env.WA_CUSTOMER_NUMBER_ID,
		WA_CONTROL_NUMBER_ID: env.WA_CONTROL_NUMBER_ID,
		OPENAI_API_KEY: env.OPENAI_API_KEY,
		WHATSAPP_APP_SECRET: env.WHATSAPP_APP_SECRET,
		WHATSAPP_ACCESS_TOKEN: env.WHATSAPP_ACCESS_TOKEN,
		WHATSAPP_BUSINESS_PHONE_ID: env.WHATSAPP_BUSINESS_PHONE_ID,
		EBOEK_API_TOKEN: env.EBOEK_API_TOKEN,
		EBOEK_BASE_URL: env.EBOEK_BASE_URL,
		EMAIL_API_KEY: env.EMAIL_API_KEY,
		EMAIL_PROVIDER: env.EMAIL_PROVIDER,
		EMAIL_FROM: env.EMAIL_FROM,
		INTERNAL_JOB_TOKEN: env.INTERNAL_JOB_TOKEN,
		NODE_ENV: env.NODE_ENV,
		MOLLIE_API_KEY: env.MOLLIE_API_KEY,
		MOLLIE_WEBHOOK_TOKEN: env.MOLLIE_WEBHOOK_TOKEN,
		AIRTABLE_WEBHOOK_URL: env.AIRTABLE_WEBHOOK_URL,
		WHATSAPP_VERIFY_TOKEN: env.WHATSAPP_VERIFY_TOKEN,
	} as const;
})();
