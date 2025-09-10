import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { env } from "~/lib/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";

export const whatsappSettingsRouter = createTRPCRouter({
	/**
	 * Get current WhatsApp settings for the organization
	 */
	getSettings: protectedProcedure.query(async ({ ctx }) => {
		// Get mapped phone numbers for this org
		const numbers = rowsOrEmpty(
			await ctx.db
				.from("wa_numbers")
				.select("phone_number_id, label, created_at")
				.eq("org_id", ctx.auth.orgId),
		);

		// Build webhook URLs from NEXT_PUBLIC_APP_URL (safe for client)
		const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
		const customerWebhookUrl = `${baseUrl}/api/wa/customer`;
		const controlWebhookUrl = `${baseUrl}/api/wa/control`;

		return {
			// Server-managed secrets - only show if configured (boolean)
			verifyTokenConfigured: env.WHATSAPP_VERIFY_TOKEN.length > 0,
			hmacConfigured: env.WA_APP_SECRET.length > 0,

			// Webhook URLs (safe to expose - built from NEXT_PUBLIC_APP_URL)
			customerWebhookUrl,
			controlWebhookUrl,

			// Mapped phone numbers
			mappedNumbers: numbers.map((num) => ({
				phoneNumberId: num.phone_number_id,
				label: num.label as "customer" | "control",
				createdAt: num.created_at,
			})),
		};
	}),

	/**
	 * Map a phone number ID to this organization
	 */
	mapNumber: protectedProcedure
		.input(
			z.object({
				phoneNumberId: z.string().min(6),
				label: z.enum(["customer", "control"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Use upsert to handle updates
			const { error } = await ctx.db.from("wa_numbers").upsert(
				{
					org_id: ctx.auth.orgId,
					phone_number_id: input.phoneNumberId,
					label: input.label,
					created_at: Temporal.Now.instant().toString(),
				},
				{
					onConflict: "org_id,label", // Update if same org+label exists
				},
			);

			if (error) {
				throw new Error(`Failed to map number: ${error.message}`);
			}

			return { ok: true };
		}),

	/**
	 * Remove a phone number mapping
	 */
	removeNumber: protectedProcedure
		.input(
			z.object({
				label: z.enum(["customer", "control"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { error } = await ctx.db
				.from("wa_numbers")
				.delete()
				.eq("org_id", ctx.auth.orgId)
				.eq("label", input.label);

			if (error) {
				throw new Error(`Failed to remove number: ${error.message}`);
			}

			return { ok: true };
		}),

	/**
	 * Send a test message to the control number
	 */
	sendTest: protectedProcedure.mutation(async ({ ctx }) => {
		// First check if control number is mapped
		const controlMappingResult = await ctx.db
			.from("wa_numbers")
			.select("phone_number_id")
			.eq("org_id", ctx.auth.orgId)
			.eq("label", "control")
			.single();

		if (controlMappingResult.error) {
			throw new Error(
				`Control number mapping error: ${controlMappingResult.error.message}`,
			);
		}

		const controlMapping = controlMappingResult.data;

		// Look for existing control conversation
		const { data: existingConvo } = await ctx.db
			.from("wa_conversations")
			.select("id, wa_contact_id, phone_number")
			.eq("org_id", ctx.auth.orgId)
			.eq("phone_number", controlMapping.phone_number_id)
			.order("last_message_at", { ascending: false })
			.limit(1)
			.maybeSingle();

		if (!existingConvo) {
			// No control conversation exists - need to send template message
			// This would require the control phone to message first to establish conversation
			throw new Error(
				"No control conversation found. Please send a message from your control phone first to establish connection.",
			);
		}

		// Send test message using existing send function
		const testMessage =
			"✅ WhatsApp control test OK - Setup wizard verification";

		// Call Meta API directly for test (simpler than full conversation flow)
		const url = `https://graph.facebook.com/v20.0/${controlMapping.phone_number_id}/messages`;
		const headers = {
			Authorization: `Bearer ${env.WA_GRAPH_TOKEN}`,
			"Content-Type": "application/json",
		};

		const body = {
			messaging_product: "whatsapp",
			to: existingConvo.wa_contact_id,
			type: "text",
			text: { body: testMessage },
		};

		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});

		const result = (await response.json()) as {
			messages?: { id?: string }[];
			error?: { message?: string };
		};

		if (!response.ok) {
			throw new Error(
				`WhatsApp API error: ${result.error?.message ?? "Unknown error"}`,
			);
		}

		// Store test message in our database for audit
		const nowIso = Temporal.Now.instant().toString();
		await ctx.db.from("wa_messages").insert({
			org_id: ctx.auth.orgId,
			conversation_id: existingConvo.id,
			wa_message_id:
				result.messages?.[0]?.id ??
				`test_${Temporal.Now.instant().epochMilliseconds}`,
			direction: "out",
			message_type: "text",
			content: testMessage,
			media_url: null,
			payload_json: {
				mode: "session",
				testMessage: true,
				createdAt: nowIso,
			},
			created_at: nowIso,
		});

		return {
			ok: true,
			messageId: result.messages?.[0]?.id,
			message: "Test message sent successfully",
		};
	}),
});
