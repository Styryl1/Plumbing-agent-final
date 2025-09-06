// import { TRPCError } from "@trpc/server"; // not used
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const aiRouter = createTRPCRouter({
	listRecommendations: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().int().min(1).max(100).optional().default(50),
				})
				.optional(),
		)
		.query((): [] => {
			// TODO: Re-implement when ai_recommendations table is restored
			// Temporary: Return empty array until ai_recommendations table is restored
			return [];
		}),
});
