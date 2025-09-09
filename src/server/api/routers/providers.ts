import "server-only";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/lib/env";
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
				const farFutureExpiry = Temporal.Now.zonedDateTimeISO(
					"Europe/Amsterdam",
				)
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
	 * Get health status for a specific provider
	 */
	getHealth: protectedProcedure
		.input(
			z.object({
				provider: z.enum(["moneybird", "wefact", "eboekhouden"]),
			}),
		)
		.query(async ({ ctx, input }) => {
			const credentialsService = createProviderCredentialsService(
				ctx.db,
				ctx.auth.orgId,
			);

			try {
				const credentials = await credentialsService.getCredentials(
					input.provider,
				);

				if (!credentials) {
					return {
						provider: input.provider,
						status: "not_connected" as const,
						details: "Provider not connected",
					};
				}

				// Check if token is expired
				const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
				const expiresAt = Temporal.Instant.from(credentials.expires_at);

				if (now.toInstant().epochNanoseconds > expiresAt.epochNanoseconds) {
					return {
						provider: input.provider,
						status: "invalid_token" as const,
						details: "Token expired",
					};
				}

				return {
					provider: input.provider,
					status: "ok" as const,
					details: "Connected and valid",
				};
			} catch {
				return {
					provider: input.provider,
					status: "not_connected" as const,
					details: "Error checking credentials",
				};
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
				const hasCredentials =
					await credentialsService.hasCredentials(provider);
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
	 * Get OAuth authorization URL for Moneybird
	 */
	getAuthUrl: protectedProcedure
		.input(
			z.object({
				provider: z.literal("moneybird"),
			}),
		)
		.query(({ ctx, input }) => {
			// For Moneybird OAuth, we'll use the existing OAuth callback endpoint
			// This would typically generate a state parameter for CSRF protection
			const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
			const timestamp = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").epochMilliseconds;
			const state = `${ctx.auth.orgId}-${ctx.auth.userId}-${timestamp}`;

			// Moneybird OAuth parameters
			const params = new URLSearchParams({
				client_id: env.MONEYBIRD_CLIENT_ID ?? "",
				response_type: "code",
				redirect_uri: `${baseUrl}/api/providers/moneybird/callback`,
				scope: "sales_invoices",
				state,
			});

			const authUrl = `https://moneybird.com/oauth/authorize?${params.toString()}`;

			// Store state in session/db for validation (simplified for now)
			return {
				provider: input.provider,
				authUrl,
				state,
			};
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
