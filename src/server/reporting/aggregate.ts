import type { SupabaseClient } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { Temporal } from "temporal-polyfill";
import type { Database } from "~/types/supabase";

type DB = SupabaseClient<Database>;

const TZ = "Europe/Amsterdam";

/**
 * Compute local day window in Europe/Amsterdam timezone
 * Returns start/end ZonedDateTime and snapshot_date string
 */
function dayWindow(dateISO: string): {
	start: Temporal.ZonedDateTime;
	end: Temporal.ZonedDateTime;
	snapshot_date: string;
} {
	const z = Temporal.ZonedDateTime.from(dateISO).withTimeZone(TZ);
	const start = z.with({
		hour: 0,
		minute: 0,
		second: 0,
		millisecond: 0,
		microsecond: 0,
		nanosecond: 0,
	});
	const end = start.add({ days: 1 });
	// snapshot_date reflects the local day
	const snapshot_date = start.toPlainDate().toString(); // YYYY-MM-DD
	return { start, end, snapshot_date };
}

/**
 * Compute daily invoice snapshots for all orgs for the given date
 * Uses RLS-aware client, so source reads respect organization isolation
 * Returns number of successful upserts
 */
export async function computeDailySnapshot(
	db: DB,
	dateISO: string,
): Promise<number> {
	const { start, end, snapshot_date } = dayWindow(dateISO);

	// Pull minimal columns from invoices table (RLS applies)
	const { data: invoices, error } = await db
		.from("invoices")
		.select("org_id,total_cents,due_at,issued_at,paid_at");

	if (error != null || invoices.length === 0) {
		console.error("Failed to fetch invoices for snapshot:", error);
		return 0;
	}

	// Aggregate in memory grouped by org_id
	const byOrg = new Map<
		string,
		{
			total_invoices: number;
			sent_count: number;
			paid_count: number;
			revenue_paid_cents: number;
			revenue_outstanding_cents: number;
			overdue_count: number;
			overdue_cents: number;
			aging_0_7_cents: number;
			aging_8_30_cents: number;
			aging_31_60_cents: number;
			aging_61_plus_cents: number;
		}
	>();

	for (const inv of invoices) {
		const org = inv.org_id;
		const g = byOrg.get(org) ?? {
			total_invoices: 0,
			sent_count: 0,
			paid_count: 0,
			revenue_paid_cents: 0,
			revenue_outstanding_cents: 0,
			overdue_count: 0,
			overdue_cents: 0,
			aging_0_7_cents: 0,
			aging_8_30_cents: 0,
			aging_31_60_cents: 0,
			aging_61_plus_cents: 0,
		};

		g.total_invoices++;

		const issuedAt = Temporal.Instant.from(inv.issued_at);
		const paidAt = inv.paid_at ? Temporal.Instant.from(inv.paid_at) : null;
		const totalCents = inv.total_cents ?? 0;

		// Count invoices sent within the day window
		if (
			Temporal.Instant.compare(issuedAt, start.toInstant()) >= 0 &&
			Temporal.Instant.compare(issuedAt, end.toInstant()) < 0
		) {
			g.sent_count++;
		}

		// Count invoices paid within the day window
		if (
			paidAt &&
			Temporal.Instant.compare(paidAt, start.toInstant()) >= 0 &&
			Temporal.Instant.compare(paidAt, end.toInstant()) < 0
		) {
			g.paid_count++;
			g.revenue_paid_cents += totalCents;
		}

		// Handle unpaid invoices for outstanding revenue and aging
		const isPaid = inv.paid_at != null;
		if (!isPaid) {
			g.revenue_outstanding_cents += totalCents;

			// Calculate aging buckets based on due_at vs end of day
			if (inv.due_at) {
				const dueDate = Temporal.PlainDate.from(inv.due_at);
				const endDate = end.toPlainDate();
				const daysPastDue = endDate.since(dueDate).days;

				if (daysPastDue > 0) {
					g.overdue_count++;
					g.overdue_cents += totalCents;

					// Classify into aging buckets
					if (daysPastDue <= 7) {
						g.aging_0_7_cents += totalCents;
					} else if (daysPastDue <= 30) {
						g.aging_8_30_cents += totalCents;
					} else if (daysPastDue <= 60) {
						g.aging_31_60_cents += totalCents;
					} else {
						g.aging_61_plus_cents += totalCents;
					}
				}
			}
		}

		byOrg.set(org, g);
	}

	// Upsert snapshot for each org
	let upserts = 0;
	for (const [org_id, aggregates] of byOrg.entries()) {
		const { error: upsertError } = await db
			.from("invoice_daily_snapshots")
			.upsert({
				org_id,
				snapshot_date,
				...aggregates,
				updated_at: Temporal.Now.instant().toString(),
			});

		if (!upsertError) {
			upserts++;
		} else {
			console.error(
				`Failed to upsert snapshot for org ${org_id}:`,
				upsertError,
			);
		}
	}

	return upserts;
}
