"use client";

import {
	ArrowRightIcon,
	CheckCircleIcon,
	PlayIcon,
	ShieldCheckIcon,
	StarIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import React from "react";
import { analytics } from "~/components/analytics/Analytics";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export function Hero(): React.ReactElement {
	const t = useTranslations();
	const pathname = usePathname();
	const locale = pathname.includes("/en/") ? "en" : "nl";

	const handleDemoClick = (): void => {
		analytics.trackButtonClick(
			t("launch.hero.cta_demo"),
			"hero_section",
			`/${locale}/launch/demo`,
		);
		analytics.trackConversion("demo_cta_click", 1);
	};

	const handleWaitlistClick = (): void => {
		analytics.trackButtonClick(
			t("launch.hero.cta_waitlist"),
			"hero_section",
			"#waitlist",
		);
	};

	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 py-16 sm:py-24">
			{/* Floating background elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-20 w-32 h-32 bg-emerald-200/20 rounded-full blur-xl animate-pulse" />
				<div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/20 rounded-full blur-xl animate-pulse delay-1000" />
			</div>

			<div className="mx-auto max-w-7xl px-6 lg:px-8 relative">
				<div className="mx-auto max-w-2xl text-center">
					{/* Urgency Badge with animation */}
					<Badge
						variant="secondary"
						className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-200 animate-bounce"
					>
						<StarIcon className="mr-1 h-3 w-3 animate-spin" />
						{t("launch.hero.urgency")}
					</Badge>

					<h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl animate-fade-in-up">
						{t("launch.hero.h1")}
					</h1>
					<p className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in-up delay-150">
						{t("launch.hero.subhead")}
					</p>

					{/* Social Proof Counter with staggered animation */}
					<div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 animate-fade-in-up delay-300">
						<div className="flex -space-x-1">
							{[1, 2, 3, 4, 5].map((i) => (
								<div
									key={i}
									className="h-8 w-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold animate-fade-in-up hover:scale-110 transition-transform cursor-pointer"
									style={{ animationDelay: `${300 + i * 100}ms` }}
								>
									{String.fromCharCode(64 + i)}
								</div>
							))}
						</div>
						<span className="animate-fade-in-up delay-700">
							{t("launch.hero.social_proof")}
						</span>
					</div>

					{/* Trust Badges with fade-in */}
					<div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 animate-fade-in-up delay-500">
						<div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
							<ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
							<span>{t("launch.trust.avg_compliant")}</span>
						</div>
						<div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
							<CheckCircleIcon className="h-4 w-4 text-emerald-500" />
							<span>{t("launch.trust.ideal_certified")}</span>
						</div>
						<div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
							<CheckCircleIcon className="h-4 w-4 text-emerald-500" />
							<span>{t("launch.trust.kvk_registered")}</span>
						</div>
					</div>

					<div className="mt-10 flex items-center justify-center gap-x-6 animate-fade-in-up delay-700">
						<Button
							asChild
							size="lg"
							className="bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
							onClick={handleDemoClick}
						>
							<Link href={`/${locale}/launch/demo`}>
								<PlayIcon className="mr-2 h-4 w-4 group-hover:animate-pulse" />
								{t("launch.hero.cta_demo")}
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
							onClick={handleWaitlistClick}
						>
							<Link href="#waitlist">
								{t("launch.hero.cta_waitlist")}
								<ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
							</Link>
						</Button>
					</div>
				</div>
			</div>

			<style jsx>{`
				@keyframes fade-in-up {
					0% {
						opacity: 0;
						transform: translateY(20px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}
				
				.animate-fade-in-up {
					animation: fade-in-up 0.6s ease-out forwards;
					opacity: 0;
				}
				
				.delay-150 { animation-delay: 150ms; }
				.delay-300 { animation-delay: 300ms; }
				.delay-500 { animation-delay: 500ms; }
				.delay-700 { animation-delay: 700ms; }
			`}</style>
		</section>
	);
}
