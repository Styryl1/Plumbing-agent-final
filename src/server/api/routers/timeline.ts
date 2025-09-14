import { useTranslations } from "next-intl";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rowsOrEmpty } from "~/server/db/unwrap";
import { normalizeRow, TimelineRow } from "~/server/timeline/normalize";

export const timelineRouter = createTRPCRouter({
	/**
	 * Get timeline events for a specific invoice
	 * Returns chronologically ordered events from invoice_timeline view
	 * Inherits RLS from underlying tables (invoices, dunning_events)
	 */
	getInvoiceTimeline: protectedProcedure
		.input(z.object({ invoiceId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			// Query the invoice_timeline view with RLS enforcement
			const resp = await ctx.db
				.from("invoice_timeline")
				.select("*")
				.eq("invoice_id", input.invoiceId)
				.order("at", { ascending: true });

			const rows = rowsOrEmpty(resp);

			// Validate and normalize rows for UI consumption
			return rows
				.map((r) => TimelineRow.safeParse(r))
				.filter((p) => p.success)
				.map((p) => normalizeRow(p.data));
		}),

	// Future enhancement: Add note functionality
	// Keeping minimal for S10 diff budget
	// addInvoiceNote: protectedProcedure
	//   .input(z.object({ invoiceId: z.uuid(), text: z.string().min(1) }))
	//   .mutation(async ({ ctx, input }) => {
	//     // Implementation for adding system notes to timeline
	//     // This would insert into a notes table that gets picked up by the timeline view
	//     return { success: true };
	//   }),
});
