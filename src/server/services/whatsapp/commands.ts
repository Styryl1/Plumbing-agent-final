/**
 * Control Chat Commands Parser (S4)
 * Handles #approve/#reject/#send/#quote commands for plumber control workflow
 */

import { z } from "zod";

export type ControlAction =
	| { kind: "approve"; msgId: string }
	| { kind: "reject"; msgId: string; reason: string }
	| { kind: "send"; msgId: string }
	| { kind: "quote"; msgId: string };

export interface ControlCommandInput {
	text: string;
	orgId: string;
	phone: string;
}

const COMMAND_PATTERNS = {
	approve: /^#approve\s+([a-zA-Z0-9_-]+)/i,
	reject: /^#reject\s+([a-zA-Z0-9_-]+)\s+(.+)/i,
	send: /^#send\s+([a-zA-Z0-9_-]+)/i,
	quote: /^#quote\s+([a-zA-Z0-9_-]+)/i,
} as const;

/**
 * Parse control command from text input
 * Returns null if no valid command is found
 */
export function handleControlCommand(
	input: ControlCommandInput,
): ControlAction | null {
	const { text } = input;
	const trimmed = text.trim();

	// Check approve command
	const approveMatch = trimmed.match(COMMAND_PATTERNS.approve);
	if (approveMatch) {
		const msgId = approveMatch[1];
		if (msgId) {
			return { kind: "approve", msgId };
		}
	}

	// Check reject command
	const rejectMatch = trimmed.match(COMMAND_PATTERNS.reject);
	if (rejectMatch) {
		const msgId = rejectMatch[1];
		const reason = rejectMatch[2];
		if (msgId && reason) {
			return { kind: "reject", msgId, reason };
		}
	}

	// Check send command (fallback without analyzer)
	const sendMatch = trimmed.match(COMMAND_PATTERNS.send);
	if (sendMatch) {
		const msgId = sendMatch[1];
		if (msgId) {
			return { kind: "send", msgId };
		}
	}

	// Check quote command
	const quoteMatch = trimmed.match(COMMAND_PATTERNS.quote);
	if (quoteMatch) {
		const msgId = quoteMatch[1];
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
#reject <msgId> <reason> → Mark suggestion as rejected  
#send <msgId> → Send original message without analyzer
#quote <msgId> → Create draft quote/invoice and reply with link

Example: #approve wam_ABcd123XYZ
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
