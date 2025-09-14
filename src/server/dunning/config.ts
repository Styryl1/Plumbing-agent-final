import { useTranslations } from "next-intl";
import "server-only";
import { z } from "zod";

const schema = z.object({
	DUNNING_DAILY_CAP: z.coerce.number().int().positive().default(50),
	DUNNING_WINDOW_START_HOUR: z.coerce.number().int().min(0).max(23).default(9),
	DUNNING_WINDOW_END_HOUR: z.coerce.number().int().min(0).max(23).default(18),
	DUNNING_DEFAULT_LOCALE: z.enum(["nl", "en"]).default("nl"),
	DUNNING_CHANNELS: z
		.array(z.enum(["whatsapp", "email"]))
		.default(["whatsapp", "email"]),
});

// Use defaults for now - these can be made configurable later
const parsed = schema.safeParse({});

if (!parsed.success) {
	console.error(
		"❌ Invalid dunning configuration:",
		z.treeifyError(parsed.error),
	);
	if (typeof window === "undefined") {
		process.exit(1);
	}
}

export const dunningConfig = Object.freeze(parsed.data!);
export type DunningConfig = typeof dunningConfig;
