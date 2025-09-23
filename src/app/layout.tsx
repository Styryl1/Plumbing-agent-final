// src/app/layout.tsx
import "~/lib/polyfills"; // must be first

// ...rest of layout code

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import type { JSX } from "react";
import { TrpcProvider } from "~/components/providers/TrpcProvider";
import { Toaster } from "~/components/ui/sonner";
import { loadMessages } from "~/i18n";
import { NextIntlClientProvider } from "~/i18n/client";
import { resolveLocale } from "~/i18n/server";
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
						formats={formats}
					>
						<TrpcProvider>
							<div className="min-h-screen bg-background">{children}</div>
						</TrpcProvider>
					</NextIntlClientProvider>
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	);
}
