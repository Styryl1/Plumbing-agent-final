import { useTranslations } from "next-intl";
// WhatsApp Admin Router - Organization-scoped WhatsApp number management
// Provides CRUD operations for wa_numbers and health monitoring

import { TRPCError } from "@trpc/server";
import { env, serverOnlyEnv } from "~/lib/env";
import { parseZdt } from "~/lib/time";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";
import {
	seedNumbersSchema,
	sendTestMessageSchema,
	type WaHealthDTO,
	type WaNumberDTO,
	waNumberUpsertSchema,
} from "~/server/dto/waAdmin";
import { normalizeE164NL } from "~/server/dunning/senders/whatsapp";

// === HEALTH CHECK LOGIC ===

/**
 * Helper function to check if a string is non-empty
 */
const nonEmpty = (s: string | null | undefined): boolean =>
	(s ?? "").trim().length > 0;

/**
 * Derive health flags from environment and configuration
 */
export function deriveHealthFlags(): WaHealthDTO {
	// Check if WhatsApp environment variables are present (supporting both old and new env vars)
	const hasNewAccessToken = nonEmpty(serverOnlyEnv.WA_GRAPH_TOKEN);
	const hasLegacyAccessToken = nonEmpty(
		serverOnlyEnv.WHATSAPP_ACCESS_TOKEN ?? "",
	);
	const hasAccessToken = hasNewAccessToken ? true : hasLegacyAccessToken;

	const hasNewPhoneNumbers =
		nonEmpty(serverOnlyEnv.WA_CUSTOMER_NUMBER_ID) &&
		nonEmpty(serverOnlyEnv.WA_CONTROL_NUMBER_ID);
	const hasLegacyPhoneNumber = nonEmpty(
		serverOnlyEnv.WHATSAPP_BUSINESS_PHONE_ID ?? "",
	);
	const hasPhoneNumbers = hasNewPhoneNumbers ? true : hasLegacyPhoneNumber;

	const envOk = hasAccessToken && hasPhoneNumbers;

	// Check if webhook secrets are configured
	const hasNewAppSecret = nonEmpty(serverOnlyEnv.WA_APP_SECRET);
	const hasLegacyAppSecret = nonEmpty(serverOnlyEnv.WHATSAPP_APP_SECRET ?? "");
	const hasAppSecret = hasNewAppSecret ? true : hasLegacyAppSecret;

	const hasVerifyToken = nonEmpty(serverOnlyEnv.WHATSAPP_VERIFY_TOKEN);

	const secretOk = hasAppSecret && hasVerifyToken;

	// Webhook endpoint health is OK if we have the necessary secrets
	const webhookOk = secretOk;

	// Construct webhook URL (safe to expose)
	const baseUrl = env.NEXT_PUBLIC_APP_URL ?? undefined;
	const webhookUrl = baseUrl ? `${baseUrl}/api/wa/customer` : undefined;

	return {
		envOk,
		webhookOk,
		secretOk,
		webhookUrl,
		verifyToken: serverOnlyEnv.WHATSAPP_VERIFY_TOKEN, // Safe to show for setup
	};
}

// === TRPC ROUTER ===

export const waAdminRouter = createTRPCRouter({
	/**
	 * List WhatsApp numbers for the current organization
	 */
	listNumbers: protectedProcedure.query(
		async ({ ctx }): Promise<{ items: WaNumberDTO[] }> => {
			const { db, auth } = ctx;
			const { orgId } = auth;

			if (orgId.trim().length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Query wa_numbers table for this org
			const query = db
				.from("wa_numbers")
				.select("*")
				.eq("org_id", orgId)
				.order("label", { ascending: true });

			const numbers = rowsOrEmpty(await query);

			// Map to DTOs
			const items: WaNumberDTO[] = numbers.map((row) => ({
				phoneNumberId: row.phone_number_id,
				label: row.label as "business" | "control",
				createdAt: parseZdt(row.created_at).toInstant().toString(),
			}));

			return { items };
		},
	),

	/**
	 * Upsert a WhatsApp number mapping
	 */
	upsertNumber: protectedProcedure
		.input(waNumberUpsertSchema)
		.mutation(async ({ ctx, input }): Promise<WaNumberDTO> => {
			const { db, auth } = ctx;
			const { orgId } = auth;

			if (orgId.trim().length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// First, delete any existing mapping for this org + label
			await db
				.from("wa_numbers")
				.delete()
				.eq("org_id", orgId)
				.eq("label", input.label);

			// Insert the new mapping
			const { data, error } = await db
				.from("wa_numbers")
				.insert({
					phone_number_id: input.phoneNumberId,
					org_id: orgId,
					label: input.label,
				})
				.select()
				.single();

			if (error !== null) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to upsert WhatsApp number",
				});
			}

			return {
				phoneNumberId: data.phone_number_id,
				label: data.label as "business" | "control",
				createdAt: parseZdt(data.created_at).toInstant().toString(),
			};
		}),

	/**
	 * Seed two WhatsApp numbers for the current organization
	 */
	seedTwoNumbers: protectedProcedure
		.input(seedNumbersSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const { orgId } = auth;
			if (orgId.trim().length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Delete existing mappings
			await db.from("wa_numbers").delete().eq("org_id", orgId);

			// Insert new mappings
			await db.from("wa_numbers").insert([
				{ org_id: orgId, label: "business", phone_number_id: input.businessId },
				{ org_id: orgId, label: "control", phone_number_id: input.controlId },
			]);

			return { success: true };
		}),

	/**
	 * Send a test WhatsApp message to verify configuration
	 */
	sendTestMessage: protectedProcedure
		.input(sendTestMessageSchema)
		.mutation(async ({ ctx, input }) => {
			const { auth } = ctx;
			const { orgId } = auth;

			if (orgId.trim().length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "No organization selected",
				});
			}

			// Normalize phone number to E.164 format
			const normalizedPhone = normalizeE164NL(input.to);
			if (!normalizedPhone) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid phone number format",
				});
			}

			// Check if WhatsApp is configured
			// Use required env vars (they throw at startup if missing)
			const accessToken = serverOnlyEnv.WA_GRAPH_TOKEN;
			const businessPhoneId = serverOnlyEnv.WA_CONTROL_NUMBER_ID;

			if (!nonEmpty(accessToken) || !nonEmpty(businessPhoneId)) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"WhatsApp not configured - missing access token or phone number ID",
				});
			}

			// Prepare verification message
			const verificationMessage =
				input.message ??
				`🔧 Test bericht van ${orgId} loodgieter. WhatsApp configuratie werkt correct!`;

			// Send via Meta API
			const payload = {
				messaging_product: "whatsapp",
				to: normalizedPhone,
				type: "text",
				text: { body: verificationMessage },
			};

			try {
				const response = await fetch(
					`https://graph.facebook.com/v19.0/${businessPhoneId}/messages`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify(payload),
					},
				);

				if (!response.ok) {
					const errorText = await response.text();
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `WhatsApp API error: ${response.status} - ${errorText}`,
					});
				}

				const result = (await response.json()) as {
					messages?: Array<{ id?: string }>;
				};
				return {
					success: true,
					to: normalizedPhone,
					messageId: result.messages?.[0]?.id ?? null,
					message: "Test message sent successfully",
				};
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to send test message: ${error instanceof Error ? error.message : "Unknown error"}`,
				});
			}
		}),

	/**
	 * Get webhook health status
	 */
	health: protectedProcedure.query((): WaHealthDTO => {
		return deriveHealthFlags();
	}),
});
