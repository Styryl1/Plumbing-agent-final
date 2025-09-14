// src/app/layout.tsx
import "~/lib/polyfills"; // must be first

// ...rest of layout code

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import type { JSX } from "react";
import { Temporal } from "temporal-polyfill";
import { TrpcProvider } from "~/components/providers/TrpcProvider";
import PilotModeBanner from "~/components/system/PilotModeBanner";
import { Toaster } from "~/components/ui/sonner";
import { type Locale, loadMessages } from "~/i18n";
import { NextIntlClientProvider } from "~/i18n/client";
import { resolveLocale } from "~/i18n/server";
import { DashboardHeader } from "./(dashboard)/DashboardHeader";
import TemporalPolyfill from "./TemporalPolyfill";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Loodgieter Agent - Emergency Plumber Dispatch",
	description:
		"Netherlands-first AI-powered emergency plumber dispatch platform",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>): Promise<JSX.Element> {
	// Get locale from Clerk user preference (with fallback chain) and load messages
	const locale = await resolveLocale();
	const messages = loadMessages(locale);

	// Pin timezone and formats for invoice consistency (prevents hydration drift)
	const pinnedTimeZone = "Europe/Amsterdam";
	const nowDate = new Date(
		Temporal.Now.zonedDateTimeISO(pinnedTimeZone).toInstant().epochMilliseconds,
	);

	// Dutch invoice formatting standards
	const formats = {
		number: {
			currency: {
				style: "currency" as const,
				currency: "EUR",
				currencyDisplay: "symbol" as const,
				minimumFractionDigits: 2,
			},
		},
		dateTime: {
			invoiceDate: { dateStyle: "medium" as const },
			invoiceDateTime: {
				dateStyle: "medium" as const,
				timeStyle: "short" as const,
			},
		},
	} as const;

	return (
		<ClerkProvider afterSignOutUrl="/sign-in">
			<html lang={locale}>
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased`}
				>
					<TemporalPolyfill />
					{/* Client: receives serializable props from server, adds function props */}
					<NextIntlClientProvider
						locale={locale}
						messages={messages}
						timeZone={pinnedTimeZone}
						now={nowDate}
						formats={formats}
					>
						<TrpcProvider>
							<div className="min-h-screen bg-background">
								<PilotModeBanner />
								<DashboardHeader initialLocale={locale} />
								<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
									{children}
								</main>
							</div>
						</TrpcProvider>
					</NextIntlClientProvider>
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	);
}
