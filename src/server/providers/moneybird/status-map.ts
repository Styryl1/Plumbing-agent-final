import type { ProviderInvoiceStatus } from "../types";

/**
 * Maps Moneybird invoice state to our standardized provider status
 * Based on Moneybird API documentation:
 * - "draft" → draft
 * - "open" → sent (invoice sent but not paid)
 * - "paid" → paid
 * - Everything else defaults to sent (conservative)
 */
export function mapMoneybirdStatus(
	moneybirdState: string,
): ProviderInvoiceStatus {
	const state = moneybirdState.toLowerCase().trim();

	switch (state) {
		case "draft":
			return "draft";
		case "open":
			return "sent";
		case "paid":
			return "paid";
		case "late":
		case "overdue":
			return "overdue";
		default:
			// Conservative fallback - treat unknown states as sent
			return "sent";
	}
}

/**
 * Get all known Moneybird statuses for testing and validation
 */
export const KNOWN_MONEYBIRD_STATUSES = [
	"draft",
	"open",
	"paid",
	"late",
	"overdue",
] as const;
