"use client";

import {
	type AbstractIntlMessages,
	IntlErrorCode,
	NextIntlClientProvider,
} from "next-intl";
import type { JSX, ReactNode } from "react";
import { useCallback } from "react";

type Messages = AbstractIntlMessages;

type Props = {
	locale: string;
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
			// Silently ignore missing message errors - they're handled by getMessageFallback
			return;
		}
		// Only log actual errors (not missing messages)
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
			return isMissingMessage ? path : `__${path}__`;
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
