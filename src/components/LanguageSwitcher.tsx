"use client";

import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useState, useTransition } from "react";

type Locale = "en" | "nl";

export function LanguageSwitcher({
	initialLocale,
}: {
	initialLocale: Locale;
}): JSX.Element {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [locale, setLocale] = useState<Locale>(initialLocale);

	async function setLanguage(next: Locale): Promise<void> {
		if (next === locale) return;
		setLocale(next);
		await fetch("/api/locale", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ locale: next }),
			cache: "no-store",
		});
		startTransition(() => {
			router.refresh();
		});
	}

	return (
		<div className="flex items-center gap-1">
			<button
				disabled={pending || locale === "nl"}
				onClick={() => {
					void setLanguage("nl");
				}}
				className={`text-sm px-2 py-1 rounded border transition-colors ${
					locale === "nl"
						? "bg-primary text-primary-foreground border-primary"
						: "bg-background hover:bg-accent text-muted-foreground border-border"
				}`}
				aria-pressed={locale === "nl"}
				type="button"
			>
				NL
			</button>
			<button
				disabled={pending || locale === "en"}
				onClick={() => {
					void setLanguage("en");
				}}
				className={`text-sm px-2 py-1 rounded border transition-colors ${
					locale === "en"
						? "bg-primary text-primary-foreground border-primary"
						: "bg-background hover:bg-accent text-muted-foreground border-border"
				}`}
				aria-pressed={locale === "en"}
				type="button"
			>
				EN
			</button>
		</div>
	);
}
