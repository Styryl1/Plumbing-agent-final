import "server-only";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import "~/lib/time";
import { createProviderCredentialsService } from "~/server/db/provider-credentials";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Input schema for API key-based provider connection
const ConnectWithApiKeySchema = z.object({
	provider: z.enum(["wefact", "eboekhouden"]),
	access_token: z.string().min(1, { error: "API sleutel is vereist" }),
	baseUrl: z.url().optional(),
	scopes: z.array(z.string()).default([]),
});

export const providersRouter = createTRPCRouter({
	/**
	 * Connect provider with API key authentication
	 * Used for providers that don't require OAuth2 flow (WeFact, e-Boekhouden)
	 */
	connectWithApiKey: protectedProcedure
		.input(ConnectWithApiKeySchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const credentialsService = createProviderCredentialsService(
					ctx.db,
					ctx.auth.orgId,
				);

				// For API key providers, we store the key as access_token
				// and set a far future expiry date since API keys don't expire
				const farFutureExpiry = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
					.add({ years: 10 })
					.toString();

				await credentialsService.upsertCredentials(input.provider, {
					provider: input.provider,
					access_token: input.access_token,
					refresh_token: "", // Not used for API key providers
					expires_at: farFutureExpiry,
					scopes: input.scopes,
					administration_id: input.baseUrl, // Store baseUrl in administration_id if provided
				});

				return { success: true, provider: input.provider };
			} catch (error) {
				console.error(`Failed to connect ${input.provider}:`, error);

				if (error instanceof Error) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: error.message,
					});
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to connect ${input.provider}`,
				});
			}
		}),

	/**
	 * Get health status for all configured providers
	 */
	getHealthStatus: protectedProcedure.query(async ({ ctx }) => {
		const credentialsService = createProviderCredentialsService(
			ctx.db,
			ctx.auth.orgId,
		);

		const providers = ["moneybird", "wefact", "eboekhouden"] as const;
		const health: Record<string, { connected: boolean; message: string }> = {};

		for (const provider of providers) {
			try {
				const hasCredentials = await credentialsService.hasCredentials(provider);
				health[provider] = {
					connected: hasCredentials,
					message: hasCredentials ? "Connected" : "Not configured",
				};
			} catch {
				health[provider] = {
					connected: false,
					message: "Error checking status",
				};
			}
		}

		return health;
	}),

	/**
	 * Disconnect a provider by removing its credentials
	 */
	disconnect: protectedProcedure
		.input(
			z.object({
				provider: z.enum(["moneybird", "wefact", "eboekhouden"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const credentialsService = createProviderCredentialsService(
					ctx.db,
					ctx.auth.orgId,
				);

				await credentialsService.deleteCredentials(input.provider);

				return { success: true, provider: input.provider };
			} catch (error) {
				console.error(`Failed to disconnect ${input.provider}:`, error);

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to disconnect ${input.provider}`,
				});
			}
		}),
});