// Invoice Timeline Router (S10) - Read-only timeline for invoice lifecycle events
// Leverages invoice_timeline view for unified event aggregation

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mustSingle } from "~/server/db/unwrap";

// Input schema for invoice ID validation
export const InvoiceIdInput = z.object({
	id: z.uuid(),
});

// Timeline item schema with explicit return types
export const TimelineItem = z.object({
	at: z.iso.datetime(),
	kind: z.enum([
		"created",
		"sent",
		"paid",
		"reminder_sent",
		"reminder_error",
		"reminder_skipped",
		"manual_follow_up",
	]),
	note: z.string().min(1).optional(),
});

export type TimelineItem = z.infer<typeof TimelineItem>;

/**
 * Map timeline view event types to frontend-friendly kinds
 */
function mapEventTypeToKind(type: string): TimelineItem["kind"] {
	switch (type) {
		case "created":
			return "created";
		case "sent":
			return "sent";
		case "paid":
			return "paid";
		case "reminder_sent":
			return "reminder_sent";
		case "reminder_error":
			return "reminder_error";
		case "reminder_skipped":
			return "reminder_skipped";
		case "manual_follow_up":
			return "manual_follow_up";
		default:
			// Fallback for unknown types
			return "reminder_sent";
	}
}

/**
 * Generate user-friendly note for timeline events
 */
function generateEventNote(
	type: string,
	meta: Record<string, unknown>,
): string | undefined {
	switch (type) {
		case "sent":
			return "provider" in meta && typeof meta.provider === "string"
				? `Issued via ${meta.provider}`
				: "Invoice issued";
		case "paid":
			return "payment_method" in meta && typeof meta.payment_method === "string"
				? `Paid via ${meta.payment_method}`
				: "Payment received";
		case "reminder_sent":
			return "channel" in meta && typeof meta.channel === "string"
				? `Reminder sent via ${meta.channel}`
				: "Reminder sent";
		case "reminder_error":
			return "Reminder failed to send";
		case "reminder_skipped":
			return "Customer opted out";
		case "manual_follow_up":
			return "Manual follow-up required";
		default:
			return undefined;
	}
}

/**
 * Invoice Timeline Router
 * Provides read-only access to invoice lifecycle events
 */
export const invoiceTimelineRouter = createTRPCRouter({
	/**
	 * Get timeline events for a specific invoice
	 * Returns chronologically ordered events with RLS enforcement
	 */
	getByInvoiceId: protectedProcedure
		.input(InvoiceIdInput)
		.query(async ({ ctx, input }): Promise<TimelineItem[]> => {
			// First verify invoice exists and belongs to current org (RLS)
			try {
				mustSingle(
					await ctx.db
						.from("invoices")
						.select("id")
						.eq("id", input.id)
						.single(),
				);
			} catch {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invoice not found",
				});
			}

			// Query timeline view (RLS inheritance ensures org filtering)
			const { data: timelineData, error } = await ctx.db
				.from("invoice_timeline")
				.select("*")
				.eq("invoice_id", input.id)
				.order("at", { ascending: false }); // DESC by time

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch timeline events",
				});
			}

			// Transform database records to frontend DTOs
			const timelineItems: TimelineItem[] = timelineData
				.filter(
					(
						event,
					): event is NonNullable<typeof event> & {
						at: string;
						type: string;
					} => event.at != null && event.type != null,
				)
				.map((event) => {
					const meta = event.meta as Record<string, unknown>;
					const kind = mapEventTypeToKind(event.type);
					const note = generateEventNote(event.type, meta);

					return {
						at: event.at,
						kind,
						...(note != null && { note }),
					};
				});

			return timelineItems;
		}),
});
