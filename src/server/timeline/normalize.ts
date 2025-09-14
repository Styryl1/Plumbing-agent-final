import { useTranslations } from "next-intl";
import { z } from "zod";

export const TimelineRow = z.object({
	invoice_id: z.uuid(),
	at: z.string(), // ISO timestamp from DB
	source: z.enum(["system", "provider", "payment", "dunning", "note"]),
	type: z.string(),
	meta: z.record(z.string(), z.any()).default({}),
});
export type TimelineRow = z.infer<typeof TimelineRow>;

export type TimelineItem = {
	at: string;
	kind: "created" | "sent" | "paid" | "reminder" | "note" | "other";
	label: string;
	icon: "sparkles" | "send" | "euro" | "bell" | "note" | "dot";
	meta?: Record<string, unknown>;
};

export function normalizeRow(row: TimelineRow): TimelineItem {
	// Map raw DB row to UI-friendly shape (no PII)

	if (row.source === "payment" && row.type === "paid") {
		return {
			at: row.at,
			kind: "paid",
			label: "Paid",
			icon: "euro",
			meta: row.meta,
		};
	}

	if (row.source === "provider" && row.type === "sent") {
		return {
			at: row.at,
			kind: "sent",
			label: "Sent",
			icon: "send",
			meta: row.meta,
		};
	}

	if (row.source === "dunning") {
		const eventType = String(row.meta.event_type ?? "");

		let label = "Reminder";
		if (row.type === "reminder_sent") {
			label = "Reminder sent";
		} else if (row.type === "reminder_error") {
			label = "Reminder failed";
		} else if (row.type === "reminder_skipped") {
			label = "Reminder skipped";
		} else if (row.type === "manual_follow_up") {
			label = "Manual follow-up";
		} else if (eventType === "opted_out") {
			label = "Opted out";
		}

		return {
			at: row.at,
			kind: "reminder",
			label,
			icon: "bell",
			meta: row.meta,
		};
	}

	if (row.type === "created") {
		return {
			at: row.at,
			kind: "created",
			label: "Created",
			icon: "sparkles",
			meta: row.meta,
		};
	}

	if (row.source === "note") {
		return {
			at: row.at,
			kind: "note",
			label: "Note",
			icon: "note",
			meta: row.meta,
		};
	}

	// Fallback for unknown types
	return {
		at: row.at,
		kind: "other",
		label: row.type,
		icon: "dot",
		meta: row.meta,
	};
}
