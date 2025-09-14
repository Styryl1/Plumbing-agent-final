// Audit logging utilities for invoice system
// Provides type-safe audit trail without PII exposure

import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { zdtToISO } from "~/lib/time";
import type { Database, Json } from "~/types/supabase";

// ============================================================================
// Constants
// ============================================================================

const SYSTEM_ACTOR_ID = "system";
const MANUAL_ACTOR_ID = "manual";

// ============================================================================
// Types
// ============================================================================

export type AuditResourceType =
	| "invoice"
	| "payment"
	| "reminder"
	| "credit_note";

export type AuditAction =
	| "created"
	| "updated"
	| "sent"
	| "reminded"
	| "paid"
	| "cancelled"
	| "refunded"
	| "voided"
	| "credited";

export interface AuditMetadata extends Record<string, unknown> {
	[key: string]: unknown;
}

export interface AuditChanges {
	[field: string]: {
		from: unknown;
		to: unknown;
	};
}

export interface CreateAuditLogParams {
	supabase: SupabaseClient<Database>;
	orgId: string;
	resourceType: AuditResourceType;
	resourceId: string;
	action: AuditAction;
	actorId: string;
	actorRole?: string;
	changes?: AuditChanges;
	metadata?: AuditMetadata;
}

// ============================================================================
// Audit Logging Functions
// ============================================================================

/**
 * Simplified audit writer function for tRPC router integration
 */
export async function writeAudit({
	entity,
	entityId,
	action,
	actorId,
	meta = {},
	db,
	orgId,
}: {
	entity: AuditResourceType;
	entityId: string;
	action: AuditAction;
	actorId: string;
	meta?: Record<string, unknown>;
	db: SupabaseClient<Database>;
	orgId: string;
}): Promise<void> {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	const sanitizedMeta = sanitizeMetadata({ ...meta, timestamp: zdtToISO(now) });

	const { error } = await db.from("invoice_audit_log").insert({
		org_id: orgId,
		resource_type: entity,
		resource_id: entityId,
		action,
		actor_id: actorId,
		actor_role: null,
		changes: {} as Json,
		metadata: sanitizedMeta as Json, // Cast to Json for Supabase compatibility
	});

	if (error) {
		// Log audit failures but don't break the main operation
		console.error("Failed to write audit log:", error);
	}
}

/**
 * Creates an audit log entry
 * Ensures no PII is logged in metadata
 */
export async function createAuditLog({
	supabase,
	orgId,
	resourceType,
	resourceId,
	action,
	actorId,
	actorRole,
	changes = {},
	metadata = {},
}: CreateAuditLogParams): Promise<void> {
	// Sanitize metadata to remove potential PII
	const sanitizedMetadata = sanitizeMetadata(metadata);

	const { error } = await supabase.from("invoice_audit_log").insert({
		org_id: orgId,
		resource_type: resourceType,
		resource_id: resourceId,
		action,
		actor_id: actorId,
		actor_role: actorRole ?? null,
		changes: changes as Json, // Cast to Json for Supabase compatibility
		metadata: sanitizedMetadata as Json, // Cast to Json for Supabase compatibility
	});

	if (error) {
		// Log audit failures but don't break the main operation
		console.error("Failed to create audit log:", error);
	}
}

/**
 * Logs invoice creation
 */
export async function auditInvoiceCreated(
	supabase: SupabaseClient<Database>,
	orgId: string,
	invoiceId: string,
	actorId: string,
	actorRole?: string,
	metadata?: AuditMetadata,
): Promise<void> {
	await createAuditLog({
		supabase,
		orgId,
		resourceType: "invoice",
		resourceId: invoiceId,
		action: "created",
		actorId,
		...(actorRole && { actorRole }),
		metadata: {
			...metadata,
			timestamp: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		},
	});
}

/**
 * Logs invoice status change to sent
 */
export async function auditInvoiceSent(
	supabase: SupabaseClient<Database>,
	orgId: string,
	invoiceId: string,
	actorId: string,
	channel: "email" | "whatsapp",
	recipientInfo?: { email?: string; phone?: string },
): Promise<void> {
	await createAuditLog({
		supabase,
		orgId,
		resourceType: "invoice",
		resourceId: invoiceId,
		action: "sent",
		actorId,
		metadata: {
			channel,
			// Store only channel type, not actual contact info
			hasEmail: !!recipientInfo?.email,
			hasPhone: !!recipientInfo?.phone,
			timestamp: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		},
	});
}

/**
 * Logs payment received
 */
export async function auditPaymentReceived(
	supabase: SupabaseClient<Database>,
	orgId: string,
	invoiceId: string,
	paymentId: string,
	amountCents: number,
	paymentMethod: string,
	isManual: boolean = false,
): Promise<void> {
	await createAuditLog({
		supabase,
		orgId,
		resourceType: "payment",
		resourceId: paymentId,
		action: "paid",
		actorId: isManual ? MANUAL_ACTOR_ID : SYSTEM_ACTOR_ID,
		metadata: {
			invoiceId,
			amountCents,
			paymentMethod,
			isManual,
			timestamp: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		},
	});
}

/**
 * Logs reminder sent
 */
export async function auditReminderSent(
	supabase: SupabaseClient<Database>,
	orgId: string,
	invoiceId: string,
	reminderNumber: number,
	channel: "email" | "whatsapp" | "sms",
): Promise<void> {
	await createAuditLog({
		supabase,
		orgId,
		resourceType: "reminder",
		resourceId: invoiceId,
		action: "reminded",
		actorId: SYSTEM_ACTOR_ID, // System-generated audit entry
		metadata: {
			reminderNumber,
			channel,
			timestamp: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		},
	});
}

/**
 * Logs invoice update with field changes
 */
export async function auditInvoiceUpdated(
	supabase: SupabaseClient<Database>,
	orgId: string,
	invoiceId: string,
	actorId: string,
	changes: AuditChanges,
): Promise<void> {
	// Filter out sensitive fields from changes
	const sanitizedChanges = Object.entries(changes).reduce(
		(acc, [key, value]) => {
			// Don't log changes to notes that might contain PII
			if (key === "notes" || key === "internalNotes") {
				acc[key] = { from: "[redacted]", to: "[redacted]" };
			} else {
				acc[key] = value;
			}
			return acc;
		},
		{} as AuditChanges,
	);

	await createAuditLog({
		supabase,
		orgId,
		resourceType: "invoice",
		resourceId: invoiceId,
		action: "updated",
		actorId,
		changes: sanitizedChanges,
		metadata: {
			fieldsChanged: Object.keys(changes),
			timestamp: zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		},
	});
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitizes metadata to remove PII
 * Removes common PII fields like email, phone, address, etc.
 */
function sanitizeMetadata(metadata: AuditMetadata): AuditMetadata {
	const piiFields = [
		"email",
		"phone",
		"address",
		"ssn",
		"taxId",
		"bankAccount",
		"creditCard",
		"password",
		"token",
		"apiKey",
	];

	const sanitized = { ...metadata };

	for (const field of piiFields) {
		if (field in sanitized) {
			delete sanitized[field];
		}
		// Also check for nested fields
		for (const key in sanitized) {
			if (key.toLowerCase().includes(field.toLowerCase())) {
				delete sanitized[key];
			}
		}
	}

	return sanitized;
}

/**
 * Gets audit history for a resource
 */
export async function getAuditHistory(
	supabase: SupabaseClient<Database>,
	resourceType: AuditResourceType,
	resourceId: string,
): Promise<unknown[]> {
	const { data, error } = await supabase
		.from("invoice_audit_log")
		.select("*")
		.eq("resource_type", resourceType)
		.eq("resource_id", resourceId)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Failed to fetch audit history:", error);
		return [];
	}

	return data;
}
