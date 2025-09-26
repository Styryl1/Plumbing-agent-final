import { z } from "zod";

export const Material = z.object({
	name: z.string().min(2),
	quantity: z.number().int().positive(),
	unit: z.enum(["pc", "m", "l", "kg", "set"]).optional(),
	notes: z.string().max(200).optional(),
	sku: z.string().optional(),
});

export const Slot = z.object({
	start: z.string(), // ISO 8601
	end: z.string(), // ISO 8601
	resourceId: z.string().optional(), // tech id or null for generic team
	reason: z.string().optional(),
	softHold: z.literal(true).default(true),
	holdTtlMinutes: z.number().int().min(5).max(60).default(10),
});

export const AiProposal = z.object({
	version: z.literal("1"),
	locale: z.enum(["en", "nl"]).default("nl"),
	confidence: z.number().min(0).max(1),
	job: z.object({
		title: z.string().min(3).max(120),
		category: z.enum([
			"leak",
			"clog",
			"boiler",
			"install",
			"diagnostic",
			"other",
		]),
		urgency: z.enum(["emergency", "urgent", "soon", "schedule"]),
		description: z.string().max(2000),
		materials: z.array(Material).max(20),
		laborMinutes: z
			.number()
			.int()
			.min(15)
			.max(8 * 60),
		estimateCents: z.object({
			min: z.number().int().min(0),
			max: z.number().int().min(0),
			vatRate: z.enum(["0", "9", "21"]),
		}),
		hazards: z
			.array(z.enum(["gas", "electric", "asbestos", "sewage"]))
			.default([]),
		photosRequired: z.boolean().default(false),
	}),
	slots: z.array(Slot).min(1).max(5),
	checklist: z.array(z.string().min(3).max(160)).max(15),
	cautions: z.array(z.string().min(3).max(200)).max(10),
});
export type TAiProposal = z.infer<typeof AiProposal>;
