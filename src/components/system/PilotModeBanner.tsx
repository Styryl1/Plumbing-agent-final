"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { api } from "~/lib/trpc/client";

/**
 * Small banner displayed at the top when PILOT_MODE is active
 * Shows only when pilotMode flag is true from server
 */
export default function PilotModeBanner(): JSX.Element | null {
	const t = useTranslations();
	const { data: flags, isLoading } = api.settings.getPublicFlags.useQuery();

	// Don't render until flags are loaded or if pilot mode is not active
	if (isLoading || !flags?.pilotMode) {
		return null;
	}

	return (
		<div className="w-full bg-amber-100 border-b border-amber-200 text-amber-800 text-center py-2 px-4 text-sm">
			<strong>{t("launch.pilot.banner.title")}</strong> —{" "}
			{t("launch.pilot.banner.subtitle")}
		</div>
	);
}
