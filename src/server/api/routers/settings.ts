import { z } from "zod";
import { logAuditEvent } from "~/lib/audit";
import type { FeatureFlagKey } from "~/lib/feature-flags";
import {
	FEATURE_FLAG_KEYS,
	getPublicFlagsForOrg,
	setOrgFeatureFlag,
} from "~/lib/feature-flags";
import type { Json } from "~/types/supabase";
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

	setFeatureFlag: protectedProcedure
		.input(
			z.object({
				flag: z.enum(
					FEATURE_FLAG_KEYS as [FeatureFlagKey, ...FeatureFlagKey[]],
				),
				enabled: z.boolean(),
				value: z
					.union([
						z.boolean(),
						z.string(),
						z.number(),
						z.record(z.string(), z.unknown()),
						z.null(),
					])
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const flag: FeatureFlagKey = input.flag;
			const jsonValue = (input.value ?? null) as Json | null;
			await setOrgFeatureFlag({
				db: ctx.db,
				orgId: ctx.auth.orgId,
				flag,
				enabled: input.enabled,
				value: jsonValue,
				actorId: ctx.auth.userId,
			});

			await logAuditEvent(ctx.db, {
				orgId: ctx.auth.orgId,
				userId: ctx.auth.userId,
				action: "update",
				resource: "organization",
				resourceId: ctx.auth.orgId,
				summary: `feature_flag.${flag}.${input.enabled ? "enabled" : "disabled"}`,
				metadata: {
					flag,
					enabled: input.enabled,
					value: jsonValue,
				},
			});

			return getPublicFlagsForOrg({
				db: ctx.db,
				orgId: ctx.auth.orgId,
			});
		}),
});
