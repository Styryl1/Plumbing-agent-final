import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { Temporal } from "temporal-polyfill";
import { logAuditEvent } from "~/lib/audit";
import { AiRunCreateSchema } from "~/schema/ai";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { Database, Json, TablesInsert } from "~/types/supabase";

type AiLearningEventInsert = {
	org_id: string;
	ai_run_id: string;
	event_type: string;
	before: Json;
	after: Json;
	plumber_id: string | null;
	created_at?: string;
};

function toJson(value: unknown): Json {
	return value as Json;
}

type ExtendedDatabase = Database & {
	public: Database["public"] & {
		Tables: Database["public"]["Tables"] & {
			ai_learning_events: {
				Row: { id: string };
				Insert: AiLearningEventInsert;
				Update: Partial<AiLearningEventInsert>;
				Relationships: [];
			};
		};
	};
};

export const aiBrainRouter = createTRPCRouter({
	recordRun: protectedProcedure
		.input(AiRunCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;

			const runInsert: TablesInsert<"ai_runs"> = {
				org_id: auth.orgId,
				conversation_id: input.conversationId ?? null,
				customer_id: input.customerId ?? null,
				job_id: input.jobId ?? null,
				input: toJson(input.input),
				output: toJson(input.output),
				model: input.model,
				latency_ms: input.latencyMs,
				cost_cents: input.costCents ?? null,
			};

			const { data: runRow, error: runError } = await db
				.from("ai_runs")
				.insert(runInsert)
				.select("id")
				.single();

			const hasRunError = typeof runError === "object" && runError !== null;
			const runData = runRow;
			if (hasRunError || runData == null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to persist AI run",
					...(hasRunError ? { cause: runError } : {}),
				});
			}

			const runId = runData.id;
			let learningEventId: string | undefined;

			if (input.learningEvent) {
				const beforePayload = input.learningEvent.before ?? input.output;
				const eventInsert: AiLearningEventInsert = {
					org_id: auth.orgId,
					ai_run_id: runId,
					event_type: input.learningEvent.type,
					before: toJson(beforePayload),
					after: toJson(input.learningEvent.after),
					plumber_id: auth.userId,
					created_at: Temporal.Now.instant().toString(),
				};

				const learningDb = db as SupabaseClient<ExtendedDatabase>;
				const { data: learningRows, error: learningError } = await learningDb
					.from("ai_learning_events")
					.insert(eventInsert)
					.select("id")
					.limit(1);

				if (!learningError && Array.isArray(learningRows)) {
					const [firstRow] = learningRows;
					if (firstRow && typeof firstRow.id === "string") {
						learningEventId = firstRow.id;
					}
				}
			}

			await logAuditEvent(db, {
				orgId: auth.orgId,
				userId: auth.userId,
				action: "create",
				resource: "whatsapp_conversation",
				resourceId: input.conversationId ?? runId,
				eventType: "ai.run.create",
				actorRole: auth.role,
				summary: "ai_run.create",
				metadata: {
					runId,
					...(learningEventId !== undefined ? { learningEventId } : {}),
					model: input.model,
					latencyMs: input.latencyMs,
					...(input.costCents !== undefined
						? { costCents: input.costCents }
						: {}),
				},
				after: {
					output: input.output,
				},
			});

			return {
				runId,
				learningEventId,
			};
		}),
});
