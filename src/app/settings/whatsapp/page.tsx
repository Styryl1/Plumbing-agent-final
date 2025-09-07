"use client";

import {
	AlertCircle,
	CheckCircle2,
	Phone,
	RefreshCw,
	Shield,
	Wifi,
	XCircle,
} from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { useT } from "~/i18n/client";
import { epochMs, parseZdt } from "~/lib/time";
import { api } from "~/lib/trpc/client";

export default function WhatsAppSettingsPage(): JSX.Element {
	const t = useT("settings.whatsapp");

	// Fetch current numbers and health
	const { data: numbers, refetch: refetchNumbers } =
		api.waAdmin.listNumbers.useQuery();
	const { data: health, refetch: refetchHealth } =
		api.waAdmin.health.useQuery();

	// Form state for upsert
	const [phoneNumberId, setPhoneNumberId] = useState("");
	const [label, setLabel] = useState<"business" | "control">("business");

	// Seed form state
	const [businessId, setBusinessId] = useState("");
	const [controlId, setControlId] = useState("");
	const [isSeeding, setIsSeeding] = useState(false);

	// Mutations
	const upsertMutation = api.waAdmin.upsertNumber.useMutation({
		onSuccess: () => {
			toast.success(t("upsert.success"));
			setPhoneNumberId("");
			void refetchNumbers();
		},
		onError: (error) => {
			toast.error(t("upsert.error") + ": " + error.message);
		},
	});

	const seedMutation = api.waAdmin.seedTwoNumbers.useMutation({
		onSuccess: () => {
			toast.success(t("seed.success"));
			setBusinessId("");
			setControlId("");
			void refetchNumbers();
		},
		onError: (error) => {
			toast.error(t("seed.error") + ": " + error.message);
		},
	});

	const handleUpsert = async (): Promise<void> => {
		if (!phoneNumberId) {
			toast.error(t("upsert.validation"));
			return;
		}

		await upsertMutation.mutateAsync({
			phoneNumberId,
			label,
		});
	};

	const handleSeed = async (): Promise<void> => {
		if (!businessId || !controlId) {
			toast.error(t("seed.validation"));
			return;
		}

		setIsSeeding(true);
		try {
			await seedMutation.mutateAsync({
				businessId,
				controlId,
			});
		} finally {
			setIsSeeding(false);
		}
	};

	// Health status icon
	const StatusIcon = ({ ok }: { ok: boolean }): JSX.Element => {
		return ok ? (
			<CheckCircle2 className="h-5 w-5 text-green-500" />
		) : (
			<XCircle className="h-5 w-5 text-red-500" />
		);
	};

	return (
		<div className="container max-w-4xl py-8 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">{t("title")}</h1>
				<p className="text-muted-foreground mt-2">{t("description")}</p>
			</div>

			{/* Current Mappings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Phone className="h-5 w-5" />
						{t("mappings.title")}
					</CardTitle>
					<CardDescription>{t("mappings.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{!numbers ? (
						<div className="space-y-2">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : numbers.items.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<AlertCircle className="h-8 w-8 mx-auto mb-2" />
							<p>{t("mappings.empty")}</p>
						</div>
					) : (
						<div className="space-y-2">
							{numbers.items.map((num) => (
								<div
									key={num.phoneNumberId}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div className="flex items-center gap-3">
										<Badge
											variant={
												num.label === "business" ? "default" : "secondary"
											}
										>
											{t(`mappings.label.${num.label}`)}
										</Badge>
										<code className="text-sm">{num.phoneNumberId}</code>
									</div>
									<span className="text-xs text-muted-foreground">
										{new Intl.DateTimeFormat("nl-NL").format(
											epochMs(parseZdt(num.createdAt)),
										)}
									</span>
								</div>
							))}
						</div>
					)}

					{/* Upsert Form */}
					<div className="border-t pt-4 space-y-3">
						<h4 className="font-medium text-sm">{t("upsert.title")}</h4>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label htmlFor="phoneNumberId">
									{t("upsert.phoneNumberId")}
								</Label>
								<Input
									id="phoneNumberId"
									value={phoneNumberId}
									onChange={(e) => {
										setPhoneNumberId(e.target.value);
									}}
									placeholder="15550123456"
									className="mt-1"
								/>
							</div>
							<div>
								<Label htmlFor="label">{t("upsert.label")}</Label>
								<Select
									value={label}
									onValueChange={(v) => {
										setLabel(v as "business" | "control");
									}}
								>
									<SelectTrigger className="mt-1">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="business">
											{t("mappings.label.business")}
										</SelectItem>
										<SelectItem value="control">
											{t("mappings.label.control")}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<Button
							onClick={handleUpsert}
							disabled={upsertMutation.isPending}
							className="w-full"
						>
							{upsertMutation.isPending ? (
								<RefreshCw className="h-4 w-4 animate-spin mr-2" />
							) : null}
							{t("upsert.submit")}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Webhook Health */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						{t("health.title")}
					</CardTitle>
					<CardDescription>{t("health.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					{!health ? (
						<div className="space-y-2">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : (
						<div className="space-y-3">
							<div className="flex items-center justify-between p-3 border rounded-lg">
								<div className="flex items-center gap-3">
									<StatusIcon ok={health.envOk} />
									<span className="font-medium">{t("health.env")}</span>
								</div>
								<Badge variant={health.envOk ? "default" : "destructive"}>
									{health.envOk ? t("health.ok") : t("health.missing")}
								</Badge>
							</div>

							<div className="flex items-center justify-between p-3 border rounded-lg">
								<div className="flex items-center gap-3">
									<StatusIcon ok={health.webhookOk} />
									<span className="font-medium">{t("health.webhook")}</span>
								</div>
								<Badge variant={health.webhookOk ? "default" : "destructive"}>
									{health.webhookOk ? t("health.ok") : t("health.unreachable")}
								</Badge>
							</div>

							<div className="flex items-center justify-between p-3 border rounded-lg">
								<div className="flex items-center gap-3">
									<StatusIcon ok={health.secretOk} />
									<span className="font-medium">{t("health.secret")}</span>
								</div>
								<Badge variant={health.secretOk ? "default" : "destructive"}>
									{health.secretOk ? t("health.ok") : t("health.missing")}
								</Badge>
							</div>
						</div>
					)}

					<Button
						onClick={() => void refetchHealth()}
						variant="outline"
						className="w-full mt-4"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						{t("health.refresh")}
					</Button>
				</CardContent>
			</Card>

			{/* Quick Seed */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wifi className="h-5 w-5" />
						{t("seed.title")}
					</CardTitle>
					<CardDescription>{t("seed.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div>
						<Label htmlFor="businessId">{t("seed.businessId")}</Label>
						<Input
							id="businessId"
							value={businessId}
							onChange={(e) => {
								setBusinessId(e.target.value);
							}}
							placeholder="15550123456"
							className="mt-1"
						/>
					</div>
					<div>
						<Label htmlFor="controlId">{t("seed.controlId")}</Label>
						<Input
							id="controlId"
							value={controlId}
							onChange={(e) => {
								setControlId(e.target.value);
							}}
							placeholder="15550987654"
							className="mt-1"
						/>
					</div>
					<Button
						onClick={handleSeed}
						disabled={isSeeding}
						className="w-full"
						variant="secondary"
					>
						{isSeeding ? (
							<RefreshCw className="h-4 w-4 animate-spin mr-2" />
						) : null}
						{t("seed.submit")}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
