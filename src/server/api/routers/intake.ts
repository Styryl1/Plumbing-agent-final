import { TRPCError } from "@trpc/server";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mustSingle, rowsOrEmpty } from "~/server/db/unwrap";
import { toIntakeDetail, toIntakeSummary } from "~/server/mappers/intake";
import type { IntakeDetailDTO, IntakeSummaryDTO } from "~/types/intake";
import type { Tables } from "~/types/supabase";

type IntakeWithUnscheduled = Tables<"intake_events"> & {
	unscheduled?: Array<
		Pick<Tables<"unscheduled_items">, "status" | "priority" | "id">
	> | null;
};

const listInputSchema = z
	.object({
		status: z.enum(["pending", "applied", "dismissed"]).default("pending"),
		channel: z.enum(["whatsapp", "voice"]).optional(),
		limit: z.number().int().min(1).max(100).default(25),
		cursor: z.iso.datetime().optional(),
	})
	.optional();

const intakeSelect = `
	*,
	unscheduled:unscheduled_items(
		status,
		priority,
		id
	)
`;

export const intakeRouter = createTRPCRouter({
	list: protectedProcedure
		.input(listInputSchema)
		.query(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const orgId = auth.orgId;
			const limit = input?.limit ?? 25;
			let query = db
				.from("intake_events")
				.select(intakeSelect)
				.eq("org_id", orgId)
				.order("received_at", { ascending: false })
				.limit(limit + 1);

			if (typeof input?.status === "string") {
				query = query.eq("unscheduled_items.status", input.status);
			}

			if (typeof input?.channel === "string") {
				query = query.eq("channel", input.channel);
			}

			if (input?.cursor !== undefined) {
				query = query.lt("received_at", input.cursor);
			}

			const listResponse = await query;
			const rows = rowsOrEmpty<IntakeWithUnscheduled>({
				data: listResponse.data as IntakeWithUnscheduled[] | null,
				error: listResponse.error,
			});
			const hasMore = rows.length > limit;
			const summaries: IntakeSummaryDTO[] = (
				hasMore ? rows.slice(0, limit) : rows
			).map(toIntakeSummary);
			const nextCursor =
				hasMore && summaries.length > 0
					? summaries[summaries.length - 1]!.receivedAtIso
					: null;

			return {
				items: summaries,
				nextCursor,
			};
		}),

	get: protectedProcedure
		.input(z.object({ intakeEventId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			try {
				const singleResponse = await db
					.from("intake_events")
					.select(intakeSelect)
					.eq("org_id", auth.orgId)
					.eq("id", input.intakeEventId)
					.maybeSingle();
				const record = mustSingle<IntakeWithUnscheduled>({
					data: singleResponse.data as IntakeWithUnscheduled | null,
					error: singleResponse.error,
				});
				const detailDto: IntakeDetailDTO = toIntakeDetail(record);
				return detailDto;
			} catch (error) {
				if (error instanceof Error && error.message === "Row not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Intake not found",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}),

	setStatus: protectedProcedure
		.input(
			z.object({
				intakeEventId: z.uuid(),
				status: z.enum(["pending", "applied", "dismissed"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			let unscheduledRow: Pick<Tables<"unscheduled_items">, "id">;
			try {
				const unscheduledResponse = await db
					.from("unscheduled_items")
					.select("id")
					.eq("org_id", auth.orgId)
					.eq("intake_event_id", input.intakeEventId)
					.maybeSingle();
				unscheduledRow = mustSingle<Pick<Tables<"unscheduled_items">, "id">>({
					data: unscheduledResponse.data as Pick<
						Tables<"unscheduled_items">,
						"id"
					> | null,
					error: unscheduledResponse.error,
				});
			} catch (error) {
				if (error instanceof Error && error.message === "Row not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Unscheduled item not found",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}

			const updatedAt = Temporal.Now.instant().toString();
			const updateResult = await db
				.from("unscheduled_items")
				.update({
					status: input.status,
					updated_at: updatedAt,
				})
				.eq("id", unscheduledRow.id);

			if (updateResult.error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: updateResult.error.message,
				});
			}

			try {
				const detailResponse = await db
					.from("intake_events")
					.select(intakeSelect)
					.eq("org_id", auth.orgId)
					.eq("id", input.intakeEventId)
					.maybeSingle();
				const detailRecord = mustSingle<IntakeWithUnscheduled>({
					data: detailResponse.data as IntakeWithUnscheduled | null,
					error: detailResponse.error,
				});
				return toIntakeSummary(detailRecord);
			} catch (error) {
				if (error instanceof Error && error.message === "Row not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Intake not found",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}),
});
