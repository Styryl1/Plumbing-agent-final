/** @server-only */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "~/lib/log";
import type { Database, Json, TablesInsert } from "~/types/supabase";

/**
 * Audit logging system for compliance and debugging
 *
 * Logs all significant business operations to the audit_logs table
 * for security, compliance, and debugging purposes.
 */

export type AuditAction = "create" | "update" | "delete" | "move" | "view";
export type AuditResource =
	| "job"
	| "customer"
	| "employee"
	| "organization"
	| "invoice"
	| "whatsapp_conversation"
	| "whatsapp_message"
	| "intake_event"
	| "unscheduled_item"
	| "voice_call";

export interface AuditLogData {
	orgId: string;
	userId?: string | null | undefined;
	action: AuditAction;
	resource: AuditResource;
	resourceId?: string;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	summary?: string;
	eventType?: string;
	actorType?: "user" | "system" | "service";
	actorRole?: string | null;
}

/**
 * Log an audit event to the database
 *
 * @param data - Audit log data
 * @throws Error if logging fails (should be caught and handled gracefully)
 */
export async function logAuditEvent(
	db: SupabaseClient<Database>,
	data: AuditLogData,
): Promise<void> {
	try {
		const before = data.before ? (data.before as Json) : undefined;
		const after = data.after ? (data.after as Json) : undefined;
		const metadata = data.metadata ? (data.metadata as Json) : undefined;
		const eventType = data.eventType ?? `${data.resource}.${data.action}`;
		const actorType = data.actorType ?? (data.userId ? "user" : "system");

		const auditRecord: TablesInsert<"audit_events"> = {
			org_id: data.orgId,
			actor_id: data.userId ?? null,
			actor_type: actorType,
			actor_role: data.actorRole ?? null,
			event_type: eventType,
			resource_type: data.resource,
			resource_id: data.resourceId ?? null,
			summary: data.summary ?? null,
			...(before !== undefined ? { before } : {}),
			...(after !== undefined ? { after } : {}),
			...(metadata !== undefined ? { metadata } : {}),
		};

		const { error } = await db.from("audit_events").insert(auditRecord);

		if (error) {
			// Log but don't throw - audit failures shouldn't break business operations
			logger.error("[AUDIT] Failed to log audit event", {
				error: error.message,
				data,
			});
		}
	} catch (err) {
		// Log but don't throw - audit failures shouldn't break business operations
		logger.error("[AUDIT] Audit logging error", {
			error: err instanceof Error ? err.message : "Unknown error",
			data,
		});
	}
}

/**
 * Helper for job-related audit logs
 */
export async function logJobAudit(
	db: SupabaseClient<Database>,
	params: {
		orgId: string;
		userId?: string | null | undefined;
		action: Extract<AuditAction, "create" | "update" | "delete" | "move">;
		jobId: string;
		before?: Record<string, unknown>;
		after?: Record<string, unknown>;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	return logAuditEvent(db, {
		orgId: params.orgId,
		userId: params.userId,
		action: params.action,
		resource: "job",
		resourceId: params.jobId,
		summary: `job.${params.action}`,
		...(params.before ? { before: params.before } : {}),
		...(params.after ? { after: params.after } : {}),
		...(params.metadata ? { metadata: params.metadata } : {}),
	});
}

/**
 * Helper for customer-related audit logs
 */
export async function logCustomerAudit(
	db: SupabaseClient<Database>,
	params: {
		orgId: string;
		userId?: string | null | undefined;
		action: Extract<AuditAction, "create" | "update" | "delete">;
		customerId: string;
		before?: Record<string, unknown>;
		after?: Record<string, unknown>;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	return logAuditEvent(db, {
		orgId: params.orgId,
		userId: params.userId,
		action: params.action,
		resource: "customer",
		resourceId: params.customerId,
		summary: `customer.${params.action}`,
		...(params.before ? { before: params.before } : {}),
		...(params.after ? { after: params.after } : {}),
		...(params.metadata ? { metadata: params.metadata } : {}),
	});
}
