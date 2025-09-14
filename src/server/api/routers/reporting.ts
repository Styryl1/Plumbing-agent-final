import { useTranslations } from "next-intl";
// Reporting tRPC router - Daily/weekly invoice snapshots and aggregates
// Returns PII-free aggregated data for reporting dashboards

import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";
import type { Database, Tables } from "~/types/supabase";

// === TYPES ===

type WeeklySummary = {
	week: string;
	from_date: string;
	to_date: string;
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
};

// === ZOD VALIDATION SCHEMAS ===

const DateRangeInput = z.object({
	from: z.iso.date("Invalid from date"),
	to: z.iso.date("Invalid to date"),
});

// === HELPER FUNCTIONS ===

/**
 * Simple ISO week calculation for weekly rollup using Temporal
 * Returns format: "YYYY-Www"
 */
function getISOWeek(dateStr: string): string {
	const plainDate = Temporal.PlainDate.from(dateStr);
	const year = plainDate.year;
	const weekNo = plainDate.weekOfYear;
	return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Get daily snapshots for date range
 */
async function getDaily(
	db: SupabaseClient<Database>,
	orgId: string,
	from: string,
	to: string,
): Promise<Tables<"invoice_daily_snapshots">[]> {
	const result = await db
		.from("invoice_daily_snapshots")
		.select("*")
		.eq("org_id", orgId)
		.gte("snapshot_date", from)
		.lte("snapshot_date", to)
		.order("snapshot_date", { ascending: true });

	return rowsOrEmpty(result);
}

/**
 * Get weekly rollup from daily snapshots
 */
async function getWeekly(
	db: SupabaseClient<Database>,
	orgId: string,
	from: string,
	to: string,
): Promise<WeeklySummary[]> {
	const daily = await getDaily(db, orgId, from, to);

	// Group by ISO week and sum the metrics
	const byWeek: Record<string, WeeklySummary> = {};

	for (const dailyRow of daily) {
		const week = getISOWeek(dailyRow.snapshot_date);
		const existing = byWeek[week] ?? {
			week,
			from_date: dailyRow.snapshot_date,
			to_date: dailyRow.snapshot_date,
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

		// Update date range
		existing.to_date = dailyRow.snapshot_date;

		// Sum all numeric metrics
		existing.total_invoices += dailyRow.total_invoices;
		existing.sent_count += dailyRow.sent_count;
		existing.paid_count += dailyRow.paid_count;
		existing.revenue_paid_cents += dailyRow.revenue_paid_cents;
		existing.revenue_outstanding_cents += dailyRow.revenue_outstanding_cents;
		existing.overdue_count += dailyRow.overdue_count;
		existing.overdue_cents += dailyRow.overdue_cents;
		existing.aging_0_7_cents += dailyRow.aging_0_7_cents;
		existing.aging_8_30_cents += dailyRow.aging_8_30_cents;
		existing.aging_31_60_cents += dailyRow.aging_31_60_cents;
		existing.aging_61_plus_cents += dailyRow.aging_61_plus_cents;

		byWeek[week] = existing;
	}

	return Object.values(byWeek).sort((a, b) =>
		a.from_date < b.from_date ? -1 : 1,
	);
}

// === TRPC ROUTER ===

export const reportingRouter = createTRPCRouter({
	/**
	 * Get daily invoice snapshots for date range
	 */
	getDaily: protectedProcedure
		.input(DateRangeInput)
		.query(async ({ ctx, input }) => {
			try {
				return await getDaily(ctx.db, ctx.auth.orgId, input.from, input.to);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch daily snapshots",
					cause: error,
				});
			}
		}),

	/**
	 * Get weekly rollup of invoice snapshots for date range
	 */
	getWeekly: protectedProcedure
		.input(DateRangeInput)
		.query(async ({ ctx, input }) => {
			try {
				return await getWeekly(ctx.db, ctx.auth.orgId, input.from, input.to);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch weekly rollup",
					cause: error,
				});
			}
		}),
});
