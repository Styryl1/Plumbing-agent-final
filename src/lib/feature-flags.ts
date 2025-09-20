import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import type { Database } from "~/types/supabase";

const FLAG_KEY_TO_CODE = {
	intakeWhatsApp: "INTAKE_WHATSAPP",
	intakeVoice: "INTAKE_VOICE",
	jobCards: "JOB_CARDS",
	projectsCore: "PROJECTS_CORE",
	projectsAdvanced: "PROJECTS_ADVANCED",
	manualsCopilot: "MANUALS_COPILOT",
	copilotGlobal: "COPILOT_GLOBAL",
	notificationsCore: "NOTIFICATIONS_CORE",
	gdprConsole: "GDPR_CONSOLE",
} as const;

type OrgFeatureFlagRow = {
	flag: string;
	enabled: boolean;
};

const FLAG_CODE_TO_KEY = Object.fromEntries(
	Object.entries(FLAG_KEY_TO_CODE).map(([key, value]) => [value, key]),
) as Record<
	(typeof FLAG_KEY_TO_CODE)[keyof typeof FLAG_KEY_TO_CODE],
	keyof typeof FLAG_KEY_TO_CODE
>;

export type FeatureFlagKey = keyof typeof FLAG_KEY_TO_CODE;

export type FeatureFlags = {
	[K in FeatureFlagKey]: boolean;
} & {
	pilotMode: boolean;
};

function pilotModeEnabled(): boolean {
	return env.PILOT_MODE === "true";
}

function getDefaultFlags(): FeatureFlags {
	const pilotMode = pilotModeEnabled();

	return {
		intakeWhatsApp: true,
		intakeVoice: true,
		jobCards: true,
		projectsCore: true,
		projectsAdvanced: pilotMode,
		manualsCopilot: true,
		copilotGlobal: true,
		notificationsCore: true,
		gdprConsole: true,
		pilotMode,
	};
}

function applyPilotCascade(flags: FeatureFlags): FeatureFlags {
	if (flags.pilotMode) {
		flags.projectsAdvanced = true;
	}

	return flags;
}

export async function getOrgFeatureFlags({
	db,
	orgId,
}: {
	db: SupabaseClient<Database>;
	orgId: string;
}): Promise<FeatureFlags> {
	const pilotMode = pilotModeEnabled();
	const defaults = getDefaultFlags();
	const flags: FeatureFlags = { ...defaults };

	const { data, error } = await db.rpc("get_org_feature_flags", {
		p_org_id: orgId,
		p_pilot_mode: pilotMode,
	});

	if (error) {
		console.error("Failed to load feature flags", error);
		return applyPilotCascade(flags);
	}

	for (const record of data ?? []) {
		const key = FLAG_CODE_TO_KEY[record.flag as keyof typeof FLAG_CODE_TO_KEY];
		if (!key) {
			continue;
		}

		flags[key] = Boolean(record.enabled);
	}

	flags.pilotMode = pilotMode;
	return applyPilotCascade(flags);
}

export async function getPublicFlagsForOrg(args: {
	db: SupabaseClient<Database>;
	orgId: string;
}): Promise<FeatureFlags> {
	return getOrgFeatureFlags(args);
}

export function computeFlags(config: {
	pilotMode: boolean;
	overrides?: Partial<Record<FeatureFlagKey, boolean>>;
}): FeatureFlags {
	const pilotMode = config.pilotMode;
	const defaults: FeatureFlags = {
		intakeWhatsApp: true,
		intakeVoice: true,
		jobCards: true,
		projectsCore: true,
		projectsAdvanced: pilotMode,
		manualsCopilot: true,
		copilotGlobal: true,
		notificationsCore: true,
		gdprConsole: true,
		pilotMode,
	};

	const withOverrides = {
		...defaults,
		...(config.overrides ?? {}),
	};

	return applyPilotCascade(withOverrides);
}
