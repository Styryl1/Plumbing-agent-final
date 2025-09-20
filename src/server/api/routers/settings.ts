import { getPublicFlagsForOrg } from "~/lib/feature-flags";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
	/**
	 * Get feature flags scoped to the current organisation
	 */
	getPublicFlags: protectedProcedure.query(async ({ ctx }) => {
		const flags = await getPublicFlagsForOrg({
			db: ctx.db,
			orgId: ctx.auth.orgId,
		});
		return flags;
	}),
});
