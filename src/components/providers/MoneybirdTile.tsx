import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

("use client");

interface MoneybirdTileProps {
	status: "ok" | "invalid_token" | "not_connected";
	onConnect: () => void;
	onReconnect: () => void;
	onDisconnect?: () => void;
	details?: string;
}

function getStatusBadgeVariant(
	status: MoneybirdTileProps["status"],
): "default" | "secondary" | "destructive" {
	switch (status) {
		case "ok":
			return "default";
		case "invalid_token":
			return "destructive";
		case "not_connected":
			return "secondary";
	}
}

export function MoneybirdTile({
	status,
	onConnect,
	onReconnect,
	onDisconnect,
	details,
}: MoneybirdTileProps): JSX.Element {
	const t = useTranslations();

	const renderStatusBadge = (): JSX.Element => {
		const variant = getStatusBadgeVariant(status);
		const statusKey = `providers.moneybird.health.${status}` as const;

		return <Badge variant={variant}>{t(statusKey)}</Badge>;
	};

	const renderActions = (): JSX.Element => {
		switch (status) {
			case "not_connected":
				return (
					<Button onClick={onConnect} className="flex items-center gap-2">
						<ExternalLink className="h-4 w-4" />
						{t("providers.moneybird.connect")}
					</Button>
				);
			case "invalid_token":
				return (
					<div className="space-y-2">
						<Button
							onClick={onReconnect}
							variant="destructive"
							className="flex items-center gap-2"
						>
							<ExternalLink className="h-4 w-4" />
							{t("providers.moneybird.reconnect")}
						</Button>
						<p className="text-sm text-muted-foreground">
							{t("providers.moneybird.reconnectHelper")}
						</p>
					</div>
				);
			case "ok":
				return (
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								onClick={() => window.open("https://moneybird.com", "_blank")}
								className="flex items-center gap-2"
							>
								<ExternalLink className="h-4 w-4" />
								{t("providers.moneybird.openDashboard")}
							</Button>
							{onDisconnect && (
								<Button variant="ghost" onClick={onDisconnect} size="sm">
									{t("providers.moneybird.disconnect")}
								</Button>
							)}
						</div>
						{details && (
							<p className="text-sm text-muted-foreground">{details}</p>
						)}
					</div>
				);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<CardTitle className="flex items-center gap-2">
						{t("providers.moneybird.title")}
						{renderStatusBadge()}
					</CardTitle>
					<CardDescription>
						{t("providers.moneybird.description")}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent>{renderActions()}</CardContent>
		</Card>
	);
}
