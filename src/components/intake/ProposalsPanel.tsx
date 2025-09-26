"use client";

import { skipToken } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { formatDutchDateTime, formatDutchTime } from "~/lib/dates";
import { api } from "~/lib/trpc/client";

interface ProposalsPanelProps {
	intakeId: string | null;
}

interface SlotOption {
	id: string;
	start: string;
	end: string;
	expiresAt: string;
	resourceId: string | null;
}

const euro = new Intl.NumberFormat("nl-NL", {
	style: "currency",
	currency: "EUR",
	maximumFractionDigits: 2,
});

const resolveErrorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof Error && typeof error.message === "string") {
		const trimmed = error.message.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}
	return fallback;
};

export function ProposalsPanel({ intakeId }: ProposalsPanelProps): JSX.Element {
	const t = useTranslations();
	const utils = api.useUtils();
	const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
	const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
	const [isDialogOpen, setDialogOpen] = useState(false);

	const listQuery = api.proposals.listByIntake.useQuery(
		intakeId ? { intakeId } : skipToken,
		{ refetchInterval: 30_000, staleTime: 10_000 },
	);

	const createMutation = api.proposals.createFromIntake.useMutation({
		onSuccess: async () => {
			if (!intakeId) return;
			await utils.proposals.listByIntake.invalidate({ intakeId });
		},
		onError: (error) => {
			toast.error(
				resolveErrorMessage(
					error,
					t("intake.console.proposals.error.generate"),
				),
			);
		},
	});

	const applyMutation = api.proposals.applyProposal.useMutation({
		onSuccess: async () => {
			if (!intakeId) return;
			toast.success(t("intake.console.proposals.apply.success"));
			setDialogOpen(false);
			setSelectedSlotId(null);
			setActiveProposalId(null);
			await utils.proposals.listByIntake.invalidate({ intakeId });
			await utils.intake.list.invalidate({ status: "pending" });
		},
		onError: (error) => {
			toast.error(
				resolveErrorMessage(error, t("intake.console.proposals.apply.error")),
			);
		},
	});

	const dismissMutation = api.proposals.dismiss.useMutation({
		onSuccess: async () => {
			if (!intakeId) return;
			await utils.proposals.listByIntake.invalidate({ intakeId });
		},
		onError: (error) => {
			toast.error(
				resolveErrorMessage(error, t("intake.console.proposals.dismiss.error")),
			);
		},
	});

	const proposals = useMemo(
		() => listQuery.data?.items ?? [],
		[listQuery.data],
	);

	const selectedProposal = useMemo(() => {
		if (activeProposalId == null) return null;
		return (
			proposals.find((proposal) => proposal.id === activeProposalId) ?? null
		);
	}, [activeProposalId, proposals]);

	const openApplyDialog = (proposalId: string, slots: SlotOption[]): void => {
		setActiveProposalId(proposalId);
		const firstSlot = slots[0];
		setSelectedSlotId(firstSlot ? firstSlot.id : null);
		setDialogOpen(true);
	};

	const handleApplyConfirm = async (): Promise<void> => {
		if (!selectedSlotId || !activeProposalId) return;
		await applyMutation.mutateAsync({
			proposalId: activeProposalId,
			slotId: selectedSlotId,
		});
	};

	return (
		<Card>
			<CardHeader className="flex items-center justify-between gap-2 border-b">
				<CardTitle className="text-sm font-semibold">
					{t("intake.console.proposals.title")}
				</CardTitle>
				<Button
					size="sm"
					disabled={!intakeId || createMutation.isPending}
					onClick={() => {
						if (!intakeId) return;
						createMutation.mutate({ intakeId });
					}}
				>
					{createMutation.isPending ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : null}
					{t("intake.console.proposals.generate")}
				</Button>
			</CardHeader>
			<CardContent className="space-y-3 p-0">
				{!intakeId ? (
					<div className="flex flex-col items-center justify-center space-y-2 py-10 text-sm text-muted-foreground">
						<AlertCircle className="h-5 w-5" />
						<p>{t("intake.console.proposals.empty.noIntake")}</p>
					</div>
				) : listQuery.isLoading ? (
					<div className="space-y-2 p-4">
						{Array.from({ length: 2 }).map((_, index) => (
							<div
								key={`proposal-skeleton-${index}`}
								className="h-24 animate-pulse rounded-md bg-muted"
							/>
						))}
					</div>
				) : proposals.length === 0 ? (
					<div className="flex flex-col items-center justify-center space-y-2 py-10 text-sm text-muted-foreground">
						<AlertCircle className="h-5 w-5" />
						<p>{t("intake.console.proposals.empty.noProposals")}</p>
					</div>
				) : (
					<ul className="space-y-3 p-4">
						{proposals.map((proposal) => {
							const blocked = proposal.status !== "new";
							const canApply =
								!blocked &&
								proposal.confidence >= 0.7 &&
								proposal.holds.length > 0;
							const needsReview = !blocked && proposal.confidence < 0.7;
							const amount = euro.format(
								proposal.payload.job.estimateCents.max / 100,
							);
							const minAmount = euro.format(
								proposal.payload.job.estimateCents.min / 100,
							);

							return (
								<li key={proposal.id} className="rounded-lg border bg-card">
									<div className="flex items-start justify-between gap-2 border-b px-4 py-3">
										<div>
											<h3 className="text-sm font-semibold">
												{proposal.payload.job.title}
											</h3>
											<p className="text-xs text-muted-foreground">
												{t("intake.console.proposals.estimate", {
													min: minAmount,
													max: amount,
												})}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												variant={needsReview ? "secondary" : "default"}
												className="text-xs font-medium"
											>
												{t("intake.console.proposals.confidence")}:{" "}
												{(proposal.confidence * 100).toFixed(0)}%
											</Badge>
											{blocked ? (
												<Check className="h-4 w-4 text-success" />
											) : null}
										</div>
									</div>
									<div className="space-y-2 px-4 py-3 text-xs text-muted-foreground">
										<p>{proposal.payload.job.description}</p>
										<div>
											<p className="font-medium text-foreground">
												{t("intake.console.proposals.slots")}
											</p>
											<ul className="mt-1 space-y-1">
												{proposal.holds.map((hold) => (
													<li key={hold.id}>
														{formatDutchDateTime(hold.start)} →{" "}
														{formatDutchTime(hold.end)}
													</li>
												))}
											</ul>
										</div>
									</div>
									<div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3">
										<Button
											variant="outline"
											size="sm"
											disabled={blocked || dismissMutation.isPending}
											onClick={() => {
												void dismissMutation.mutateAsync({
													proposalId: proposal.id,
												});
											}}
										>
											{dismissMutation.isPending &&
											activeProposalId === proposal.id ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : null}
											{t("intake.console.proposals.dismiss.label")}
										</Button>
										<Button
											size="sm"
											disabled={!canApply || applyMutation.isPending}
											onClick={() => {
												if (!canApply) return;
												openApplyDialog(
													proposal.id,
													proposal.holds as SlotOption[],
												);
											}}
										>
											{applyMutation.isPending &&
											activeProposalId === proposal.id ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : null}
											{needsReview
												? t("intake.console.proposals.needs_review")
												: t("intake.console.proposals.apply.label")}
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>

			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setDialogOpen(false);
						setActiveProposalId(null);
						setSelectedSlotId(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("intake.console.proposals.pick_slot")}</DialogTitle>
					</DialogHeader>
					{selectedProposal ? (
						<RadioGroup
							value={selectedSlotId}
							onValueChange={(value) => {
								setSelectedSlotId(value);
							}}
							className="space-y-2"
						>
							{selectedProposal.holds.map((hold) => (
								<div
									key={hold.id}
									className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
								>
									<div>
										<Label
											htmlFor={`slot-${hold.id}`}
											className="text-sm font-medium"
										>
											{formatDutchDateTime(hold.start)} →{" "}
											{formatDutchTime(hold.end)}
										</Label>
										<p className="text-xs text-muted-foreground">
											{t("intake.console.proposals.expires", {
												when: formatDutchDateTime(hold.expiresAt),
											})}
										</p>
									</div>
									<RadioGroupItem value={hold.id} id={`slot-${hold.id}`} />
								</div>
							))}
						</RadioGroup>
					) : null}

					<DialogFooter className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setDialogOpen(false);
								setSelectedSlotId(null);
								setActiveProposalId(null);
							}}
						>
							{t("intake.console.proposals.cancel")}
						</Button>
						<Button
							onClick={() => {
								void handleApplyConfirm();
							}}
							disabled={!selectedSlotId || applyMutation.isPending}
						>
							{applyMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{t("intake.console.proposals.apply.label")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
