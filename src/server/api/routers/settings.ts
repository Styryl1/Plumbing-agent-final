import { getPublicFlags } from "~/lib/feature-flags";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
	/**
	 * Get public feature flags safe for client-side exposure
	 * No sensitive environment configuration is exposed
	 */
	getPublicFlags: publicProcedure.query(() => {
		return getPublicFlags();
	}),
});
