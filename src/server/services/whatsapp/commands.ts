/**
 * Control Chat Commands Parser (S4)
 * Handles #approve/#reject/#send/#quote commands for plumber control workflow
 */

import { z } from "zod";

export type ControlAction =
	| { kind: "approve"; suggestionId: string; createJob?: boolean }
	| { kind: "reject"; suggestionId: string; reason: string }
	| { kind: "send"; msgId: string }
	| { kind: "quote"; msgId: string };

export interface ControlCommandInput {
	text: string;
	orgId: string;
	phone: string;
}

/**
 * Parse control command from text input
 * Returns null if no valid command is found
 */
export function handleControlCommand(
	input: ControlCommandInput,
): ControlAction | null {
	const { text } = input;
	const trimmed = text.trim().toLowerCase();
	const parts = trimmed.split(/\s+/);

	if (parts.length < 2 || !parts[0]?.startsWith("#")) {
		return null;
	}

	const command = parts[0];

	// Check approve job command first (more specific)
	if (command === "#approve" && parts.length >= 3 && parts[1] === "job") {
		const suggestionId = parts[2];
		if (suggestionId && isValidUuid(suggestionId)) {
			return { kind: "approve", suggestionId, createJob: true };
		}
	}

	// Check regular approve command
	if (command === "#approve" && parts.length >= 2 && parts[1] !== "job") {
		const suggestionId = parts[1];
		if (suggestionId && isValidUuid(suggestionId)) {
			return { kind: "approve", suggestionId, createJob: false };
		}
	}

	// Check reject command
	if (command === "#reject" && parts.length >= 3) {
		const suggestionId = parts[1];
		const reason = parts.slice(2).join(" ");
		if (suggestionId && isValidUuid(suggestionId) && reason.length > 0) {
			return { kind: "reject", suggestionId, reason };
		}
	}

	// Check send command
	if (command === "#send" && parts.length >= 2) {
		const msgId = parts[1];
		if (msgId) {
			return { kind: "send", msgId };
		}
	}

	// Check quote command
	if (command === "#quote" && parts.length >= 2) {
		const msgId = parts[1];
		if (msgId) {
			return { kind: "quote", msgId };
		}
	}

	return null;
}

/**
 * Validate message ID format
 */
export function isValidMessageId(msgId: string): boolean {
	// WhatsApp message IDs are typically alphanumeric with underscores/hyphens
	return /^[a-zA-Z0-9_-]{10,100}$/.test(msgId);
}

/**
 * Validate UUID format for suggestion IDs
 */
export function isValidUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		id,
	);
}

/**
 * Get help text for control commands
 */
export function getCommandHelp(): string {
	return `
📋 Control Chat Commands:

#approve <suggestionId> → Relay analyzed suggestion to customer
#approve job <suggestionId> → Same as above + create Job from suggestion  
#reject <suggestionId> <reason> → Mark suggestion as rejected  
#send <msgId> → Send original message without analyzer
#quote <msgId> → Create draft quote/invoice and reply with link

Example: #approve job 123e4567-e89b-12d3-a456-426614174000
	`.trim();
}

/**
 * Schema for validating command inputs
 */
export const ControlCommandSchema = z.object({
	text: z.string().min(1),
	orgId: z.uuid(),
	phone: z.string().min(10),
});

export type ValidatedControlCommand = z.infer<typeof ControlCommandSchema>;
