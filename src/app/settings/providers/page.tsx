"use client";

import { Settings } from "lucide-react";
import type { JSX } from "react";
import { MoneybirdTile } from "~/components/providers/MoneybirdTile";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";

export default function ProvidersSettingsPage(): JSX.Element {
	const t = useT("providers");

	// Get Moneybird health status
	const {
		data: moneybirdHealth,
		refetch: refetchHealth,
		isLoading: isLoadingHealth,
	} = api.providers.getHealth.useQuery({
		provider: "moneybird",
	});

	// Get OAuth URL for connection
	const getAuthUrlQuery = api.providers.getAuthUrl.useQuery(
		{ provider: "moneybird" },
		{ enabled: false }, // Only run when explicitly called
	);

	// Disconnect mutation
	const disconnectMutation = api.providers.disconnect.useMutation({
		onSuccess: () => {
			void refetchHealth();
		},
	});

	const handleConnect = async (): Promise<void> => {
		try {
			const result = await getAuthUrlQuery.refetch();
			if (result.data?.authUrl) {
				// Redirect to OAuth URL
				window.location.href = result.data.authUrl;
			}
		} catch (error) {
			console.error("Failed to get auth URL:", error);
		}
	};

	const handleReconnect = async (): Promise<void> => {
		// Same as connect - will overwrite existing credentials
		await handleConnect();
	};

	const handleDisconnect = async (): Promise<void> => {
		try {
			await disconnectMutation.mutateAsync({ provider: "moneybird" });
		} catch (error) {
			console.error("Failed to disconnect:", error);
		}
	};

	const getMoneybirdStatus = (): "ok" | "invalid_token" | "not_connected" => {
		if (isLoadingHealth) return "not_connected";
		return moneybirdHealth?.status ?? "not_connected";
	};

	return (
		<div className="container mx-auto py-8 space-y-6">
			<div>
				<h1 className="text-3xl font-bold flex items-center gap-2">
					<Settings className="h-8 w-8" />
					{t("panel.title")}
				</h1>
				<p className="text-muted-foreground mt-2">{t("panel.description")}</p>
			</div>

			{/* Overview Card */}
			<Card>
				<CardHeader>
					<CardTitle>{t("panel.title")}</CardTitle>
					<CardDescription>{t("panel.note")}</CardDescription>
				</CardHeader>
			</Card>

			{/* Provider Tiles */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<MoneybirdTile
					status={getMoneybirdStatus()}
					onConnect={handleConnect}
					onReconnect={handleReconnect}
					onDisconnect={handleDisconnect}
					{...(moneybirdHealth?.details && { details: moneybirdHealth.details })}
				/>

				{/* Future provider tiles */}
				<Card className="opacity-60">
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							{t("wefact.title")}
							<span className="text-sm text-muted-foreground">
								{t("states.needs_action")}
							</span>
						</CardTitle>
						<CardDescription>{t("wefact.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{t("comingSoon")}
						</p>
					</CardContent>
				</Card>

				<Card className="opacity-60">
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							{t("eboekhouden.title")}
							<span className="text-sm text-muted-foreground">
								{t("states.needs_action")}
							</span>
						</CardTitle>
						<CardDescription>{t("eboekhouden.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{t("comingSoon")}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}