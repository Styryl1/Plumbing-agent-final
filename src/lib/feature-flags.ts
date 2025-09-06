/**
 * Centralized feature flags for WhatsApp AI Receptionist
 * S0-S2: Foundation, Infrastructure, AI Brain
 *
 * These flags control the progressive rollout of WhatsApp features
 */

import { env } from "~/lib/env";

// Helper for explicit boolean parsing (no truthiness)
const asBool = (v: string | undefined): boolean => v === "true";

export const featureFlags = {
	// Master switch for WhatsApp functionality
	WHATSAPP_ENABLED: true,

	// Two-number architecture (business + control chat)
	DUAL_NUMBER_MODE: true,

	// Media download functionality (S1 - flag-gated)
	WA_MEDIA_DOWNLOAD: asBool(env.WA_MEDIA_DOWNLOAD),

	// AI analysis mode (S2)
	AI_MODE: env.AI_MODE.length > 0 ? env.AI_MODE : "rule",

	// AI analysis of messages (S2) - legacy compatibility
	AI_ANALYSIS_ENABLED: true,

	// Job Cards mobile interface (S6)
	JOB_CARDS_ENABLED: false,

	// External accounting provider
	ACCOUNTING_PROVIDER: "none" as
		| "none"
		| "moneybird"
		| "eboekhouden"
		| "wefact",
} as const;

export type FeatureFlags = typeof featureFlags;

// Helper function for typed flag access
export function flag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
	return featureFlags[key];
}
