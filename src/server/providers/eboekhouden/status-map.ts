import "server-only";
import type { ProviderInvoiceStatus } from "../types";

/**
 * Map e-Boekhouden invoice status to standardized provider status
 * Conservative mapping - unknown statuses mapped to "unknown" for safety
 *
 * Based on e-Boekhouden REST API documentation:
 * - "concept" / "draft" → draft
 * - "verzonden" / "sent" → sent
 * - "getoond" / "viewed" / "opened" → viewed (if exposed)
 * - "betaald" / "paid" → paid
 * - "te_laat" / "overdue" / "late" → overdue
 * - "geannuleerd" / "cancelled" → cancelled
 */
export function mapEBoekhoudenStatus(rawStatus: string): ProviderInvoiceStatus {
	const normalized = rawStatus.toLowerCase().trim();

	switch (normalized) {
		// Draft states
		case "concept":
		case "draft":
		case "ontwerp":
			return "draft";

		// Sent states
		case "verzonden":
		case "sent":
		case "verstuurd":
			return "sent";

		// Viewed states (if supported by e-Boekhouden)
		case "getoond":
		case "viewed":
		case "bekeken":
		case "opened":
			return "viewed";

		// Paid states
		case "betaald":
		case "paid":
		case "voldaan":
			return "paid";

		// Overdue states
		case "te_laat":
		case "overdue":
		case "late":
		case "achterstallig":
			return "overdue";

		// Cancelled states
		case "geannuleerd":
		case "cancelled":
		case "gecanceld":
		case "ingetrokken":
			return "cancelled";

		// Unknown status - log for investigation but don't fail
		default: {
			console.warn(
				`Unknown e-Boekhouden status encountered: "${rawStatus}". Mapping to "unknown".`,
				{
					component: "eboekhouden.status-map",
					rawStatus,
					timestamp: Temporal.Now.instant().toString(),
				},
			);
			return "unknown";
		}
	}
}

/**
 * Get human-readable Dutch status description for debugging
 */
export function getEBoekhoudenStatusDescription(
	status: ProviderInvoiceStatus,
): string {
	switch (status) {
		case "draft":
			return "Concept - factuur is nog niet verzonden";
		case "sent":
			return "Verzonden - factuur is verstuurd naar klant";
		case "viewed":
			return "Bekeken - klant heeft factuur geopend";
		case "paid":
			return "Betaald - factuur is volledig voldaan";
		case "overdue":
			return "Achterstallig - betaaltermijn is verstreken";
		case "cancelled":
			return "Geannuleerd - factuur is ingetrokken";
		case "unknown":
			return "Onbekend - status kon niet worden bepaald";
		default:
			// Handle exhaustive case checking - this should never happen at runtime
			return `Onbekende status: ${status as string}`;
	}
}
