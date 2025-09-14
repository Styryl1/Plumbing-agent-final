import { useTranslations } from "next-intl";
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
	| "whatsapp_message";

export interface AuditLogData {
	orgId: string;
	userId?: string | null | undefined; // Clerk user ID (can be undefined from ctx)
	action: AuditAction;
	resource: AuditResource;
	resourceId: string;
	changes?: {
		before?: Record<string, unknown>;
		after?: Record<string, unknown>;
	};
	metadata?: Record<string, unknown>;
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
		const payload = {
			resource_id: data.resourceId,
			changes: data.changes as Json,
			metadata: data.metadata as Json,
		} as Json;

		const auditRecord: TablesInsert<"audit_logs"> = {
			org_id: data.orgId,
			user_id: data.userId ?? null,
			action: data.action,
			resource: data.resource,
			payload_json: payload,
		};

		const { error } = await db.from("audit_logs").insert(auditRecord);

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
		// Boolean logic: include changes if either exists
		...(Boolean(params.before) || Boolean(params.after)
			? {
					changes: {
						...(params.before && { before: params.before }),
						...(params.after && { after: params.after }),
					},
				}
			: {}),
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
		// Boolean logic: include changes if either exists
		...(Boolean(params.before) || Boolean(params.after)
			? {
					changes: {
						...(params.before && { before: params.before }),
						...(params.after && { after: params.after }),
					},
				}
			: {}),
		...(params.metadata ? { metadata: params.metadata } : {}),
	});
}
