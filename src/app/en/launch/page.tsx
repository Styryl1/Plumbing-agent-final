import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { LaunchPageContent } from "~/components/launch/LaunchPageContent";
import {
	type LaunchCopy,
	LaunchCopySchema,
} from "~/components/launch/launchCopySchema";

async function loadCopy(): Promise<LaunchCopy> {
	const translations = await getTranslations({ locale: "en" });
	const raw = (translations as unknown as { raw: <T>(key: string) => T }).raw(
		"launch",
	);
	return LaunchCopySchema.parse(raw);
}

export async function generateMetadata(): Promise<Metadata> {
	const copy = await loadCopy();
	return {
		title: copy.meta.title,
		description: copy.meta.description,
		keywords: copy.meta.keywords,
	};
}

export default async function LaunchPageEN(): Promise<ReactElement> {
	const copy = await loadCopy();
	return <LaunchPageContent copy={copy} />;
}
