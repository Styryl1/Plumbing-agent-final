import { z } from "zod";

export const BrandModelMatch = z.object({
	brand: z.string().min(2),
	model: z.string().min(1),
	confidence: z.number().min(0).max(1),
	needsRatingPlate: z.boolean().default(false),
	localeHint: z.enum(["nl", "en"]).optional(),
});

export const ManualCandidate = z.object({
	sourceUrl: z.url(),
	sourceDomain: z.string(),
	brand: z.string(),
	model: z.string(),
	language: z.enum(["nl", "en"]).optional(),
	version: z.string().optional(),
	isOfficial: z.boolean().default(false),
});

export const ManualAnswer = z.object({
	answer: z.string().min(5),
	citations: z
		.array(
			z.object({
				page: z.number().int().min(1),
				snippet: z.string().min(3).max(240),
				url: z.url(),
			}),
		)
		.min(1),
	safetyMode: z.boolean().default(false),
});

export type TBrandModelMatch = z.infer<typeof BrandModelMatch>;
export type TManualCandidate = z.infer<typeof ManualCandidate>;
export type TManualAnswer = z.infer<typeof ManualAnswer>;
