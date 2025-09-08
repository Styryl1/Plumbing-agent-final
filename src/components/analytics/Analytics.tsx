"use client";

import Script from "next/script";
import React, { useEffect } from "react";
import { envClient } from "~/lib/env-client";

declare global {
	interface Window {
		gtag?: (
			command: "config" | "event" | "consent",
			targetId: string,
			config?: Record<string, unknown>,
		) => void;
		dataLayer?: unknown[];
	}
}

interface AnalyticsProps {
	measurementId?: string;
}

export function Analytics({
	measurementId,
}: AnalyticsProps): React.ReactElement | null {
	// Get measurement ID from environment or use default
	const gaId =
		measurementId ?? envClient.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-XXXXXXXX";

	// Only load analytics in production or when explicitly enabled
	if (typeof window === "undefined") {
		return null; // Server-side rendering
	}

	// Check if analytics should be loaded (client-side only)
	const analyticsEnabled = envClient.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

	if (!analyticsEnabled) {
		return null;
	}

	return (
		<>
			{/* Google Analytics 4 */}
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
				strategy="afterInteractive"
			/>
			<Script
				id="google-analytics"
				strategy="afterInteractive"
				dangerouslySetInnerHTML={{
					__html: `
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						
						// Set default consent state (GDPR compliant)
						gtag('consent', 'default', {
							'ad_storage': 'denied',
							'ad_user_data': 'denied',
							'ad_personalization': 'denied',
							'analytics_storage': 'granted'
						});
						
						gtag('js', new Date());
						gtag('config', '${gaId}', {
							page_title: document.title,
							page_location: window.location.href,
							custom_map: {
								'custom_parameter_1': 'demo_step',
								'custom_parameter_2': 'roi_calculation'
							}
						});
					`,
				}}
			/>
		</>
	);
}

// Custom analytics helper functions
export const analytics = {
	// Track conversion events
	trackConversion: (
		eventName: string,
		value?: number,
		currency: string = "EUR",
	): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", eventName, {
				event_category: "conversion",
				value: value,
				currency: currency,
				send_to: "AW-CONVERSION-ID", // Replace with actual conversion ID
			} as Record<string, unknown>);
		}
	},

	// Track demo interactions
	trackDemoEvent: (
		action: string,
		stepId?: string,
		stepNumber?: number,
	): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "demo_interaction", {
				event_category: "demo",
				event_label: stepId,
				custom_parameter_1: stepId,
				step_number: stepNumber,
				action: action,
			} as Record<string, unknown>);
		}
	},

	// Track ROI calculator usage
	trackROICalculation: (
		adminHours: number,
		timeSaved: number,
		yearlyValue: number,
	): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "roi_calculated", {
				event_category: "roi_calculator",
				event_label: "calculation_completed",
				custom_parameter_2: "roi_calculation",
				admin_hours_input: adminHours,
				time_saved: timeSaved,
				yearly_value: yearlyValue,
				value: yearlyValue / 1000, // Track value in thousands
				currency: "EUR",
			} as Record<string, unknown>);
		}
	},

	// Track waitlist signups
	trackWaitlistSignup: (email: string): void => {
		if (typeof window !== "undefined" && window.gtag) {
			// Hash email for privacy
			const emailHash = btoa(email).substring(0, 8);

			window.gtag("event", "sign_up", {
				method: "waitlist",
				event_category: "conversion",
				event_label: "waitlist_signup",
				user_hash: emailHash,
			} as Record<string, unknown>);

			// Track as conversion
			analytics.trackConversion("waitlist_signup", 1);
		}
	},

	// Track page views with enhanced data
	trackPageView: (pagePath: string, pageTitle: string): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "page_view", {
				page_title: pageTitle,
				page_location: window.location.href,
				page_path: pagePath,
				content_group1: pagePath.includes("/launch") ? "marketing" : "app",
			} as Record<string, unknown>);
		}
	},

	// Track scroll depth (for engagement)
	trackScrollDepth: (percentage: number): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "scroll", {
				event_category: "engagement",
				event_label: `${percentage}%`,
				value: percentage,
			} as Record<string, unknown>);
		}
	},

	// Track button clicks with context
	trackButtonClick: (
		buttonText: string,
		location: string,
		destination?: string,
	): void => {
		if (typeof window !== "undefined" && window.gtag) {
			window.gtag("event", "click", {
				event_category: "button",
				event_label: buttonText,
				button_location: location,
				link_destination: destination,
			} as Record<string, unknown>);
		}
	},
};

// React hook for scroll depth tracking
export function useScrollDepth(): void {
	useEffect(() => {
		const scrollMilestones = [25, 50, 75, 90];
		const reached = new Set<number>();

		const handleScroll = (): void => {
			const scrollPercent = Math.round(
				(window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
					100,
			);

			scrollMilestones.forEach((milestone) => {
				if (scrollPercent >= milestone && !reached.has(milestone)) {
					reached.add(milestone);
					analytics.trackScrollDepth(milestone);
				}
			});
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);
}
