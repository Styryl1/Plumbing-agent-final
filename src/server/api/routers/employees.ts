import { useTranslations } from "next-intl";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const employeesRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z
				.object({
					q: z.string().trim().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			let query = db
				.from("employees")
				.select("id, name, color")
				.eq("org_id", orgId)
				.eq("active", true)
				.order("name", { ascending: true });

			// Optional case-insensitive filter by name
			if (input?.q) {
				query = query.ilike("name", `%${input.q}%`);
			}

			const { data, error } = await query;

			if (error) {
				console.error("Supabase employees.list error:", {
					message: error.message,
					details: error.details,
					hint: error.hint,
					code: error.code,
					orgId,
					userId: ctx.auth.userId,
				});
				throw new Error(`Failed to fetch employees: ${error.message}`);
			}

			return data.map((e) => ({
				id: e.id,
				name: e.name,
				color: e.color ?? null,
			}));
		}),
});
