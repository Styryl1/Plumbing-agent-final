import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";
import "~/lib/time";
// Import removed unused imports
import type { ReminderMessageData } from "~/server/services/whatsapp/templates";
import { dunningConfig } from "./config";
import { type Candidate, selectCandidates } from "./selector";
import { type EmailSendResult, sendEmailReminder } from "./senders/email";
import {
	normalizeE164NL,
	sendWhatsAppReminder,
	type WhatsAppSendResult,
} from "./senders/whatsapp";

type DB = SupabaseClient<Database>;

interface OrgContactInfo {
	id: string;
	name: string;
	phone: string | null;
}

const DEFAULT_COMPANY_NAME = "Loodgieter B.V.";

async function fetchOrgContactInfo(
	db: DB,
	orgIds: readonly string[],
): Promise<Map<string, OrgContactInfo>> {
	if (orgIds.length === 0) {
		return new Map();
	}

	const { data, error } = await db
		.from("organizations")
		.select("id, name, whatsapp_business_number, whatsapp_control_number")
		.in("id", orgIds);

	if (error) {
		console.error("Failed to load organization contact info:", error);
		return new Map();
	}

	const info = new Map<string, OrgContactInfo>();
	const rows = Array.isArray(data) ? data : [];

	for (const row of rows) {
		let rawPhone: string | null = null;
		if (row.whatsapp_business_number) {
			rawPhone = row.whatsapp_business_number;
		} else if (row.whatsapp_control_number) {
			rawPhone = row.whatsapp_control_number;
		}
		let normalizedPhone: string | null = null;
		if (rawPhone) {
			const candidatePhone = normalizeE164NL(rawPhone);
			normalizedPhone = candidatePhone ?? rawPhone;
		}
		const name = row.name;
		const displayName = name.trim().length > 0 ? name : DEFAULT_COMPANY_NAME;

		info.set(row.id, {
			id: row.id,
			name: displayName,
			phone: normalizedPhone,
		});
	}

	return info;
}

export interface DunningRunResult {
	candidates: number;
	sent: number;
	skipped: number;
	failed: number;
	errors: string[];
}

/**
 * Create deduplication key for idempotency per day
 */
function createDedupeKey(
	invoiceId: string,
	channel: "whatsapp" | "email",
	template: string,
	now: Temporal.ZonedDateTime,
): string {
	const dateString = now.toPlainDate().toString();
	return `dunning:${invoiceId}:${channel}:${template}:${dateString}`;
}

/**
 * Check if we're within the configured sending window
 */
function isWithinSendingWindow(now: Temporal.ZonedDateTime): boolean {
	const hour = now.hour;
	return (
		hour >= dunningConfig.DUNNING_WINDOW_START_HOUR &&
		hour < dunningConfig.DUNNING_WINDOW_END_HOUR
	);
}

/**
 * Write audit trail to dunning_events table
 */
async function writeDunningAudit(
	db: DB,
	invoiceId: string,
	orgId: string,
	customerId: string,
	channel: "whatsapp" | "email" | "system",
	eventType: "reminder_sent" | "opted_out" | "manual_follow_up",
	result: "sent" | "skipped" | "error",
	templateUsed?: string,
): Promise<void> {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");

	const { error } = await db.from("dunning_events").insert({
		invoice_id: invoiceId,
		org_id: orgId,
		customer_id: customerId,
		event_type: eventType,
		channel,
		template_used: templateUsed ?? null,
		delivery_status: result,
		created_at: now.toString(),
		delivered_at: result === "sent" ? now.toString() : null,
	});

	if (error) {
		console.error("Failed to write dunning audit:", error);
	}
}

/**
 * Check if reminder was already sent today (idempotency check)
 */
async function isAlreadyProcessedToday(
	db: DB,
	dedupeKey: string,
): Promise<boolean> {
	// Use the webhook deduplication table for consistency
	const { data } = await db
		.from("webhook_events")
		.select("id")
		.eq("provider", "dunning")
		.eq("webhook_id", dedupeKey)
		.single();

	return data !== null;
}

/**
 * Mark as processed to prevent duplicate sends
 */
async function markAsProcessed(db: DB, dedupeKey: string): Promise<void> {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");

	await db.from("webhook_events").insert({
		provider: "dunning",
		webhook_id: dedupeKey,
		event_type: "reminder_sent",
		entity_type: "invoice",
		entity_id: dedupeKey.split(":")[1] ?? "", // Extract invoice ID from key
		processed_at: now.toString(),
	});
}

/**
 * Update invoice reminder tracking fields
 */
async function updateInvoiceReminderFields(
	db: DB,
	invoiceId: string,
	now: Temporal.ZonedDateTime,
): Promise<void> {
	// Calculate next reminder date (3 days from now, minimum)
	const nextReminderAt = now.add({ days: 3 });

	// Manual update since no increment RPC exists yet
	const { data: invoice } = await db
		.from("invoices")
		.select("reminder_count")
		.eq("id", invoiceId)
		.single();

	const newCount = (invoice?.reminder_count ?? 0) + 1;

	await db
		.from("invoices")
		.update({
			last_reminder_at: now.toString(),
			next_reminder_at: nextReminderAt.toString(),
			reminder_count: newCount,
		})
		.eq("id", invoiceId);
}

/**
 * Convert candidate to reminder message data
 */
function candidateToMessageData(
	candidate: Candidate,
	orgInfo?: OrgContactInfo,
): ReminderMessageData {
	const trimmedOrgName = orgInfo?.name.trim();
	const companyName =
		trimmedOrgName && trimmedOrgName.length > 0
			? trimmedOrgName
			: DEFAULT_COMPANY_NAME;
	const companyPhone = orgInfo?.phone ?? "";
	const baseData = {
		customerName: candidate.customerName,
		invoiceNumber: candidate.invoiceNumber,
		totalCents: candidate.totalCents,
		issuedAt: candidate.dueAt, // We'll calculate from due_at for now
		dueAt: candidate.dueAt,
		daysOverdue: candidate.daysOverdue,
		companyName,
		companyPhone,
	};

	if (candidate.paymentUrl) {
		return { ...baseData, paymentUrl: candidate.paymentUrl };
	}

	return baseData;
}

/**
 * Main dunning engine - processes eligible invoices and sends reminders
 */
export async function runDunning(
	db: DB,
	orgId?: string,
	batchSize = 50,
	dryRun = false,
): Promise<DunningRunResult> {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	const result: DunningRunResult = {
		candidates: 0,
		sent: 0,
		skipped: 0,
		failed: 0,
		errors: [],
	};

	// Select candidates
	const candidates = await selectCandidates(db, orgId, batchSize);
	result.candidates = candidates.length;

	if (candidates.length === 0) {
		return result;
	}

	const candidateOrgIds = Array.from(
		new Set(
			candidates
				.map((candidate) => candidate.orgId)
				.filter((value) => value.length > 0),
		),
	);

	const orgContactInfo = await fetchOrgContactInfo(db, candidateOrgIds);

	let sentToday = 0;

	for (const candidate of candidates) {
		// Respect daily cap
		if (sentToday >= dunningConfig.DUNNING_DAILY_CAP) {
			result.skipped++;
			await writeDunningAudit(
				db,
				candidate.invoiceId,
				candidate.orgId,
				candidate.customerId,
				"system",
				"manual_follow_up",
				"skipped",
			);
			continue;
		}

		// Check quiet hours
		if (!isWithinSendingWindow(now)) {
			// Schedule for next window instead of sending now
			const nextWindow = now.with({
				hour: dunningConfig.DUNNING_WINDOW_START_HOUR,
				minute: 0,
			});
			const scheduleTime =
				nextWindow.epochMilliseconds > now.epochMilliseconds
					? nextWindow
					: nextWindow.add({ days: 1 });

			await db
				.from("invoices")
				.update({
					next_reminder_at: scheduleTime.toString(),
				})
				.eq("id", candidate.invoiceId);

			result.skipped++;
			await writeDunningAudit(
				db,
				candidate.invoiceId,
				candidate.orgId,
				candidate.customerId,
				"system",
				"manual_follow_up",
				"skipped",
			);
			continue;
		}

		// Try WhatsApp first
		let sendResult: WhatsAppSendResult | EmailSendResult | null = null;
		let channel: "whatsapp" | "email" = "whatsapp";
		let templateName = `whatsapp_${candidate.severity}`;

		const phone = normalizeE164NL(candidate.whatsapp);
		const orgInfo =
			candidate.orgId.length > 0
				? orgContactInfo.get(candidate.orgId)
				: undefined;
		const messageData = candidateToMessageData(candidate, orgInfo);

		if (phone && dunningConfig.DUNNING_CHANNELS.includes("whatsapp")) {
			const dedupeKey = createDedupeKey(
				candidate.invoiceId,
				"whatsapp",
				templateName,
				now,
			);

			// Check if already sent today
			if (await isAlreadyProcessedToday(db, dedupeKey)) {
				result.skipped++;
				continue;
			}

			if (!dryRun) {
				sendResult = await sendWhatsAppReminder(db, phone, messageData);
			} else {
				sendResult = { ok: true };
			}

			if (!dryRun && sendResult.ok) {
				await markAsProcessed(db, dedupeKey);
			}
		}

		// Fallback to email if WhatsApp failed or not available
		if (
			!sendResult?.ok &&
			candidate.email &&
			dunningConfig.DUNNING_CHANNELS.includes("email")
		) {
			channel = "email";
			templateName = `email_${candidate.severity}`;
			const dedupeKey = createDedupeKey(
				candidate.invoiceId,
				"email",
				templateName,
				now,
			);

			// Check if already sent today
			if (await isAlreadyProcessedToday(db, dedupeKey)) {
				result.skipped++;
				continue;
			}

			if (!dryRun) {
				sendResult = await sendEmailReminder(candidate.email, messageData);
			} else {
				sendResult = { ok: true };
			}

			if (!dryRun && sendResult.ok) {
				await markAsProcessed(db, dedupeKey);
			}
		}

		// Record results and update counters
		if (sendResult?.ok) {
			result.sent++;
			sentToday++;

			if (!dryRun) {
				await updateInvoiceReminderFields(db, candidate.invoiceId, now);
			}

			await writeDunningAudit(
				db,
				candidate.invoiceId,
				candidate.orgId,
				candidate.customerId,
				channel,
				"reminder_sent",
				"sent",
				templateName,
			);
		} else {
			result.failed++;

			const errorMsg =
				sendResult?.ok === false ? sendResult.error : "Unknown error";
			if (errorMsg) {
				result.errors.push(`${candidate.invoiceNumber}: ${errorMsg}`);
			}

			await writeDunningAudit(
				db,
				candidate.invoiceId,
				candidate.orgId,
				candidate.customerId,
				channel,
				"reminder_sent",
				"error",
				templateName,
			);
		}
	}

	return result;
}
