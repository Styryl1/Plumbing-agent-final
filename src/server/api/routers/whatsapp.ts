import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logAuditEvent } from "~/lib/audit";
import { getOrgFeatureFlags } from "~/lib/feature-flags";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { approveSuggestion } from "~/server/services/whatsapp/approval";
import {
	GetMessagesInput,
	getMessages,
	ListConversationsInput,
	ListLeadsInput,
	listConversations,
	listLeads,
	ToggleStatusInput,
	toggleStatus,
} from "~/server/services/whatsapp/conversation-queries";
import {
	MarkReadInput,
	markConversationRead,
} from "~/server/services/whatsapp/conversation-unread";
import {
	SendTextInput,
	sendTextMessage,
} from "~/server/services/whatsapp/send";

const approveSuggestionInput = z.object({
	conversationId: z.uuid(),
	createJob: z.boolean().optional(),
});

/**
 * WhatsApp tRPC router for Phase 0
 * Provides health check and basic conversation/message counts
 */
export const whatsappRouter = createTRPCRouter({
	/**
	 * Get WhatsApp integration health and statistics
	 */
	health: protectedProcedure.query(async ({ ctx }) => {
		const flags = await getOrgFeatureFlags({
			db: ctx.db,
			orgId: ctx.auth.orgId,
		});
		const [conversationsResult, messagesResult] = await Promise.all([
			ctx.db
				.from("wa_conversations")
				.select("*", { count: "exact", head: true })
				.eq("org_id", ctx.auth.orgId),
			ctx.db
				.from("wa_messages")
				.select("*", { count: "exact", head: true })
				.eq("org_id", ctx.auth.orgId),
		]);

		return {
			enabled: flags.intakeWhatsApp,
			dualNumberMode: true, // Always enabled for now
			conversationCount: conversationsResult.count ?? 0,
			messageCount: messagesResult.count ?? 0,
		};
	}),

	/**
	 * Get recent conversations for the organization
	 * Phase 0: Basic list, will be enhanced in S1
	 */
	getConversations: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(100).default(20),
					offset: z.number().min(0).default(0),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;
			const offset = input?.offset ?? 0;

			const { data: conversations, error } = await ctx.db
				.from("wa_conversations")
				.select(
					`
					*,
					customer:customers(
						id,
						name,
						phone,
						email
					)
				`,
				)
				.eq("org_id", ctx.auth.orgId)
				.order("last_message_at", { ascending: false })
				.range(offset, offset + limit - 1);

			if (error) {
				console.error("Failed to fetch conversations:", error);
				return { conversations: [], total: 0 };
			}

			// Get total count
			const { count } = await ctx.db
				.from("wa_conversations")
				.select("*", { count: "exact", head: true })
				.eq("org_id", ctx.auth.orgId);

			return {
				conversations,
				total: count,
			};
		}),

	/**
	 * Get messages for a conversation (S1 implementation)
	 * Supports cursor-based pagination for performance
	 */
	getMessages: protectedProcedure
		.input(GetMessagesInput)
		.query(async ({ ctx, input }) => {
			return getMessages(ctx.db, ctx.auth.orgId, input);
		}),

	/**
	 * Get organization WhatsApp configuration
	 * Phase 0: Check if numbers are configured
	 */
	getOrgConfig: protectedProcedure.query(async ({ ctx }) => {
		const { data: org, error } = await ctx.db
			.from("organizations")
			.select(
				"whatsapp_business_number, whatsapp_control_number, whatsapp_settings",
			)
			.eq("id", ctx.auth.orgId)
			.single();

		if (error) {
			console.error("Failed to fetch org config:", error);
			return {
				businessNumber: null,
				controlNumber: null,
				settings: {},
			};
		}

		return {
			businessNumber: org.whatsapp_business_number ?? null,
			controlNumber: org.whatsapp_control_number ?? null,
			settings: org.whatsapp_settings ?? {},
		};
	}),

	/**
	 * List conversations with last message snippets (S1 implementation)
	 * Supports cursor-based pagination and status filtering
	 */
	listConversations: protectedProcedure
		.input(ListConversationsInput)
		.query(async ({ ctx, input }) => {
			const userId = ctx.auth.userId;
			return listConversations(ctx.db, ctx.auth.orgId, userId, input);
		}),

	/**
	 * Toggle conversation status between active and closed
	 */
	toggleStatus: protectedProcedure
		.input(ToggleStatusInput)
		.mutation(async ({ ctx, input }) => {
			const result = await toggleStatus(ctx.db, ctx.auth.orgId, input);

			// Audit log the conversation status change
			await logAuditEvent(ctx.db, {
				orgId: ctx.auth.orgId,
				userId: ctx.auth.userId,
				action: "update",
				resource: "whatsapp_conversation",
				resourceId: input.conversationId,
				metadata: {
					action: "status_toggle",
					targetStatus: input.status,
				},
			});

			return result;
		}),

	/**
	 * List leads - active conversations not linked to customers (S1 implementation)
	 */
	listLeads: protectedProcedure
		.input(ListLeadsInput)
		.query(async ({ ctx, input }) => {
			return listLeads(ctx.db, ctx.auth.orgId, ctx.auth.userId, input);
		}),

	/**
	 * Send text message (S2 implementation)
	 * Supports session vs template logic with 24h window detection
	 */
	sendText: protectedProcedure
		.input(SendTextInput)
		.mutation(async ({ ctx, input }) => {
			const result = await sendTextMessage(ctx.db, ctx.auth.orgId, input);

			// Audit log the message send
			await logAuditEvent(ctx.db, {
				orgId: ctx.auth.orgId,
				userId: ctx.auth.userId,
				action: "create",
				resource: "whatsapp_message",
				resourceId: input.conversationId, // Use conversation ID as resource ID
				metadata: {
					action: "send_message",
					messageType: "text",
					messageLength: input.text.length,
					templateName: input.templateName,
				},
			});

			return result;
		}),

	approveLatestSuggestion: protectedProcedure
		.input(approveSuggestionInput)
		.mutation(async ({ ctx, input }) => {
			const { db, auth } = ctx;
			const { orgId, userId } = auth;

			const suggestionQuery = await db
				.from("wa_suggestions")
				.select("id")
				.eq("org_id", orgId)
				.eq("conversation_id", input.conversationId)
				.eq("status", "pending")
				.order("created_at", { ascending: false })
				.limit(1)
				.maybeSingle();

			if (suggestionQuery.error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to load suggestions",
					cause: suggestionQuery.error,
				});
			}

			const suggestionId = suggestionQuery.data?.id;
			if (!suggestionId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No pending suggestion",
				});
			}

			const result = await approveSuggestion(
				db,
				suggestionId,
				{
					orgId,
					userId,
					phone: "dashboard",
					timezone: ctx.timezone,
				},
				{ createJob: Boolean(input.createJob) },
			);

			if (!result.success) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: result.error ?? "Failed to approve suggestion",
				});
			}

			return result;
		}),

	/**
	 * Mark conversation as read for the current user (S4 implementation)
	 * Updates read marker and reduces unread count
	 */
	markRead: protectedProcedure
		.input(MarkReadInput)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.auth.userId;
			const result = await markConversationRead(
				ctx.db,
				ctx.auth.orgId,
				userId,
				input,
			);

			// Audit log the read marker update (simplified)
			await logAuditEvent(ctx.db, {
				orgId: ctx.auth.orgId,
				userId: ctx.auth.userId,
				action: "update",
				resource: "whatsapp_conversation",
				resourceId: input.conversationId,
				metadata: {
					action: "mark_read",
					upToCreatedAt: input.upToCreatedAtIso,
				},
			});

			return result;
		}),
});
