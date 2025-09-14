import { createHmac, timingSafeEqual } from "crypto";
import { useTranslations } from "next-intl";

export function verifyWhatsAppSignature({
	appSecret,
	rawBody,
	signatureHeader,
}: {
	appSecret: string;
	rawBody: string | Buffer;
	signatureHeader: string | null;
}): boolean {
	if (signatureHeader?.startsWith("sha256=") !== true) return false;
	const received = signatureHeader.slice(7);
	const body = typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody;
	const expectedHex = createHmac("sha256", appSecret)
		.update(body)
		.digest("hex");
	try {
		return timingSafeEqual(
			Buffer.from(expectedHex, "hex"),
			Buffer.from(received, "hex"),
		);
	} catch {
		return false;
	}
}
