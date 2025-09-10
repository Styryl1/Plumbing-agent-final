/**
 * Control Chat Commands Parser (S4)
 * Handles #approve/#reject/#send/#quote commands for plumber control workflow
 */

import { z } from "zod";

export type ControlAction =
	| { kind: "approve"; msgId: string; createJob?: boolean }
	| { kind: "reject"; msgId: string; reason: string }
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
		const msgId = parts[2];
		if (msgId) {
			return { kind: "approve", msgId, createJob: true };
		}
	}

	// Check regular approve command
	if (command === "#approve" && parts.length >= 2 && parts[1] !== "job") {
		const msgId = parts[1];
		if (msgId) {
			return { kind: "approve", msgId, createJob: false };
		}
	}

	// Check reject command
	if (command === "#reject" && parts.length >= 3) {
		const msgId = parts[1];
		const reason = parts.slice(2).join(" ");
		if (msgId && reason.length > 0) {
			return { kind: "reject", msgId, reason };
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
 * Get help text for control commands
 */
export function getCommandHelp(): string {
	return `
📋 Control Chat Commands:

#approve <msgId> → Relay analyzed suggestion to customer
#approve job <msgId> → Same as above + create Job from suggestion  
#reject <msgId> <reason> → Mark suggestion as rejected  
#send <msgId> → Send original message without analyzer
#quote <msgId> → Create draft quote/invoice and reply with link

Example: #approve job wam_ABcd123XYZ
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
