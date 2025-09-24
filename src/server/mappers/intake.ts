import { Temporal } from "temporal-polyfill";
import { parseZdt } from "~/lib/time";
import type { IntakeEventDetails } from "~/schema/intake";
import { IntakeEventDetailsSchema } from "~/schema/intake";
import type {
	IntakeDetailDTO,
	IntakeDetails,
	IntakeMediaDTO,
	IntakeSummaryDTO,
} from "~/types/intake";
import type { Tables } from "~/types/supabase";

type IntakeRow = Tables<"intake_events">;
type UnscheduledRow = Pick<
	Tables<"unscheduled_items">,
	"status" | "priority" | "id"
>;

function withSignedMedia(details: IntakeEventDetails): IntakeDetails {
	const media = details.media.map((item) => ({
		...(item as IntakeMediaDTO),
		signedUrl: null,
	}));
	return {
		...details,
		media,
	};
}

function parseDetails(raw: unknown): IntakeDetails {
	const result = IntakeEventDetailsSchema.safeParse(raw);
	if (!result.success) {
		console.warn("Failed to parse intake details", {
			issues: result.error.issues.map((issue) => issue.message),
		});
		const fallback = IntakeEventDetailsSchema.parse({
			channel: "whatsapp",
			summary: "Onbekende intake",
			snippet: "",
			lastMessageIso: Temporal.Now.instant().toString(),
		});
		return withSignedMedia(fallback);
	}
	return withSignedMedia(result.data);
}

function isUnscheduledRow(value: unknown): value is UnscheduledRow {
	if (value === null || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.status === "string" &&
		typeof candidate.priority === "string"
	);
}

export function toIntakeSummary(
	row: IntakeRow & { unscheduled?: unknown },
	timezone?: string,
): IntakeSummaryDTO {
	const details = parseDetails(row.details);
	const unscheduledEntry = Array.isArray(row.unscheduled)
		? (row.unscheduled.find(isUnscheduledRow) ?? null)
		: null;

	const receivedIso =
		typeof row.received_at === "string"
			? parseZdt(row.received_at, timezone).toInstant().toString()
			: Temporal.Now.instant().toString();

	const status =
		typeof unscheduledEntry?.status === "string"
			? unscheduledEntry.status
			: typeof row.status === "string"
				? row.status
				: "pending";

	const priority =
		typeof unscheduledEntry?.priority === "string"
			? unscheduledEntry.priority
			: typeof row.priority === "string"
				? row.priority
				: "normal";

	const summaryText =
		typeof row.summary === "string" && row.summary.trim().length > 0
			? row.summary
			: details.summary;

	return {
		id: row.id,
		channel: details.channel,
		status,
		priority,
		receivedAtIso: receivedIso,
		summary: summaryText,
		snippet: details.snippet,
		media: details.media,
		whatsapp: details.whatsapp,
		voice: details.voice,
		unscheduledId: unscheduledEntry?.id ?? null,
	};
}

export function toIntakeDetail(
	row: IntakeRow & { unscheduled?: unknown },
	timezone?: string,
): IntakeDetailDTO {
	const summary = toIntakeSummary(row, timezone);
	const details = parseDetails(row.details);

	return {
		...summary,
		details,
	};
}
