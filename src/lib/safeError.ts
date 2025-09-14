import { useTranslations } from "next-intl";
export function toErrorMessage(e: unknown): string {
	if (typeof e === "string") return e;
	if (e instanceof Error && typeof e.message === "string") return e.message;

	if (typeof e === "object" && e !== null) {
		const maybeMsg = (e as { message?: unknown }).message;
		if (typeof maybeMsg === "string") return maybeMsg;
		try {
			return JSON.stringify(e);
		} catch {
			// fallthrough
		}
	}
	return "Unknown error";
}
