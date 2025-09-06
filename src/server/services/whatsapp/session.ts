import { Temporal } from "temporal-polyfill";

export function isWithin24h(
	lastInboundIso: string | null | undefined,
): boolean {
	if (!lastInboundIso) return false;
	try {
		const last = Temporal.Instant.from(lastInboundIso);
		const now = Temporal.Now.instant();
		const diff = now.epochMilliseconds - last.epochMilliseconds;
		return diff <= 24 * 60 * 60 * 1000;
	} catch {
		return false;
	}
}
