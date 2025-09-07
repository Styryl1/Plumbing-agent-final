// WhatsApp Admin Router - Organization-scoped WhatsApp number management
// Provides CRUD operations for wa_numbers and health monitoring

import { TRPCError } from "@trpc/server";
import { env } from "~/lib/env";
import { parseZdt } from "~/lib/time";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";
import {
	seedNumbersSchema,
	type WaHealthDTO,
	type WaNumberDTO,
	waNumberUpsertSchema,
} from "~/server/dto/waAdmin";

// === HEALTH CHECK LOGIC ===

/**
 * Derive health flags from environment and configuration
 */
export function deriveHealthFlags(): WaHealthDTO {
	// Check if WhatsApp environment variables are present
	const envOk =
		(env.WHATSAPP_BUSINESS_PHONE_ID?.trim().length ?? 0) > 0 &&
		(env.WHATSAPP_ACCESS_TOKEN?.trim().length ?? 0) > 0;

	// Check if webhook secret is configured
	const secretOk = (env.WHATSAPP_WEBHOOK_SECRET?.trim().length ?? 0) > 0;

	// For now, webhook endpoint health is assumed OK if env is configured
	// In production, this could ping the actual webhook URL
	const webhookOk = envOk;

	return {
		envOk,
		webhookOk,
		secretOk,
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
	 * Get webhook health status
	 */
	health: protectedProcedure.query((): WaHealthDTO => {
		return deriveHealthFlags();
	}),
});
