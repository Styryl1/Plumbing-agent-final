import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";
import {
	type AiRecommendationDTO,
	toAiRecommendationDTO,
} from "~/server/mappers/aiRecommendation";

export const aiRouter = createTRPCRouter({
	listRecommendations: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().int().min(1).max(100).optional().default(25),
					since: z.iso.datetime().optional(),
				})
				.optional(),
		)
		.query(
			async ({
				ctx,
				input = {},
			}): Promise<{ items: AiRecommendationDTO[] }> => {
				const { db, auth } = ctx;
				const { orgId } = auth;
				const { limit = 25, since } = input;

				// Build query with org scoping (RLS will enforce this too)
				let query = db
					.from("wa_suggestions")
					.select(
						`
						*,
						conversation:wa_conversations!inner(
							id,
							phone_number,
							customer_id,
							intake_event_id
						)
					`,
					)
					.eq("org_id", orgId)
					.order("created_at", { ascending: false })
					.limit(limit);

				// Add optional since filter
				if (since) {
					query = query.gt("created_at", since);
				}

				// Execute query and unwrap results
				const suggestions = rowsOrEmpty(await query);

				// Map to DTOs with proper typing
				const items: AiRecommendationDTO[] = suggestions.map((row) => {
					// Type narrowing for the conversation join result (partial select)
					const conversation = row.conversation as
						| {
								id: string;
								phone_number: string;
								customer_id: string | null;
								intake_event_id: string | null;
						  }
						| {
								id: string;
								phone_number: string;
								customer_id: string | null;
								intake_event_id: string | null;
						  }[]
						| null
						| undefined;

					// Extract single conversation from array if needed
					const conv = Array.isArray(conversation)
						? conversation[0]
						: conversation;

					// Create a partial conversation object that matches what mapper expects
					const partialConv = conv
						? ({
								id: conv.id,
								phone_number: conv.phone_number,
								customer_id: conv.customer_id,
								intake_event_id: conv.intake_event_id ?? null,
								// Add minimal required fields with defaults
								org_id: "",
								wa_contact_id: "",
								last_message_at: "",
								status: "active",
								created_at: "",
								metadata: null,
								intake_event_id: null,
								session_expires_at: null,
							} as const)
						: undefined;

					return toAiRecommendationDTO(
						row as Parameters<typeof toAiRecommendationDTO>[0],
						partialConv,
					);
				});

				return { items };
			},
		),
});
