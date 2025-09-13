"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface OAuthFeedbackProps {
	className?: string;
}

/**
 * Displays OAuth feedback messages based on URL parameters
 * Handles success and error states from provider OAuth flows
 */
export default function OAuthFeedbackHandler({
	className = "",
}: OAuthFeedbackProps): React.JSX.Element | null {
	const searchParams = useSearchParams();
	const t = useTranslations();
	const [message, setMessage] = useState<{
		type: "success" | "error";
		title: string;
		description: string;
	} | null>(null);

	useEffect(() => {
		// Check for success messages
		if (searchParams.get("success") === "moneybird_connected") {
			const selectAdmin = searchParams.get("select_admin") === "true";
			setMessage({
				type: "success",
				title: t("providers.oauth.success"),
				description: selectAdmin
					? t("providers.oauth.selectAdmin")
					: t("providers.oauth.moneybirdConnected"),
			});
			return;
		}

		// Check for error messages
		if (searchParams.get("error")) {
			const errorType = searchParams.get("error");
			const errorMessage = searchParams.get("message");

			const title = t("providers.oauth.error");
			let description = t("providers.oauth.genericError");

			switch (errorType) {
				case "oauth_error":
					description = errorMessage ?? t("providers.oauth.authError");
					break;
				case "csrf_error":
					description = t("providers.oauth.csrfError");
					break;
				case "invalid_state":
					description = t("providers.oauth.stateError");
					break;
				case "user_mismatch":
					description = t("providers.oauth.userMismatch");
					break;
				case "state_expired":
					description = t("providers.oauth.stateExpired");
					break;
				case "token_exchange_failed":
					description = t("providers.oauth.tokenError");
					break;
				case "admin_fetch_failed":
					description = t("providers.oauth.adminError");
					break;
				case "callback_error":
					description = t("providers.oauth.callbackError");
					break;
			}

			setMessage({
				type: "error",
				title,
				description,
			});
		}
	}, [searchParams, t]);

	// Auto-hide success messages after 5 seconds
	useEffect(() => {
		if (message?.type === "success") {
			const timer = setTimeout(() => {
				setMessage(null);
			}, 5000);
			return () => {
				clearTimeout(timer);
			};
		}
		return undefined;
	}, [message]);

	if (!message) return null;

	return (
		<Alert
			className={`${className} ${
				message.type === "success"
					? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30"
					: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30"
			}`}
		>
			{message.type === "success" ? (
				<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
			) : (
				<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
			)}
			<AlertDescription>
				<div className="font-medium mb-1">{message.title}</div>
				<div className="text-sm">{message.description}</div>
			</AlertDescription>
		</Alert>
	);
}
