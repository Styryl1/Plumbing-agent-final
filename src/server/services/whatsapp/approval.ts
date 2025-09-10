/**
 * WhatsApp Approval & Relay Service (S4)
 * Handles approve/reject/send/quote actions from control chat
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logAuditEvent } from "~/lib/audit";
import { toISO } from "~/lib/calendar-temporal";
import { env } from "~/lib/env";
import { toDbStatus } from "~/lib/job-status";
import type { Database } from "~/types/supabase";
import { sendTextMessage } from "./send";

type DB = SupabaseClient<Database>;

export interface ApprovalContext {
	orgId: string;
	userId: string; // Plumber/control user ID
	phone: string; // Control number for audit
}

interface SuggestionData {
	id: string;
	proposed_text: string;
	tags: string[];
	urgency: "low" | "medium" | "high";
	time_estimate_min?: number;
	conversation_id: string;
	conversation: {
		id: string;
		customer?: {
			id: string;
			name: string;
			phone?: string;
			address?: string;
			postal_code?: string;
		};
	};
}

/**
 * Approve suggestion and relay to customer, optionally creating a job
 */
export async function approveSuggestion(
	db: DB,
	msgId: string,
	context: ApprovalContext,
	options: { createJob?: boolean } = {},
): Promise<{
	success: boolean;
	error?: string;
	jobId?: string;
	jobCardUrl?: string;
}> {
	try {
		// Get suggestion with conversation and customer info
		const suggestion = await db
			.from("wa_suggestions")
			.select(`
				*,
				conversation:wa_conversations!inner(
					id,
					wa_contact_id,
					phone_number,
					customer:customers(id, name, phone, address, postal_code)
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

		let jobId: string | undefined;
		let jobCardUrl: string | undefined;

		// Create job if requested and customer is linked
		if (options.createJob && suggestion.data.conversation.customer) {
			const jobResult = await createJobFromSuggestion(
				db,
				suggestion.data as SuggestionData,
				context,
			);

			if (jobResult.success) {
				jobId = jobResult.jobId;
				jobCardUrl = jobResult.jobCardUrl;
			}
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
				jobCreated: Boolean(jobId),
				jobId,
			},
		});

		const result = { success: true } as const;
		if (jobId && jobCardUrl) {
			return { ...result, jobId, jobCardUrl };
		}
		return result;
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
		.select("phone_number_id")
		.eq("org_id", orgId)
		.eq("label", "control")
		.eq("phone_number_id", phoneNumber) // NormalizedMessage.phoneNumber is Meta phone_number_id
		.maybeSingle();

	return controlNumber.data != null;
}

/**
 * Create job from approved WhatsApp suggestion
 */
async function createJobFromSuggestion(
	db: DB,
	suggestionData: SuggestionData,
	context: ApprovalContext,
): Promise<{
	success: boolean;
	jobId?: string;
	jobCardUrl?: string;
	error?: string;
}> {
	try {
		// Get org settings for default duration (fallback to 60 minutes)
		const { data: orgSettings } = await db
			.from("org_settings")
			.select("id") // We'll add default_job_duration_min later if needed
			.eq("org_id", context.orgId)
			.single();

		// Suppress unused variable warning
		void orgSettings;

		const durationMinutes = suggestionData.time_estimate_min ?? 60;
		const customer = suggestionData.conversation.customer;

		// Create job start time (schedule for next business hour if outside business hours)
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		let startTime = now;

		// If it's outside business hours, schedule for 8 AM next business day
		if (now.hour < 8 || now.hour >= 18) {
			const nextBusinessDay = now.hour >= 18 ? now.add({ days: 1 }) : now;
			startTime = nextBusinessDay.with({ hour: 8, minute: 0, second: 0 });
		}

		const endTime = startTime.add({ minutes: durationMinutes });

		// Build address from customer data or fallback
		const address =
			customer?.address ?? customer?.postal_code ?? "Adres niet bekend";

		// Ensure customer exists
		if (!customer) {
			return { success: false, error: "Customer not linked" };
		}

		// Create job
		const { data: newJob, error: jobError } = await db
			.from("jobs")
			.insert({
				org_id: context.orgId,
				customer_id: customer.id,
				title: `WhatsApp: ${suggestionData.urgency === "high" ? "⚡ " : ""}${suggestionData.tags.length > 0 ? suggestionData.tags.join(", ") : "Klus"}`,
				description: `Via WhatsApp - ${suggestionData.proposed_text.substring(0, 200)}${suggestionData.proposed_text.length > 200 ? "..." : ""}\n\nConversatie ID: ${suggestionData.conversation_id}`,
				starts_at: toISO(startTime),
				ends_at: toISO(endTime),
				status: toDbStatus("planned"),
				priority:
					suggestionData.urgency === "high"
						? "high"
						: suggestionData.urgency === "medium"
							? "normal"
							: "low",
				address: address,
				// Leave employee_id null initially - supervisor can assign later
			})
			.select("id")
			.single();

		if (jobError) {
			console.error("Failed to create job from suggestion:", jobError);
			return { success: false, error: "Failed to create job" };
		}

		const jobId = newJob.id;
		const jobCardUrl = `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/jobs/${jobId}/card`;

		// Log job creation
		await logAuditEvent(db, {
			orgId: context.orgId,
			userId: context.userId,
			action: "create",
			resource: "job",
			resourceId: jobId,
			metadata: {
				action: "create_job_from_whatsapp",
				suggestionId: suggestionData.id,
				conversationId: suggestionData.conversation_id,
				urgency: suggestionData.urgency,
				tags: suggestionData.tags,
				duration: durationMinutes,
			},
		});

		return { success: true, jobId, jobCardUrl };
	} catch (error) {
		console.error("Failed to create job from suggestion:", error);
		return { success: false, error: "Internal error" };
	}
}
