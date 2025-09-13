"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

declare global {
	interface Window {
		gtag?: (
			command: "config" | "event" | "consent",
			targetId: string,
			config?: Record<string, unknown>,
		) => void;
	}
}

export function CookieConsent(): React.ReactElement | null {
	const [isVisible, setIsVisible] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const t = useTranslations();

	useEffect(() => {
		// Check if user has already made a choice
		const consent = localStorage.getItem("cookie-consent");
		if (!consent) {
			// Delay showing banner slightly for better UX
			const timer = setTimeout(() => {
				setIsVisible(true);
				setIsLoading(false);
			}, 2000);

			return () => {
				clearTimeout(timer);
			};
		} else {
			setIsLoading(false);
			// Update consent based on stored preference
			updateGoogleConsent(consent === "accepted");
		}
		// Explicitly return undefined for the else path
		return undefined;
	}, []);

	const updateGoogleConsent = (accepted: boolean): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("consent", "update", {
				ad_storage: accepted ? "granted" : "denied",
				ad_user_data: accepted ? "granted" : "denied",
				ad_personalization: accepted ? "granted" : "denied",
				analytics_storage: "granted", // Always allow basic analytics for GDPR compliance
			} as Record<string, unknown>);
		}
	};

	const handleAccept = (): void => {
		localStorage.setItem("cookie-consent", "accepted");
		updateGoogleConsent(true);
		setIsVisible(false);

		// Track the consent decision
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "consent_granted", {
				event_category: "privacy",
				event_label: "full_consent",
			} as Record<string, unknown>);
		}
	};

	const handleReject = (): void => {
		localStorage.setItem("cookie-consent", "rejected");
		updateGoogleConsent(false);
		setIsVisible(false);

		// Track the consent decision
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "consent_denied", {
				event_category: "privacy",
				event_label: "minimal_consent",
			} as Record<string, unknown>);
		}
	};

	const handleEssentialOnly = (): void => {
		localStorage.setItem("cookie-consent", "essential");
		updateGoogleConsent(false);
		setIsVisible(false);

		// Track the consent decision
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "consent_essential", {
				event_category: "privacy",
				event_label: "essential_only",
			} as Record<string, unknown>);
		}
	};

	if (isLoading || !isVisible) {
		return null;
	}

	return (
		<div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
			<Card className="shadow-xl border-l-4 border-l-emerald-500 animate-slide-up">
				<CardContent className="p-4">
					<div className="flex items-start justify-between mb-3">
						<div className="flex items-center gap-2 mb-2">
							<div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
								🍪
							</div>
							<h3 className="font-semibold text-sm">
								{t("launch.cookie_consent.title")}
							</h3>
						</div>
						<button
							onClick={() => {
								setIsVisible(false);
							}}
							className="text-gray-400 hover:text-gray-600 transition-colors"
							aria-label={t("launch.cookie_consent.close")}
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					<p className="text-sm text-gray-600 mb-4">
						{t("launch.cookie_consent.description")}
					</p>

					<div className="space-y-2">
						<div className="flex flex-col sm:flex-row gap-2">
							<Button
								onClick={handleAccept}
								size="sm"
								className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
							>
								{t("launch.cookie_consent.accept_all")}
							</Button>
							<Button
								onClick={handleEssentialOnly}
								variant="outline"
								size="sm"
								className="flex-1"
							>
								{t("launch.cookie_consent.essential_only")}
							</Button>
						</div>

						<div className="flex items-center justify-between text-xs">
							<button
								onClick={handleReject}
								className="text-gray-500 hover:text-gray-700 underline"
							>
								{t("launch.cookie_consent.reject_all")}
							</button>
							<Link
								href="/privacy"
								className="text-emerald-600 hover:text-emerald-700 underline"
							>
								{t("launch.cookie_consent.privacy_policy")}
							</Link>
						</div>
					</div>
				</CardContent>
			</Card>

			<style jsx>{`
				@keyframes slide-up {
					0% {
						transform: translateY(100px);
						opacity: 0;
					}
					100% {
						transform: translateY(0);
						opacity: 1;
					}
				}
				
				.animate-slide-up {
					animation: slide-up 0.4s ease-out;
				}
			`}</style>
		</div>
	);
}
