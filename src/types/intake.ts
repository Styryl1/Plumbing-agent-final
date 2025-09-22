import type { IntakeEventDetails } from "~/schema/intake";

export type IntakeMediaDTO = IntakeEventDetails["media"][number] & {
	signedUrl: string | null;
};

export type IntakeDetails = Omit<IntakeEventDetails, "media"> & {
	media: IntakeMediaDTO[];
};

export type IntakeSummaryDTO = {
	id: string;
	channel: IntakeEventDetails["channel"];
	status: string;
	priority: string;
	receivedAtIso: string;
	summary: string;
	snippet: string;
	media: IntakeMediaDTO[];
	whatsapp?: IntakeEventDetails["whatsapp"];
	voice?: IntakeEventDetails["voice"];
	unscheduledId: string | null;
	customer?: {
		id: string;
		name?: string;
		phoneE164?: string;
	};
};

export type IntakeDetailDTO = IntakeSummaryDTO & {
	details: IntakeDetails;
};
