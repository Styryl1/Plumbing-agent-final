import type { IntakeEventDetails } from "~/schema/intake";

export type IntakeDetails = IntakeEventDetails;

export type IntakeSummaryDTO = {
	id: string;
	channel: IntakeEventDetails["channel"];
	status: string;
	priority: string;
	receivedAtIso: string;
	summary: string;
	snippet: string;
	media: IntakeEventDetails["media"];
	whatsapp?: IntakeEventDetails["whatsapp"];
	voice?: IntakeEventDetails["voice"];
	unscheduledId: string | null;
};

export type IntakeDetailDTO = IntakeSummaryDTO & {
	details: IntakeEventDetails;
};
