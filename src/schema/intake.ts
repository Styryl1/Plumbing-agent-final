import { z } from "zod";

export const MediaRefSchema = z.object({
	storageKey: z.string(),
	mime: z.string(),
	byteSize: z.number().int().nonnegative(),
	checksumSha256: z.string().length(64),
	width: z.number().int().optional(),
	height: z.number().int().optional(),
	source: z.enum(["whatsapp", "voice", "upload"]).optional(),
});

export const TranscriptSchema = z.object({
	text: z.string(),
	lang: z.enum(["nl", "en"]),
	confidence: z.number().min(0).max(1).optional(),
	provider: z.enum(["whisper", "messagebird"]).optional(),
});

export const AnalyzerResultSchema = z.object({
	issue: z.string(),
	urgency: z.enum(["normal", "urgent", "emergency"]),
	timeEstimateMin: z.number().int().positive(),
	materials: z
		.array(
			z.object({
				name: z.string(),
				qty: z.number().positive(),
				unit: z.string().optional(),
			}),
		)
		.default([]),
	confidence: z.number().min(0).max(1),
});

export const IntakeEventDetailsSchema = z.object({
	channel: z.enum(["whatsapp", "voice"]),
	summary: z.string().max(280),
	snippet: z.string().max(500),
	lastMessageIso: z.iso.datetime(),
	media: z.array(MediaRefSchema).default([]),
	analyzer: AnalyzerResultSchema.optional(),
	whatsapp: z
		.object({
			waContactId: z.string(),
			waConversationId: z.string(),
			lastMessageId: z.string(),
			messageIds: z.array(z.string()).min(1),
		})
		.optional(),
	voice: z
		.object({
			callId: z.string(),
			direction: z.enum(["inbound", "outbound"]).optional(),
			callerNumber: z.string().optional(),
			receiverNumber: z.string().optional(),
			durationSeconds: z.number().int().nonnegative().optional(),
			recording: MediaRefSchema.optional(),
			transcript: TranscriptSchema.optional(),
		})
		.optional(),
});

export type MediaRef = z.infer<typeof MediaRefSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;
export type AnalyzerResult = z.infer<typeof AnalyzerResultSchema>;
export type IntakeEventDetails = z.infer<typeof IntakeEventDetailsSchema>;
