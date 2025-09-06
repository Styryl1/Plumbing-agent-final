// src/app/layout.tsx
import "~/lib/polyfills"; // must be first

// ...rest of layout code

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { getLocale, getMessages } from "next-intl/server";
import type { JSX } from "react";
import { Temporal } from "temporal-polyfill";
import { TrpcProvider } from "~/components/providers/TrpcProvider";
import { Toaster } from "~/components/ui/sonner";
import type { Locale } from "~/i18n";
import SafeNextIntlClientProvider from "~/lib/i18n/SafeNextIntlClientProvider";
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
	// Get all serializable i18n config from server functions (configured via request.ts)
	const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

	// Pin timezone and formats for invoice consistency (prevents hydration drift)
	const pinnedTimeZone = "Europe/Amsterdam";
	const nowMs =
		Temporal.Now.zonedDateTimeISO(pinnedTimeZone).toInstant().epochMilliseconds;

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
					<SafeNextIntlClientProvider
						locale={locale}
						messages={messages}
						timeZone={pinnedTimeZone}
						now={nowMs}
						formats={formats}
					>
						<TrpcProvider>
							<div className="min-h-screen bg-background">
								<DashboardHeader initialLocale={locale as Locale} />
								<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
									{children}
								</main>
							</div>
						</TrpcProvider>
					</SafeNextIntlClientProvider>
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	);
}
