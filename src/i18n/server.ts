import { getFormatter, getTranslations } from "next-intl/server";

export async function tServer(
	namespace?: string,
): Promise<Awaited<ReturnType<typeof getTranslations>>> {
	return getTranslations(namespace);
}

export async function fmtServer(): Promise<
	Awaited<ReturnType<typeof getFormatter>>
> {
	return getFormatter();
}
