import type { ProviderInvoiceStatus } from "../types";

/**
 * Maps WeFact invoice status to our standardized provider status
 * Conservative mapping - unknown statuses map to "unknown" and are audited
 */
export function mapWeFactStatus(wefactStatus: string): ProviderInvoiceStatus {
	const status = wefactStatus.toLowerCase().trim();

	switch (status) {
		// Draft/concept states
		case "concept":
		case "draft":
		case "incomplete":
			return "draft";

		// Sent states
		case "open":
		case "sent":
		case "verzonden":
		case "pending":
			return "sent";

		// Viewed states (if WeFact provides this)
		case "viewed":
		case "opened":
		case "bekeken":
			return "viewed";

		// Paid states
		case "paid":
		case "betaald":
		case "complete":
		case "completed":
			return "paid";

		// Overdue states
		case "overdue":
		case "late":
		case "te_laat":
		case "achterstallig":
			return "overdue";

		// Cancelled states
		case "cancelled":
		case "canceled":
		case "geannuleerd":
		case "void":
		case "invalid":
			return "cancelled";

		// Default to unknown for unmapped statuses
		default:
			return "unknown";
	}
}

/**
 * Get all known WeFact statuses for testing and validation
 */
export const KNOWN_WEFACT_STATUSES = [
	"concept",
	"draft",
	"incomplete",
	"open",
	"sent",
	"verzonden",
	"pending",
	"viewed",
	"opened",
	"bekeken",
	"paid",
	"betaald",
	"complete",
	"completed",
	"overdue",
	"late",
	"te_laat",
	"achterstallig",
	"cancelled",
	"canceled",
	"geannuleerd",
	"void",
	"invalid",
] as const;
