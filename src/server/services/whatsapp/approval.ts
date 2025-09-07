/**
 * WhatsApp Approval & Relay Service (S4)
 * Handles approve/reject/send/quote actions from control chat
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logAuditEvent } from "~/lib/audit";
import type { Database } from "~/types/supabase";
import { sendTextMessage } from "./send";

type DB = SupabaseClient<Database>;

export interface ApprovalContext {
	orgId: string;
	userId: string; // Plumber/control user ID
	phone: string; // Control number for audit
}

/**
 * Approve suggestion and relay to customer
 */
export async function approveSuggestion(
	db: DB,
	msgId: string,
	context: ApprovalContext,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get suggestion with conversation info
		const suggestion = await db
			.from("wa_suggestions")
			.select(`
				*,
				conversation:wa_conversations!inner(
					id,
					wa_contact_id,
					phone_number
				)
			`)
			.eq("message_id", msgId)
			.eq("org_id", context.orgId)
			.single();

		if (!suggestion.data) {
			return { success: false, error: "Suggestion not found" };
		}

		// TODO: Add status field to schema
		// if (suggestion.data.status === "approved") {
		// 	return { success: false, error: "Already approved" };
		// }

		// Send message to customer via conversation
		const sendResult = await sendTextMessage(db, context.orgId, {
			conversationId: suggestion.data.conversation.id,
			text: suggestion.data.proposed_text,
		});

		if (!sendResult.ok) {
			return { success: false, error: "Failed to send message" };
		}

		// TODO: Mark suggestion as approved (add status fields to schema)
		// await db
		// 	.from("wa_suggestions")
		// 	.update({
		// 		status: "approved",
		// 		approved_at: Temporal.Now.instant().toString(),
		// 		approved_by: context.userId,
		// 	})
		// 	.eq("id", suggestion.data.id);

		// Write audit event
		await logAuditEvent(db, {
			orgId: context.orgId,
			userId: context.userId,
			action: "update",
			resource: "whatsapp_message", // Use existing audit resource
			resourceId: suggestion.data.id,
			metadata: {
				action: "approve_suggestion",
				messageId: msgId,
				controlPhone: context.phone,
				sentMode: sendResult.mode,
			},
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to approve suggestion:", error);
		return { success: false, error: "Internal error" };
	}
}

/**
 * Reject suggestion with reason
 */
export async function rejectSuggestion(
	db: DB,
	msgId: string,
	reason: string,
	context: ApprovalContext,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get suggestion
		const suggestion = await db
			.from("wa_suggestions")
			.select("*")
			.eq("message_id", msgId)
			.eq("org_id", context.orgId)
			.single();

		if (!suggestion.data) {
			return { success: false, error: "Suggestion not found" };
		}

		// TODO: Add status fields to schema
		// if (suggestion.data.status === "rejected") {
		// 	return { success: false, error: "Already rejected" };
		// }

		// TODO: Mark suggestion as rejected (add status fields to schema)
		// await db
		// 	.from("wa_suggestions")
		// 	.update({
		// 		status: "rejected",
		// 		rejected_at: Temporal.Now.instant().toString(),
		// 		rejected_by: context.userId,
		// 		rejection_reason: reason,
		// 	})
		// 	.eq("id", suggestion.data.id);

		// Write audit event
		await logAuditEvent(db, {
			orgId: context.orgId,
			userId: context.userId,
			action: "update",
			resource: "whatsapp_message", // Use existing audit resource
			resourceId: suggestion.data.id,
			metadata: {
				action: "reject_suggestion",
				messageId: msgId,
				reason: reason,
				controlPhone: context.phone,
			},
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to reject suggestion:", error);
		return { success: false, error: "Internal error" };
	}
}

/**
 * Send original message without analyzer (fallback)
 */
export async function sendRaw(
	db: DB,
	msgId: string,
	context: ApprovalContext,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get original message with conversation info
		const message = await db
			.from("wa_messages")
			.select(`
				*,
				conversation:wa_conversations!inner(
					id,
					wa_contact_id,
					phone_number
				)
			`)
			.eq("wa_message_id", msgId)
			.eq("org_id", context.orgId)
			.eq("direction", "in")
			.single();

		if (!message.data) {
			return { success: false, error: "Original message not found" };
		}

		const originalText = message.data.content;
		if (!originalText) {
			return { success: false, error: "No text content to send" };
		}

		// Send original message text
		const sendResult = await sendTextMessage(db, context.orgId, {
			conversationId: message.data.conversation.id,
			text: originalText,
		});

		if (!sendResult.ok) {
			return { success: false, error: "Failed to send message" };
		}

		// Write audit event
		await logAuditEvent(db, {
			orgId: context.orgId,
			userId: context.userId,
			action: "create",
			resource: "whatsapp_message",
			resourceId: message.data.conversation.id,
			metadata: {
				action: "send_raw_message",
				originalMessageId: msgId,
				controlPhone: context.phone,
				sentMode: sendResult.mode,
			},
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to send raw message:", error);
		return { success: false, error: "Internal error" };
	}
}

/**
 * Create quote draft and return link
 */
export async function createQuoteDraft(
	db: DB,
	msgId: string,
	context: ApprovalContext,
): Promise<{ success: boolean; url?: string; error?: string }> {
	try {
		// Get message to find customer
		const message = await db
			.from("wa_messages")
			.select(`
				*,
				conversation:wa_conversations!inner(
					id,
					wa_contact_id,
					phone_number,
					customer:customers(*)
				)
			`)
			.eq("wa_message_id", msgId)
			.eq("org_id", context.orgId)
			.single();

		if (!message.data) {
			return { success: false, error: "Message not found" };
		}

		const conversation = message.data.conversation;
		if (!conversation.customer) {
			return {
				success: false,
				error: "Customer not linked - create customer first",
			};
		}

		// Create draft invoice (this would call existing draft creator)
		// For MVP, we return a placeholder URL and log the action
		const draftUrl = `/invoices/draft?customer=${conversation.customer.id}&source=whatsapp&msg=${msgId}`;

		// Write audit event
		await logAuditEvent(db, {
			orgId: context.orgId,
			userId: context.userId,
			action: "create",
			resource: "invoice", // Use existing audit resource
			resourceId: conversation.customer.id,
			metadata: {
				action: "create_quote_from_whatsapp",
				messageId: msgId,
				customerId: conversation.customer.id,
				controlPhone: context.phone,
			},
		});

		return { success: true, url: draftUrl };
	} catch (error) {
		console.error("Failed to create quote draft:", error);
		return { success: false, error: "Internal error" };
	}
}

/**
 * Check if phone number is whitelisted for control actions
 */
export async function isControlNumberWhitelisted(
	db: DB,
	orgId: string,
	phoneNumber: string,
): Promise<boolean> {
	// Check if phone number is registered as control number for org
	const controlNumber = await db
		.from("wa_numbers")
		.select("id")
		.eq("org_id", orgId)
		.eq("label", "control")
		.single();

	if (!controlNumber.data) {
		return false;
	}

	// For MVP, always return true for control numbers
	// In production, this would check against a whitelist table
	// TODO: Implement proper control number whitelist
	return phoneNumber.length > 10; // Basic validation for now
}
