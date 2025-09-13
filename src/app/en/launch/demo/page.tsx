import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import React from "react";
import { DemoStepper } from "~/components/launch/DemoStepper";
import { Button } from "~/components/ui/button";

export function generateMetadata(): Metadata {
	return {
		title: "Happy Path Demo - Plumbing Agent",
		description:
			"Interactive demo of plumber workflow: WhatsApp to paid invoice in 7 steps",
		robots: {
			index: false,
			follow: true,
		},
	};
}

export default function DemoPageEN(): React.ReactElement {
	const t = useTranslations();
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Navigation */}
			<nav className="border-b bg-white">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						<div className="flex items-center gap-4">
							<Button asChild variant="ghost" size="sm">
								<Link href="/en/launch" className="flex items-center gap-2">
									<ArrowLeftIcon className="h-4 w-4" />
									{t("launch.demo.page.back")}
								</Link>
							</Button>
							<h1 className="text-xl font-semibold">
								{t("launch.demo.page.title")}
							</h1>
						</div>
						<Button asChild variant="outline">
							<Link href="/en/launch#waitlist">
								{t("launch.demo.page.cta.button")}
							</Link>
						</Button>
					</div>
				</div>
			</nav>

			{/* Content */}
			<div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
				{/* Introduction */}
				<div className="mb-8 text-center">
					<h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
						{t("launch.demo.page.headline")}
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						{t("launch.demo.page.subtitle")}
					</p>
				</div>

				{/* Demo stepper */}
				<DemoStepper />

				{/* Call to action */}
				<div className="mt-12 text-center">
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
						<h3 className="text-2xl font-bold text-emerald-900 mb-2">
							{t("launch.demo.page.cta.headline")}
						</h3>
						<p className="text-emerald-800 mb-6">
							{t("launch.demo.page.cta.subtitle")}
						</p>
						<Button
							asChild
							size="lg"
							className="bg-emerald-600 hover:bg-emerald-700"
						>
							<Link href="/en/launch#waitlist">
								{t("launch.demo.page.cta.button")}
							</Link>
						</Button>
					</div>
				</div>

				{/* Benefits recap */}
				<div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
					<div className="text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
							<span className="text-xl">⚡</span>
						</div>
						<h3 className="mt-4 text-lg font-semibold">
							{t("launch.demo.page.benefits.faster.title")}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							{t("launch.demo.page.benefits.faster.description")}
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
							<span className="text-xl">🧠</span>
						</div>
						<h3 className="mt-4 text-lg font-semibold">
							{t("launch.demo.page.benefits.smarter.title")}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							{t("launch.demo.page.benefits.smarter.description")}
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
							<span className="text-xl">💰</span>
						</div>
						<h3 className="mt-4 text-lg font-semibold">
							{t("launch.demo.page.benefits.better_paid.title")}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							{t("launch.demo.page.benefits.better_paid.description")}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
