import { useTranslations } from "next-intl";
/**
 * Webhook Signature Verification
 *
 * CRITICAL SECURITY: This is the ONLY place where service-role DB access is allowed.
 * All webhooks MUST verify signatures before processing to prevent injection attacks.
 */

import { createHmac } from "crypto";
import { headers } from "next/headers";
import { Webhook } from "svix"; // Clerk webhook verification
import { Temporal } from "temporal-polyfill";
import { env } from "~/lib/env";

/**
 * Verify webhook signatures from different providers
 * @throws {Error} if signature verification fails
 */
export async function verifyWebhookSignature(
	request: Request,
	provider: "clerk" | "whatsapp" | "mollie",
): Promise<unknown> {
	const body = await request.text();
	const headersList = await headers();

	switch (provider) {
		case "clerk":
			return verifyClerkSignature(body, headersList);
		case "whatsapp":
			return verifyWhatsAppSignature(body, headersList);
		case "mollie":
			return verifyMollieSignature(body, headersList);
		default: {
			const exhaustiveCheck: never = provider;
			throw new Error(`Unknown webhook provider: ${exhaustiveCheck as string}`);
		}
	}
}

/**
 * Verify Clerk webhook signature using Svix
 */
function verifyClerkSignature(body: string, headers: Headers): unknown {
	const webhookSecret = env.CLERK_WEBHOOK_SECRET;
	if (!webhookSecret) {
		throw new Error("CLERK_WEBHOOK_SECRET not configured");
	}

	const svixId = headers.get("svix-id");
	const svixTimestamp = headers.get("svix-timestamp");
	const svixSignature = headers.get("svix-signature");

	if (!svixId || !svixTimestamp || !svixSignature) {
		throw new Error("Missing Clerk webhook headers");
	}

	const wh = new Webhook(webhookSecret);

	try {
		// Verify and parse the webhook
		return wh.verify(body, {
			"svix-id": svixId,
			"svix-timestamp": svixTimestamp,
			"svix-signature": svixSignature,
		});
	} catch (error) {
		throw new Error(`Invalid Clerk webhook signature: ${String(error)}`);
	}
}

/**
 * Verify WhatsApp webhook signature (Meta/Facebook)
 */
function verifyWhatsAppSignature(body: string, headers: Headers): unknown {
	const signature = headers.get("x-hub-signature-256");
	if (!signature) {
		throw new Error("Missing WhatsApp webhook signature");
	}

	const webhookSecret = env.WHATSAPP_APP_SECRET;
	if (!webhookSecret) {
		throw new Error("WHATSAPP_APP_SECRET not configured");
	}

	// WhatsApp uses SHA256 HMAC
	const expectedSignature = createHmac("sha256", webhookSecret)
		.update(body)
		.digest("hex");

	const actualSignature = signature.replace("sha256=", "");

	if (actualSignature !== expectedSignature) {
		throw new Error("Invalid WhatsApp webhook signature");
	}

	return JSON.parse(body);
}

/**
 * Verify Mollie webhook signature
 * Note: Mollie doesn't use signatures, they use webhook URLs with verification tokens
 * and IP allowlisting. For now, we'll verify the token in the URL.
 */
function verifyMollieSignature(body: string, headers: Headers): unknown {
	// Mollie sends a verification token in the webhook URL
	// Example: /api/webhooks/mollie with URL parameters
	const url = new URL(headers.get("x-forwarded-url") ?? "");
	const token = url.searchParams.get("token");

	const expectedToken = env.MOLLIE_WEBHOOK_TOKEN;
	if (!expectedToken) {
		throw new Error("MOLLIE_WEBHOOK_TOKEN not configured");
	}

	if (token !== expectedToken) {
		throw new Error("Invalid Mollie webhook token");
	}

	// Optionally verify Mollie IP addresses (recommended for production)
	// const forwardedFor = headers.get("x-forwarded-for");
	// const mollieIPs = [
	//   // Mollie's webhook IP ranges (update from their docs)
	//   "87.233.217.24/29",
	//   "87.233.217.32/28",
	//   // Add more as needed
	// ];

	// TODO: Implement IP range checking for production

	return JSON.parse(body);
}

/**
 * Log webhook processing for audit trail
 */
export function logWebhookEvent(
	provider: string,
	eventType: string,
	payload: unknown,
	success: boolean,
	error?: string,
): void {
	// In production, log to your audit system
	console.error({
		timestamp: Temporal.Now.instant().toString(),
		provider,
		eventType,
		success,
		error,
		// Don't log sensitive payload data in production
		payloadSize: JSON.stringify(payload).length,
	});
}
