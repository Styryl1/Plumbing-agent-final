import { z } from "zod";

export const DiagnosisMaterialSchema = z.object({
	name: z.string().min(1, "material.name_required"),
	qty: z.number().positive().optional(),
});

export const DiagnosisSuggestionSchema = z.object({
	issue: z.string().min(2),
	confidence: z.number().min(0).max(1),
	urgency: z.enum(["non-urgent", "urgent", "emergency"]),
	materials: z.array(DiagnosisMaterialSchema).default([]),
	labor_hours: z.number().min(0).max(24),
	time_estimate_minutes: z
		.number()
		.int()
		.min(0)
		.max(8 * 60)
		.optional(),
	notes: z.array(z.string().min(1)).default([]),
});

const AiRunMessageSchema = z.object({
	id: z.string().min(1),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
});

export const AiRunInputSchema = z.object({
	messages: z.array(AiRunMessageSchema),
	voiceTranscript: z.string().min(1).optional().nullable(),
	ocrSnippets: z.array(z.string().min(1)).optional(),
	extraNotes: z.string().min(1).optional().nullable(),
	locale: z.enum(["nl", "en"]).optional(),
});

export const SttResponseSchema = z.object({
	transcript: z.string().min(1),
	lang: z.enum(["nl", "en"]).default("nl"),
	confidence: z.number().min(0).max(1).optional(),
});

export const ScreenshotOcrResultSchema = z.object({
	text: z.string().min(1),
	source: z.enum(["client", "server"]).default("client"),
});

export const AiRunCreateSchema = z.object({
	conversationId: z.uuid().optional(),
	customerId: z.uuid().optional(),
	jobId: z.uuid().optional(),
	input: AiRunInputSchema,
	output: DiagnosisSuggestionSchema,
	model: z.string().min(2),
	latencyMs: z.number().int().nonnegative(),
	costCents: z.number().int().nonnegative().optional(),
	learningEvent: z
		.object({
			type: z.enum([
				"diagnosis_edit",
				"time_edit",
				"material_edit",
				"note_edit",
			]),
			before: DiagnosisSuggestionSchema.optional(),
			after: DiagnosisSuggestionSchema,
		})
		.optional(),
});

export type DiagnosisSuggestion = z.infer<typeof DiagnosisSuggestionSchema>;
export type DiagnosisMaterial = z.infer<typeof DiagnosisMaterialSchema>;
export type SttResponse = z.infer<typeof SttResponseSchema>;
export type ScreenshotOcrResult = z.infer<typeof ScreenshotOcrResultSchema>;
export type AiRunInput = z.infer<typeof AiRunInputSchema>;
export type AiRunCreateInput = z.infer<typeof AiRunCreateSchema>;
