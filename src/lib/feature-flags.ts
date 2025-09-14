import { useTranslations } from "next-intl";
import "server-only";
import { env } from "~/lib/env";

/**
 * Centralized feature flags with PILOT_MODE cascade
 * PILOT_MODE=true enables all MVP features for pilot testing
 */

export type FeatureFlags = {
	whatsappUi: boolean;
	canIssueInvoices: boolean;
	showMollieLinks: boolean;
	calendarEnabled: boolean;
	dunningMinimal: boolean;
	pilotMode: boolean;
};

/**
 * Compute base feature flags from environment
 */
function computeBaseFlags(): FeatureFlags {
	const pilotMode = env.PILOT_MODE === "true";

	// Base flags (defaults when pilot mode is off)
	const baseFlags: FeatureFlags = {
		whatsappUi: env.WHATSAPP_VERIFY_TOKEN.length > 0, // Enable if WhatsApp configured
		canIssueInvoices:
			env.INVOICING_MONEYBIRD === "true" ||
			env.INVOICING_WEFACT === "true" ||
			env.INVOICING_EB === "true",
		showMollieLinks: env.MOLLIE_API_KEY ? env.MOLLIE_API_KEY.length > 0 : false,
		calendarEnabled: true, // Calendar is generally available
		dunningMinimal: env.EMAIL_PROVIDER !== "disabled",
		pilotMode,
	};

	return baseFlags;
}

/**
 * Apply PILOT_MODE cascade to enable MVP features
 */
export function getFlags(): FeatureFlags {
	const base = computeBaseFlags();

	if (base.pilotMode) {
		// Override all flags when in pilot mode
		return {
			...base,
			whatsappUi: true,
			canIssueInvoices: true,
			showMollieLinks: true,
			calendarEnabled: true,
			dunningMinimal: true,
		};
	}

	return base;
}

/**
 * Get public flags safe for client-side exposure
 * Never exposes sensitive environment configuration
 */
export function getPublicFlags(): Pick<
	FeatureFlags,
	| "whatsappUi"
	| "canIssueInvoices"
	| "showMollieLinks"
	| "calendarEnabled"
	| "pilotMode"
> {
	const flags = getFlags();
	return {
		whatsappUi: flags.whatsappUi,
		canIssueInvoices: flags.canIssueInvoices,
		showMollieLinks: flags.showMollieLinks,
		calendarEnabled: flags.calendarEnabled,
		pilotMode: flags.pilotMode,
	};
}

/**
 * Pure computation function for testing (no env dependency)
 */
export function computeFlags(config: { pilotMode: boolean }): FeatureFlags {
	const baseFlags: FeatureFlags = {
		whatsappUi: false,
		canIssueInvoices: false,
		showMollieLinks: false,
		calendarEnabled: true,
		dunningMinimal: false,
		pilotMode: config.pilotMode,
	};

	if (config.pilotMode) {
		return {
			...baseFlags,
			whatsappUi: true,
			canIssueInvoices: true,
			showMollieLinks: true,
			calendarEnabled: true,
			dunningMinimal: true,
		};
	}

	return baseFlags;
}
