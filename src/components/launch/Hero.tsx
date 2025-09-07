"use client";

import { ArrowRightIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "~/components/ui/button";

export function Hero(): React.ReactElement {
	const t = useTranslations();
	const pathname = usePathname();
	const locale = pathname.includes("/en/") ? "en" : "nl";

	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
						{t("launch.hero.h1")}
					</h1>
					<p className="mt-6 text-lg leading-8 text-gray-600">
						{t("launch.hero.sub")}
					</p>
					<div className="mt-10 flex items-center justify-center gap-x-6">
						<Button
							asChild
							size="lg"
							className="bg-emerald-600 hover:bg-emerald-700"
						>
							<Link href={`/${locale}/launch/demo`}>
								<PlayIcon className="mr-2 h-4 w-4" />
								{t("launch.hero.cta_demo")}
							</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link href="#waitlist">
								{t("launch.hero.cta_waitlist")}
								<ArrowRightIcon className="ml-2 h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
