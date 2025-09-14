import { useTranslations } from "next-intl";
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";
import "~/lib/time";
import { isEligibleForReminder } from "~/server/utils/due-dates";

type DB = SupabaseClient<Database>;

export interface Candidate {
	invoiceId: string;
	orgId: string;
	customerId: string;
	customerName: string;
	invoiceNumber: string;
	totalCents: number;
	dueAt: string;
	daysOverdue: number;
	whatsapp?: string | null;
	email?: string | null;
	severity: "gentle" | "firm" | "urgent" | "final";
	paymentUrl?: string | null;
}

/**
 * Select eligible invoices for dunning reminders
 * Uses the overdue_invoices view which filters by opt_out_dunning
 */
export async function selectCandidates(
	db: DB,
	orgId?: string,
	limit = 100,
): Promise<Candidate[]> {
	let query = db
		.from("overdue_invoices")
		.select(`
			id,
			number,
			total_cents,
			due_at,
			last_reminder_at,
			reminder_count,
			paid_at,
			customer_name,
			customer_email,
			customer_phone,
			opt_out_dunning,
			days_overdue,
			overdue_severity,
			org_id,
			customer_id,
			payment_url
		`)
		.limit(limit);

	if (orgId) {
		query = query.eq("org_id", orgId);
	}

	const { data, error } = await query;

	if (error) {
		console.error("Failed to select candidates:", error);
		return [];
	}

	if (data.length === 0) {
		return [];
	}

	const candidates: Candidate[] = [];

	for (const row of data) {
		// Double-check eligibility using our helper function
		const isEligible = isEligibleForReminder({
			paidAt: row.paid_at,
			dueAt: row.due_at,
			lastReminderAt: row.last_reminder_at,
			customerOptOut: row.opt_out_dunning ?? false,
			reminderCount: row.reminder_count ?? 0,
			maxReminders: 4,
		});

		if (!isEligible) continue;

		// Map overdue_severity to reminder urgency
		const severityMap: Record<string, Candidate["severity"]> = {
			mild: "gentle",
			moderate: "firm",
			severe: "urgent",
		};

		const overdueDays = row.days_overdue ?? 0;
		const severity = row.overdue_severity
			? (severityMap[row.overdue_severity] ?? "gentle")
			: overdueDays >= 60
				? "final"
				: "gentle";

		candidates.push({
			invoiceId: row.id ?? "",
			orgId: row.org_id ?? "",
			customerId: row.customer_id ?? "",
			customerName: row.customer_name ?? "Klant",
			invoiceNumber: row.number ?? "",
			totalCents: row.total_cents ?? 0,
			dueAt: row.due_at ?? "",
			daysOverdue: overdueDays,
			whatsapp: row.customer_phone,
			email: row.customer_email,
			severity,
			paymentUrl: row.payment_url,
		});
	}

	return candidates;
}
