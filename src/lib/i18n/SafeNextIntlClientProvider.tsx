"use client";

import type { AbstractIntlMessages } from "next-intl";
import { IntlErrorCode, NextIntlClientProvider } from "next-intl";
import type { JSX, ReactNode } from "react";
import { useCallback } from "react";
import type { Locale } from "~/i18n/config";
import { envClient } from "~/lib/env-client";

type Messages = AbstractIntlMessages;

type Props = {
	locale: Locale;
	messages: Messages;
	timeZone?: string;
	formats?: Record<string, unknown>;
	now?: number | Date | undefined; // Accept number, Date, or undefined
	children: ReactNode;
};

export default function SafeNextIntlClientProvider({
	locale,
	messages,
	timeZone,
	formats,
	now,
	children,
}: Props): JSX.Element {
	const onError = useCallback((err: unknown) => {
		if (
			typeof err === "object" &&
			err !== null &&
			"code" in err &&
			(err as { code: unknown }).code === IntlErrorCode.MISSING_MESSAGE
		) {
			// In development, log missing message details for debugging
			if (envClient.NODE_ENV === "development") {
				console.warn(
					"[i18n] Missing translation key:",
					(err as { message?: string }).message,
					"\n🔍 Add this key to both en and nl namespace files, then run 'pnpm i18n:aggregate'",
				);
			}
			return;
		}
		// Log other intl errors
		console.error("[i18n] Intl error:", err);
	}, []);

	const getMessageFallback = useCallback(
		({
			namespace,
			key,
			error,
		}: {
			namespace?: string;
			key: string;
			error: unknown;
		}) => {
			const path = [namespace, key].filter(Boolean).join(".");
			const isMissingMessage =
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				(error as { code: unknown }).code === IntlErrorCode.MISSING_MESSAGE;

			if (isMissingMessage) {
				if (envClient.NODE_ENV === "development") {
					// Visual warning in development - makes missing keys obvious
					return `🚨 ${path}`;
				} else {
					// In production, return the key path (English fallback should prevent this)
					return path;
				}
			}

			// For other errors, wrap in double underscores
			return `__${path}__`;
		},
		[],
	);

	// Build props object with only defined values for exactOptionalPropertyTypes
	const providerProps: Parameters<typeof NextIntlClientProvider>[0] = {
		locale,
		messages,
		onError,
		getMessageFallback,
		children,
	};

	if (timeZone !== undefined) {
		providerProps.timeZone = timeZone;
	}

	if (formats !== undefined) {
		providerProps.formats = formats;
	}

	if (now !== undefined) {
		providerProps.now = typeof now === "number" ? new Date(now) : now;
	}

	return <NextIntlClientProvider {...providerProps} />;
}
