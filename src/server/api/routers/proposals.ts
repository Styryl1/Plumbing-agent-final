import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { logAiProposalAudit } from "~/lib/audit";
import { assertOrgRole } from "~/lib/authz";
import { toDbStatus } from "~/lib/job-status";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";
import { AiProposal, type TAiProposal } from "~/server/schemas/aiProposal";
import { generateProposalFromIntake } from "~/server/services/intake/propose";
import {
	releaseHoldsByIds,
	releaseHoldsForProposal,
} from "~/server/services/scheduling/slotHolds";
import type { Database, TableRow, TablesInsert } from "~/types/supabase";

const uuidSchema = z
	.string()
	.regex(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		"Invalid uuid",
	);

const createFromIntakeInput = z.object({
	intakeId: uuidSchema,
});

const listByIntakeInput = z.object({
	intakeId: uuidSchema,
});

const applyInput = z.object({
	proposalId: uuidSchema,
	slotId: uuidSchema,
});

const dismissInput = z.object({
	proposalId: uuidSchema,
});

type ProposalRow = TableRow<"ai_proposals"> & {
	slot_holds?: TableRow<"slot_holds">[] | null;
};

type ProposalDto = {
	id: string;
	status: ProposalRow["status"];
	confidence: number;
	locale: string;
	createdAt: string;
	payload: TAiProposal;
	holds: Array<{
		id: string;
		start: string;
		end: string;
		expiresAt: string;
		resourceId: string | null;
		reason: string | null;
	}>;
};

function parsePayload(row: ProposalRow): TAiProposal {
	const parsed = AiProposal.safeParse(row.payload);
	if (!parsed.success) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Proposal payload invalid",
		});
	}
	return parsed.data;
}

function toDto(row: ProposalRow): ProposalDto {
	const payload = parsePayload(row);
	const holds = Array.isArray(row.slot_holds) ? row.slot_holds : [];

	return {
		id: row.id,
		status: row.status,
		confidence: row.confidence,
		locale: row.locale,
		createdAt: row.created_at,
		payload,
		holds: holds.map((hold) => ({
			id: hold.id,
			start: hold.start_ts,
			end: hold.end_ts,
			expiresAt: hold.expires_at,
			resourceId: hold.resource_id,
			reason: hold.reason,
		})),
	};
}

function urgencyToPriority(urgency: TAiProposal["job"]["urgency"]): string {
	switch (urgency) {
		case "emergency":
			return "emergency";
		case "urgent":
			return "urgent";
		case "soon":
			return "normal";
		case "schedule":
		default:
			return "normal";
	}
}

function buildJobDescription(payload: TAiProposal): string {
	const description = payload.job.description.trim();
	const parts: string[] = description.length > 0 ? [description] : [];

	if (payload.checklist.length !== 0) {
		parts.push(
			`Checklist:\n${payload.checklist.map((item) => `• ${item}`).join("\n")}`,
		);
	}

	if (payload.cautions.length !== 0) {
		parts.push(
			`Let op:\n${payload.cautions.map((item) => `• ${item}`).join("\n")}`,
		);
	}

	if (payload.job.materials.length !== 0) {
		const materialLines = payload.job.materials.map((material) => {
			const unit =
				typeof material.unit === "string" && material.unit.length > 0
					? ` ${material.unit}`
					: "";
			return `• ${material.name} × ${material.quantity}${unit}`;
		});
		parts.push(`Materialen:\n${materialLines.join("\n")}`);
	}

	return parts.join("\n\n");
}

async function fetchProposal(
	db: DatabaseClient,
	orgId: string,
	proposalId: string,
): Promise<ProposalRow> {
	const response = await db
		.from("ai_proposals")
		.select("*, slot_holds:slot_holds(*)")
		.eq("org_id", orgId)
		.eq("id", proposalId)
		.maybeSingle();

	if (response.error !== null) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
	}

	if (response.data === null) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
	}

	return response.data as ProposalRow;
}

type DatabaseClient = SupabaseClient<Database>;

export const proposalsRouter = createTRPCRouter({
	createFromIntake: protectedProcedure
		.input(createFromIntakeInput)
		.mutation(async ({ ctx, input }) => {
			const { auth, db, timezone } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);

			const result = await generateProposalFromIntake({
				db,
				orgId: auth.orgId,
				userId: auth.userId,
				intakeId: input.intakeId,
				timezone,
			});

			return {
				proposal: toDto({
					...result.proposal,
					slot_holds: result.holds,
				} as ProposalRow),
			};
		}),

	listByIntake: protectedProcedure
		.input(listByIntakeInput)
		.query(async ({ ctx, input }) => {
			const { auth, db } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);

			const response = await db
				.from("ai_proposals")
				.select("*, slot_holds:slot_holds(*)")
				.eq("org_id", auth.orgId)
				.eq("intake_id", input.intakeId)
				.order("created_at", { ascending: false });

			const rows = rowsOrEmpty<ProposalRow>({
				data: response.data as ProposalRow[] | null,
				error: response.error,
			});

			return {
				items: rows.map(toDto),
			};
		}),

	applyProposal: protectedProcedure
		.input(applyInput)
		.mutation(async ({ ctx, input }) => {
			const { auth, db } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);

			const proposalRow = await fetchProposal(db, auth.orgId, input.proposalId);
			if (proposalRow.status !== "new") {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Proposal already processed",
				});
			}

			const payload = parsePayload(proposalRow);
			if (payload.confidence < 0.7) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Proposal confidence below threshold",
				});
			}

			const holds = Array.isArray(proposalRow.slot_holds)
				? proposalRow.slot_holds
				: [];

			const selectedHold = holds.find((hold) => hold.id === input.slotId);
			if (!selectedHold) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Selected slot not found",
				});
			}

			if (
				Temporal.Instant.compare(
					Temporal.Now.instant(),
					Temporal.Instant.from(selectedHold.expires_at),
				) > 0
			) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Slot hold expired",
				});
			}

			if (!proposalRow.customer_id) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Proposal is missing customer context",
				});
			}

			const jobInsert: TablesInsert<"jobs"> = {
				org_id: auth.orgId,
				customer_id: proposalRow.customer_id,
				title: payload.job.title,
				description: buildJobDescription(payload),
				starts_at: selectedHold.start_ts,
				ends_at: selectedHold.end_ts,
				status: toDbStatus("planned"),
				priority: urgencyToPriority(payload.job.urgency),
				address: null,
				...(selectedHold.resource_id
					? { employee_id: selectedHold.resource_id }
					: {}),
			};

			const jobResponse = await db
				.from("jobs")
				.insert(jobInsert)
				.select("id")
				.single();

			if (jobResponse.error !== null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create job draft",
				});
			}

			const insertedJob = jobResponse.data;
			const jobId = insertedJob.id;

			const otherHoldIds = holds
				.filter((hold) => hold.id !== selectedHold.id)
				.map((hold) => hold.id);

			if (otherHoldIds.length > 0) {
				await releaseHoldsByIds({
					db,
					orgId: auth.orgId,
					holdIds: otherHoldIds,
					reason: "applied_other",
					userId: auth.userId,
				});
			}

			await releaseHoldsByIds({
				db,
				orgId: auth.orgId,
				holdIds: [selectedHold.id],
				reason: "converted_to_booking",
				userId: auth.userId,
			});

			await db
				.from("ai_proposals")
				.update({ status: "applied" })
				.eq("org_id", auth.orgId)
				.eq("id", proposalRow.id);

			if (proposalRow.intake_id !== null) {
				await db
					.from("unscheduled_items")
					.update({
						status: "applied",
						job_id: jobId,
					})
					.eq("org_id", auth.orgId)
					.eq("intake_event_id", proposalRow.intake_id)
					.eq("status", "pending");
			}

			await logAiProposalAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "create",
				eventType: "ai.proposal.applied",
				proposalId: proposalRow.id,
				metadata: {
					jobId,
					slotId: selectedHold.id,
					confidence: payload.confidence,
				},
				after: {
					jobTitle: payload.job.title,
					startsAt: selectedHold.start_ts,
					endsAt: selectedHold.end_ts,
				},
			});

			return { jobId };
		}),

	dismiss: protectedProcedure
		.input(dismissInput)
		.mutation(async ({ ctx, input }) => {
			const { auth, db } = ctx;
			assertOrgRole(auth.role, ["owner", "admin", "staff"]);

			const proposalRow = await fetchProposal(db, auth.orgId, input.proposalId);
			if (proposalRow.status !== "new") {
				return { status: proposalRow.status };
			}

			await db
				.from("ai_proposals")
				.update({ status: "dismissed" })
				.eq("org_id", auth.orgId)
				.eq("id", proposalRow.id);

			await releaseHoldsForProposal({
				db,
				orgId: auth.orgId,
				proposalId: proposalRow.id,
				reason: "dismissed",
				userId: auth.userId,
			});

			await logAiProposalAudit(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "update",
				eventType: "ai.proposal.dismissed",
				proposalId: proposalRow.id,
			});

			return { status: "dismissed" as const };
		}),
});
