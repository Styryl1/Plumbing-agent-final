"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "~/components/ui/button";

export function LocaleSwitcher(): React.ReactElement {
	const pathname = usePathname();
	const currentLocale = pathname.includes("/en/") ? "en" : "nl";
	const targetLocale = currentLocale === "nl" ? "en" : "nl";
	const targetPath = pathname.replace(
		`/${currentLocale}/`,
		`/${targetLocale}/`,
	);

	return (
		<Button
			asChild
			variant="ghost"
			size="sm"
			className="fixed top-4 right-4 z-50"
		>
			<Link href={targetPath} hrefLang={targetLocale}>
				{targetLocale === "en" ? "🇬🇧 English" : "🇳🇱 Nederlands"}
			</Link>
		</Button>
	);
}
