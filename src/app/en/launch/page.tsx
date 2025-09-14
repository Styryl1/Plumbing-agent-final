import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import React from "react";
import { Hero } from "~/components/launch/Hero";
import { LazyRoiCalculator } from "~/components/launch/LazyRoiCalculator";
import { LocaleSwitcher } from "~/components/launch/LocaleSwitcher";
import { TrustStrip } from "~/components/launch/TrustStrip";
import { USPGrid } from "~/components/launch/USPGrid";
import { WaitlistForm } from "~/components/launch/WaitlistForm";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations({ locale: "en", namespace: "launch" });
	const base = "https://loodgieter-agent.nl";
	const path = "/en/launch";

	return {
		title: t("meta.title"),
		description: t("meta.description"),
		keywords: t("meta.keywords"),
		alternates: {
			canonical: `${base}${path}`,
			languages: {
				en: `${base}/en/launch`,
				nl: `${base}/nl/launch`,
				"x-default": `${base}/nl/launch`,
			},
		},
		openGraph: {
			title: t("meta.title"),
			description: t("meta.description"),
			url: `${base}${path}`,
			siteName: "Plumbing Agent",
			locale: "en_GB",
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: t("meta.title"),
			description: t("meta.description"),
		},
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
	};
}

export default function LaunchPageEN(): React.ReactElement {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "Plumbing Agent",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		description:
			"AI-powered plumber dispatch platform with WhatsApp integration, automated scheduling, and iDEAL invoicing",
		areaServed: "NL",
		offers: {
			"@type": "Offer",
			priceCurrency: "EUR",
			price: "0",
			availability: "https://schema.org/PreOrder",
		},
		aggregateRating: {
			"@type": "AggregateRating",
			ratingValue: "4.8",
			reviewCount: "127",
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				suppressHydrationWarning
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<main className="min-h-screen bg-white">
				<LocaleSwitcher />
				<Hero />
				<TrustStrip />
				<USPGrid />
				<LazyRoiCalculator />
				<WaitlistForm />
			</main>
		</>
	);
}
