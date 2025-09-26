import { z } from "zod";

export const VoiceRecommendationSchema = z.object({
	version: z.literal("1").default("1"),
	summary: z.string().min(8).max(400),
	action: z.string().min(8).max(400),
	confidence: z.number().min(0).max(1),
	urgency: z.enum(["low", "medium", "high"]).default("medium"),
	job: z
		.object({
			title: z.string().min(3).max(120),
			description: z.string().min(10).max(800),
			durationMinutes: z
				.number()
				.int()
				.min(15)
				.max(8 * 60)
				.optional(),
			priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
		})
		.optional(),
	notes: z.array(z.string().min(3).max(160)).max(10).default([]),
	tags: z.array(z.string().min(2).max(40)).max(10).default([]),
	risks: z.array(z.string().min(3).max(120)).max(10).default([]),
});

export type VoiceRecommendationPayload = z.infer<
	typeof VoiceRecommendationSchema
>;
