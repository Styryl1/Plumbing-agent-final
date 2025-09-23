"use client";

import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { api } from "~/lib/trpc/client";

/**
 * Small banner displayed at the top when PILOT_MODE is active
 * Shows only when pilotMode flag is true from server
 */
export default function PilotModeBanner(): JSX.Element | null {
	const auth = useAuth();
	const t = useTranslations();
	const shouldFetch = auth.isLoaded && auth.isSignedIn && Boolean(auth.orgId);
	const { data: flags, isLoading } = api.settings.getPublicFlags.useQuery(
		undefined,
		{
			enabled: shouldFetch,
			retry: false,
		},
	);

	// Skip entirely when unauthenticated/without org context
	if (!shouldFetch) {
		return null;
	}

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
