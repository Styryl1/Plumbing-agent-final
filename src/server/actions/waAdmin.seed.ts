"use server";

// WhatsApp Admin Server Actions - Secure number seeding with auth
// Uses Next.js server actions for type-safe mutations

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import { type SeedNumbersInput, seedNumbersSchema } from "~/server/dto/waAdmin";
import type { Database } from "~/types/supabase";

/**
 * Server action to seed two WhatsApp numbers for the current organization
 * Uses service role for direct DB access with proper auth checks
 */
export async function seedTwoNumbers(
	input: SeedNumbersInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Validate input
		const validated = seedNumbersSchema.parse(input);

		// Get current auth context
		const { orgId } = await auth();

		if (!orgId) {
			return {
				success: false,
				error: "No organization selected",
			};
		}

		// Create Supabase client with service role
		const supabase = createClient<Database>(
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
		);

		// Delete any existing mappings for this org
		await supabase.from("wa_numbers").delete().eq("org_id", orgId);

		// Insert both numbers
		const { error } = await supabase.from("wa_numbers").insert([
			{
				phone_number_id: validated.businessId,
				org_id: orgId,
				label: "business",
			},
			{
				phone_number_id: validated.controlId,
				org_id: orgId,
				label: "control",
			},
		]);

		if (error) {
			console.error("Failed to seed WhatsApp numbers:", error);
			return {
				success: false,
				error: "Failed to seed numbers",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error in seedTwoNumbers:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
