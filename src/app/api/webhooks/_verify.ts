/**
 * Webhook Signature Verification
 *
 * CRITICAL SECURITY: This is the ONLY place where service-role DB access is allowed.
 * All webhooks MUST verify signatures before processing to prevent injection attacks.
 */

import { createHmac } from "crypto";
import ipaddr from "ipaddr.js";
import { headers } from "next/headers";
import { Webhook } from "svix"; // Clerk webhook verification
import { Temporal } from "temporal-polyfill";
import { env } from "~/lib/env";

type ParsedAddress = ReturnType<typeof ipaddr.parse>;

const isIPv4 = (
	address: ParsedAddress | ipaddr.IPv4 | ipaddr.IPv6,
): address is ipaddr.IPv4 => address.kind() === "ipv4";

const isIPv6 = (
	address: ParsedAddress | ipaddr.IPv4 | ipaddr.IPv6,
): address is ipaddr.IPv6 => address.kind() === "ipv6";

function isAllDigits(value: string): boolean {
	if (value.length === 0) {
		return false;
	}
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code < 48 || code > 57) {
			return false;
		}
	}
	return true;
}

function parseIpCandidate(value: string): ParsedAddress | null {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const variants = new Set<string>();
	variants.add(trimmed);

	if (trimmed.startsWith("[") && trimmed.includes("]")) {
		const closingIndex = trimmed.indexOf("]");
		if (closingIndex > 1) {
			variants.add(trimmed.slice(1, closingIndex));
		}
	}

	const colonIndex = trimmed.lastIndexOf(":");
	if (colonIndex > -1) {
		const before = trimmed.slice(0, colonIndex);
		const after = trimmed.slice(colonIndex + 1);
		if (before.includes(".") && isAllDigits(after)) {
			variants.add(before);
		}
	}

	const zoneIndex = trimmed.indexOf("%");
	if (zoneIndex !== -1) {
		const candidate = trimmed.slice(0, zoneIndex);
		if (candidate.length > 0) {
			variants.add(candidate);
		}
	}

	for (const candidate of variants) {
		try {
			return ipaddr.parse(candidate);
		} catch {
			continue;
		}
	}

	return null;
}

function isAddressInRanges(
	address: ParsedAddress,
	ranges: readonly string[],
): boolean {
	return ranges.some((range) => {
		try {
			if (range.includes("/")) {
				const [network, prefix] = ipaddr.parseCIDR(range);
				if (isIPv4(address) && isIPv4(network)) {
					return address.match(network, prefix);
				}
				if (isIPv6(address) && isIPv6(network)) {
					return address.match(network, prefix);
				}
				return false;
			}

			const target = ipaddr.parse(range);
			if (isIPv4(address) && isIPv4(target)) {
				return address.toNormalizedString() === target.toNormalizedString();
			}
			if (isIPv6(address) && isIPv6(target)) {
				return address.toNormalizedString() === target.toNormalizedString();
			}
			return false;
		} catch {
			return false;
		}
	});
}

function ensureMollieIpAllowed(headers: Headers): void {
	const allowedRanges = env.MOLLIE_WEBHOOK_ALLOWED_IPS;
	if (allowedRanges.length === 0) {
		return;
	}

	const forwardedFor = headers.get("x-forwarded-for");
	const realIp = headers.get("x-real-ip");
	const candidates = [
		...(forwardedFor ? forwardedFor.split(",") : []),
		realIp ?? "",
	]
		.map(parseIpCandidate)
		.filter((address): address is ParsedAddress => address !== null);

	if (candidates.length === 0) {
		throw new Error("Unable to determine Mollie webhook source IP");
	}

	const isAllowed = candidates.some((address) =>
		isAddressInRanges(address, allowedRanges),
	);

	if (!isAllowed) {
		throw new Error("Mollie webhook IP not allowed");
	}
}

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

	ensureMollieIpAllowed(headers);

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
