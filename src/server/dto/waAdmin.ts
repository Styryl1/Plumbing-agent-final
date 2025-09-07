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
};

// === TYPE EXPORTS ===

export type WaNumberUpsertInput = z.infer<typeof waNumberUpsertSchema>;
export type SeedNumbersInput = z.infer<typeof seedNumbersSchema>;
