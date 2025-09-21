import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import type { Database, Json, TablesInsert } from "~/types/supabase";

export const FEATURE_FLAG_KEY_ARRAY = [
	"intakeWhatsApp",
	"intakeVoice",
	"jobCards",
	"projectsCore",
	"projectsAdvanced",
	"manualsCopilot",
	"copilotGlobal",
	"notificationsCore",
	"gdprConsole",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEY_ARRAY)[number];

const FLAG_KEY_TO_CODE: Record<FeatureFlagKey, string> = {
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

const FLAG_CODE_TO_KEY = {
	INTAKE_WHATSAPP: "intakeWhatsApp",
	INTAKE_VOICE: "intakeVoice",
	JOB_CARDS: "jobCards",
	PROJECTS_CORE: "projectsCore",
	PROJECTS_ADVANCED: "projectsAdvanced",
	MANUALS_COPILOT: "manualsCopilot",
	COPILOT_GLOBAL: "copilotGlobal",
	NOTIFICATIONS_CORE: "notificationsCore",
	GDPR_CONSOLE: "gdprConsole",
} as const;

export const FEATURE_FLAG_KEYS: FeatureFlagKey[] = [...FEATURE_FLAG_KEY_ARRAY];

type FeatureFlagCode = keyof typeof FLAG_CODE_TO_KEY;

function isFeatureFlagCode(value: string): value is FeatureFlagCode {
	return value in FLAG_CODE_TO_KEY;
}

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

	const records = Array.isArray(data)
		? (data as Array<{
				flag: string | null;
				enabled: boolean | null;
				value: Json | null;
			}>)
		: [];

	for (const record of records) {
		const { flag, enabled } = record;
		if (typeof flag !== "string") {
			continue;
		}

		if (!isFeatureFlagCode(flag)) {
			continue;
		}

		const key = FLAG_CODE_TO_KEY[flag];

		flags[key] = Boolean(enabled);
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

export async function setOrgFeatureFlag({
	db,
	orgId,
	flag,
	enabled,
	value,
	actorId,
}: {
	db: SupabaseClient<Database>;
	orgId: string;
	flag: FeatureFlagKey;
	enabled: boolean;
	value?: Json | null;
	actorId?: string | null;
}): Promise<void> {
	const flagCode = FLAG_KEY_TO_CODE[flag];
	const normalizedValue = value ?? null;
	const actor = actorId ?? null;

	const { data: existing, error: existingError } = await db
		.from("feature_flags")
		.select("id")
		.eq("org_id", orgId)
		.eq("flag", flagCode)
		.maybeSingle();

	if (existingError) {
		throw existingError;
	}

	if (existing) {
		const { error: updateError } = await db
			.from("feature_flags")
			.update({
				enabled,
				value: normalizedValue,
				actor_id: actor,
				updated_by: actor,
			})
			.eq("org_id", orgId)
			.eq("flag", flagCode);

		if (updateError) {
			throw updateError;
		}
		return;
	}

	const insertRecord: TablesInsert<"feature_flags"> = {
		org_id: orgId,
		flag: flagCode,
		enabled,
		value: normalizedValue,
		actor_id: actor,
		created_by: actor,
		updated_by: actor,
	};

	const { error: insertError } = await db
		.from("feature_flags")
		.insert(insertRecord);

	if (insertError) {
		throw insertError;
	}
}
