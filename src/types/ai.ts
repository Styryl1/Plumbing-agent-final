export interface AiRecommendationDTO {
	id: string;
	createdIso: string;
	title: string;
	summary?: string;
	confidence: number;
	confidenceScore: number;
	intakeEventId: string | null;
	conversationId: string | null;
	customer?: { name?: string; phoneE164?: string };
	estimate?: {
		durationMinutes?: number;
		materials?: Array<{ name: string; qty: number; unit?: string }>;
	};
	media?: string[];
	urgency: "low" | "medium" | "high";
	tags: string[];
	source: "rule" | "openai";
}
