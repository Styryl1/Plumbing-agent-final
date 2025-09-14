import "server-only";
import { serverOnlyEnv } from "~/lib/env";
import {
	generateReminderMessage,
	type ReminderMessageData,
} from "~/server/services/whatsapp/templates";

export type EmailSendResult =
	| { ok: true }
	| { ok: false; retry: boolean; code?: number; error?: string };

/**
 * Send email reminder using configured provider (Resend/SendGrid)
 * Falls back to no-op if provider is disabled
 */
export async function sendEmailReminder(
	to: string,
	messageData: ReminderMessageData,
): Promise<EmailSendResult> {
	const provider = serverOnlyEnv.EMAIL_PROVIDER;
	const apiKey = serverOnlyEnv.EMAIL_API_KEY;
	const fromAddress = serverOnlyEnv.EMAIL_FROM;

	// No-op if email is disabled
	if (provider === "disabled") {
		return { ok: true };
	}

	if (!apiKey || !fromAddress) {
		return {
			ok: false,
			retry: false,
			error: "Email provider not properly configured",
		};
	}

	// Generate subject and content
	const subject = `Betalingsherinnering factuur ${messageData.invoiceNumber}`;
	const textContent = generateReminderMessage(messageData);
	const htmlContent = textContent
		.split("\n")
		.map((line) => (line.trim() === "" ? "<br>" : `<p>${line}</p>`))
		.join("\n");

	try {
		let response: Response;

		if (provider === "resend") {
			response = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					from: fromAddress,
					to: [to],
					subject,
					text: textContent,
					html: htmlContent,
				}),
			});
		} else {
			response = await fetch("https://api.sendgrid.com/v3/mail/send", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					personalizations: [{ to: [{ email: to }] }],
					from: { email: fromAddress },
					subject,
					content: [
						{ type: "text/plain", value: textContent },
						{ type: "text/html", value: htmlContent },
					],
				}),
			});
		}

		if (response.status >= 500) {
			// Server error - retry
			const errorText = await response.text();
			return {
				ok: false,
				retry: true,
				code: response.status,
				error: `Server error: ${errorText}`,
			};
		}

		if (!response.ok) {
			// Client error - don't retry
			const errorText = await response.text();
			return {
				ok: false,
				retry: false,
				code: response.status,
				error: `Client error: ${errorText}`,
			};
		}

		return { ok: true };
	} catch (error) {
		// Network error - retry
		return {
			ok: false,
			retry: true,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}
