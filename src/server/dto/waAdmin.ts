// WhatsApp Admin DTOs - Type definitions for WhatsApp number management
// Enforces strict typing for org-scoped WhatsApp configuration

import { z } from "zod";

// === INPUT SCHEMAS ===

export const waNumberUpsertSchema = z.object({
	phoneNumberId: z.string().min(5).max(100),
	label: z.enum(["business", "control"]),
});

export const seedNumbersSchema = z.object({
	businessId: z.string().min(5).max(100),
	controlId: z.string().min(5).max(100),
});

export const sendTestMessageSchema = z.object({
	to: z
		.string()
		.min(10)
		.max(20)
		.describe("Phone number in E.164 format (+31612345678)"),
	message: z
		.string()
		.min(1)
		.max(500)
		.optional()
		.describe("Optional custom test message"),
});

// === DTO TYPES ===

export type WaNumberDTO = {
	phoneNumberId: string;
	label: "business" | "control";
	createdAt: string;
};

export type WaHealthDTO = {
	envOk: boolean;
	webhookOk: boolean;
	secretOk: boolean;
	webhookUrl?: string | undefined;
	verifyToken?: string | undefined;
};

// === TYPE EXPORTS ===

export type WaNumberUpsertInput = z.infer<typeof waNumberUpsertSchema>;
export type SeedNumbersInput = z.infer<typeof seedNumbersSchema>;
export type SendTestMessageInput = z.infer<typeof sendTestMessageSchema>;
