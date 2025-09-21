import { createHmac, timingSafeEqual } from "node:crypto";
import { Temporal } from "temporal-polyfill";

export type VerifyMessagebirdSignatureParams = {
	secret: string | undefined;
	signature: string | null;
	timestamp: string | null;
	rawBody: string;
	toleranceSeconds?: number;
};

export function verifyMessagebirdSignature({
	secret,
	signature,
	timestamp,
	rawBody,
	toleranceSeconds = 300,
}: VerifyMessagebirdSignatureParams): boolean {
	if (!secret || !signature || !timestamp) return false;

	// Timestamp freshness check
	try {
		const tsInstant = Temporal.Instant.fromEpochMilliseconds(
			Number(timestamp) * 1000,
		);
		const now = Temporal.Now.instant();
		const diffSeconds = Math.abs(
			now.epochMilliseconds / 1000 - tsInstant.epochMilliseconds / 1000,
		);
		if (diffSeconds > toleranceSeconds) {
			return false;
		}
	} catch {
		return false;
	}

	const data = `${timestamp}${rawBody}`;
	const computed = createHmac("sha256", secret).update(data).digest();
	let provided: Buffer;
	try {
		provided = Buffer.from(signature, "base64");
	} catch {
		return false;
	}

	if (provided.length !== computed.length) {
		return false;
	}

	try {
		return timingSafeEqual(provided, computed);
	} catch {
		return false;
	}
}
