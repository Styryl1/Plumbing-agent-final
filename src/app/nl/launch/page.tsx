import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { JSX, ReactNode } from "react";
import {
	CalendarDemo,
	ChatDemo,
	InvoiceTimelineDemo,
	LiveTicker,
} from "~/components/launch/DemoStepper";
import { LazyRoiCalculator } from "~/components/launch/LazyRoiCalculator";
import { WaitlistForm } from "~/components/launch/WaitlistForm";

const BASE_URL = "https://loodgieter-agent.nl";

type HeroTickerItem = {
	label: string;
	message: string;
	time: string;
	tone: "success" | "info" | "neutral";
};

type HeroKpi = {
	value: string;
	label: string;
};

type FeatureCard = {
	title: string;
	description: string;
	bullets: string[];
};

type DemoContent = {
	title: string;
	description: string;
	cta: string;
	steps: {
		badge: string;
		title: string;
		body: string;
		role: "customer" | "ai" | "organiser" | "system";
	}[];
};

type Testimonial = {
	name: string;
	role: string;
	quote: string;
};

type FooterLinkGroup = {
	title: string;
	links: { label: string; href: string }[];
};

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function createLaunchHelpers(translator: Translator): {
	translate: (key: string) => string;
	raw: <T>(key: string) => T;
} {
	const translate = translator as unknown as (key: string) => string;
	function raw<T>(key: string): T {
		return (translator as unknown as { raw: (k: string) => T }).raw(key);
	}
	return { translate, raw };
}

export async function generateMetadata(): Promise<Metadata> {
	const launchT = await getTranslations({ locale: "nl" });
	const { raw } = createLaunchHelpers(launchT);
	const meta = raw<{ title: string; description: string; keywords: string }>(
		"launch.meta",
	);

	return {
		title: meta.title,
		description: meta.description,
		keywords: meta.keywords,
		alternates: {
			canonical: `${BASE_URL}/nl/launch`,
			languages: {
				en: `${BASE_URL}/en/launch`,
				nl: `${BASE_URL}/nl/launch`,
				"x-default": `${BASE_URL}/nl/launch`,
			},
		},
		openGraph: {
			title: meta.title,
			description: meta.description,
			locale: "nl_NL",
			url: `${BASE_URL}/nl/launch`,
			siteName: "Plumbing Agent",
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: meta.title,
			description: meta.description,
		},
	};
}

function SectionHeading({
	title,
	kicker,
	subtitle,
}: {
	title: string;
	kicker?: string;
	subtitle?: string;
}): ReactNode {
	return (
		<div className="mx-auto max-w-3xl text-center">
			{kicker ? (
				<p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
					{kicker}
				</p>
			) : null}
			<h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
				{title}
			</h2>
			{subtitle ? (
				<p className="mt-4 text-lg text-slate-600">{subtitle}</p>
			) : null}
		</div>
	);
}

export default async function LaunchPageNL(): Promise<JSX.Element> {
	const launchT = await getTranslations({ locale: "nl" });
	const translate = launchT as unknown as (key: string) => string;
	const raw = <T,>(key: string): T =>
		(launchT as unknown as { raw: (k: string) => T }).raw(key);

	const hero = raw<{
		eyebrow: string;
		title: string;
		subtitle: string;
		primaryCta: string;
		secondaryCta: string;
		trust: string;
		note: string;
		ticker: HeroTickerItem[];
		kpis: HeroKpi[];
		integrations: { name: string }[];
	}>("launch.hero");

	const automation = raw<{
		title: string;
		subtitle: string;
		bullets: { title: string; body: string }[];
		chips: { label: string; value: string }[];
	}>("launch.automation");

	const story = raw<{
		title: string;
		subtitle: string;
		steps: { title: string; description: string; aria: string }[];
	}>("launch.how");

	const features = raw<{
		title: string;
		subtitle: string;
		cards: FeatureCard[];
	}>("launch.features");

	const demos = raw<{
		title: string;
		subtitle: string;
		chat: DemoContent;
		calendar: DemoContent;
		invoice: DemoContent;
	}>("launch.demos");

	const testimonials = raw<{
		title: string;
		subtitle: string;
		items: Testimonial[];
	}>("launch.testimonials");

	const footer = raw<{
		tagline: string;
		organisation: string;
		links: FooterLinkGroup[];
		legal: string;
	}>("launch.footer");

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: "Plumbing Agent",
		description: translate("launch.meta.description"),
		inLanguage: "nl-NL",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		offers: {
			"@type": "Offer",
			availability: "https://schema.org/PreOrder",
			price: "0",
			priceCurrency: "EUR",
		},
		areaServed: {
			"@type": "Country",
			name: "Nederland",
		},
		aggregateRating: {
			"@type": "AggregateRating",
			ratingValue: "4.9",
			reviewCount: "54",
		},
		isRelatedTo: [
			"WhatsApp Business",
			"Google Calendar",
			"Moneybird",
			"e-Boekhouden",
			"WeFact",
		],
	};

	return (
		<>
			<script
				type="application/ld+json"
				suppressHydrationWarning
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<div className="bg-white text-slate-900">
				<header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
					<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-200 flex items-center justify-center font-semibold">
								PA
							</div>
							<div>
								<p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">
									{hero.trust}
								</p>
								<p className="text-xs text-slate-500">{hero.note}</p>
							</div>
						</div>
						<nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
							<a href="#automation" className="hover:text-slate-900">
								{translate("launch.nav.automation")}
							</a>
							<a href="#how" className="hover:text-slate-900">
								{translate("launch.nav.how")}
							</a>
							<a href="#demos" className="hover:text-slate-900">
								{translate("launch.nav.demos")}
							</a>
							<a href="#pricing" className="hover:text-slate-900">
								{translate("launch.nav.pricing")}
							</a>
							<a href="#docs" className="hover:text-slate-900">
								{translate("launch.nav.docs")}
							</a>
						</nav>
						<Link
							href="#waitlist"
							className="hidden rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:shadow-xl md:inline-flex"
						>
							{hero.primaryCta}
						</Link>
					</div>
				</header>

				<main>
					<section
						id="hero"
						className="relative overflow-hidden bg-slate-950 text-white"
					>
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.28),_transparent_55%)]" />
						<div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-24 md:grid-cols-[minmax(0,1fr)_24rem] md:pt-28">
							<div className="space-y-8">
								<p className="inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-1 text-sm font-semibold text-emerald-200">
									{hero.eyebrow}
								</p>
								<h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
									{hero.title}
								</h1>
								<p className="max-w-xl text-lg text-slate-100">
									{hero.subtitle}
								</p>
								<div className="flex flex-col gap-3 sm:flex-row">
									<a
										href="#waitlist"
										className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 hover:shadow-xl"
									>
										{hero.primaryCta}
									</a>
									<a
										href="#demos"
										className="inline-flex items-center justify-center rounded-full border border-emerald-300/40 px-6 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-200 hover:text-emerald-100"
									>
										{hero.secondaryCta}
									</a>
								</div>
								<p className="text-sm text-slate-400">{hero.trust}</p>
								<div className="grid gap-4 sm:grid-cols-3">
									{hero.kpis.map((item) => (
										<div
											key={item.label}
											className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
										>
											<p className="text-2xl font-semibold text-white">
												{item.value}
											</p>
											<p className="text-sm text-slate-300">{item.label}</p>
										</div>
									))}
								</div>
							</div>
							<div className="space-y-6">
								<LiveTicker items={hero.ticker} />
								<div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
									<p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-200">
										{translate("launch.integrations.title")}
									</p>
									<div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
										{hero.integrations.map((integration) => (
											<div
												key={integration.name}
												className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center"
											>
												{integration.name}
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</section>

					<section id="automation" className="bg-white py-20">
						<div className="mx-auto max-w-6xl px-6">
							<SectionHeading
								title={automation.title}
								subtitle={automation.subtitle}
							/>
							<div className="mt-12 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
								<ul className="space-y-6">
									{automation.bullets.map((item) => (
										<li
											key={item.title}
											className="rounded-2xl border border-slate-200 p-6 shadow-[0_10px_40px_rgba(15,40,65,0.08)]"
										>
											<h3 className="text-lg font-semibold text-slate-900">
												{item.title}
											</h3>
											<p className="mt-2 text-sm text-slate-600">{item.body}</p>
										</li>
									))}
								</ul>
								<div className="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
									<p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">
										{translate("launch.automation.metrics")}
									</p>
									<div className="grid gap-3">
										{automation.chips.map((chip) => (
											<div
												key={chip.label}
												className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
											>
												<span>{chip.label}</span>
												<span className="text-base font-semibold text-emerald-600">
													{chip.value}
												</span>
											</div>
										))}
									</div>
									<a
										href="#waitlist"
										className="inline-flex w-full justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600"
									>
										{translate("launch.automation.cta")}
									</a>
								</div>
							</div>
						</div>
					</section>

					<section id="how" className="bg-slate-950 py-24 text-white">
						<div className="mx-auto max-w-6xl px-6">
							<SectionHeading title={story.title} subtitle={story.subtitle} />
							<ol className="mt-14 grid gap-6 md:grid-cols-4">
								{story.steps.map((step, index) => (
									<li
										key={step.title}
										className="group relative flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-200/60 hover:bg-emerald-400/10"
									>
										<span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-slate-950 shadow-lg shadow-emerald-500/30">
											{index + 1}
										</span>
										<h3 className="text-lg font-semibold text-white">
											{step.title}
										</h3>
										<p className="mt-3 text-sm text-slate-200">
											{step.description}
										</p>
										<span className="sr-only">{step.aria}</span>
									</li>
								))}
							</ol>
						</div>
					</section>

					<section id="features" className="bg-white py-24">
						<div className="mx-auto max-w-6xl px-6">
							<SectionHeading
								title={features.title}
								subtitle={features.subtitle}
							/>
							<div className="mt-14 grid gap-6 lg:grid-cols-3">
								{features.cards.map((card) => (
									<article
										key={card.title}
										className="flex h-full flex-col rounded-3xl border border-slate-200 p-8 shadow-[0_10px_40px_rgba(15,40,65,0.06)]"
									>
										<h3 className="text-xl font-semibold text-slate-900">
											{card.title}
										</h3>
										<p className="mt-4 flex-1 text-sm text-slate-600">
											{card.description}
										</p>
										<ul className="mt-6 space-y-3 text-sm text-slate-700">
											{card.bullets.map((bullet) => (
												<li key={bullet} className="flex items-start gap-2">
													<span className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-emerald-500" />
													<span>{bullet}</span>
												</li>
											))}
										</ul>
									</article>
								))}
							</div>
						</div>
					</section>

					<section id="demos" className="bg-slate-950 py-24 text-white">
						<div className="mx-auto max-w-6xl px-6">
							<SectionHeading title={demos.title} subtitle={demos.subtitle} />
							<div className="mt-14 grid gap-10 lg:grid-cols-3">
								<div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
									<h3 className="text-lg font-semibold text-white">
										{demos.chat.title}
									</h3>
									<p className="mt-2 text-sm text-slate-200">
										{demos.chat.description}
									</p>
									<ChatDemo steps={demos.chat.steps} cta={demos.chat.cta} />
								</div>
								<div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
									<h3 className="text-lg font-semibold text-white">
										{demos.calendar.title}
									</h3>
									<p className="mt-2 text-sm text-slate-200">
										{demos.calendar.description}
									</p>
									<CalendarDemo
										steps={demos.calendar.steps}
										cta={demos.calendar.cta}
									/>
								</div>
								<div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
									<h3 className="text-lg font-semibold text-white">
										{demos.invoice.title}
									</h3>
									<p className="mt-2 text-sm text-slate-200">
										{demos.invoice.description}
									</p>
									<InvoiceTimelineDemo
										steps={demos.invoice.steps}
										cta={demos.invoice.cta}
									/>
								</div>
							</div>
						</div>
					</section>

					<section id="roi" className="bg-white py-24">
						<div className="mx-auto max-w-6xl px-6">
							<SectionHeading
								title={translate("launch.roi.title")}
								subtitle={translate("launch.roi.subtitle")}
							/>
							<div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_24rem]">
								<div className="space-y-6 text-sm text-slate-700">
									<p>{translate("launch.roi.body.one")}</p>
									<p>{translate("launch.roi.body.two")}</p>
									<ul className="space-y-3">
										<li className="flex items-start gap-2">
											<span className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-emerald-500" />
											<span>{translate("launch.roi.points.0")}</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-emerald-500" />
											<span>{translate("launch.roi.points.1")}</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-emerald-500" />
											<span>{translate("launch.roi.points.2")}</span>
										</li>
									</ul>
								</div>
								<div className="rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,40,65,0.05)]">
									<LazyRoiCalculator />
								</div>
							</div>
						</div>
					</section>

					<section id="testimonials" className="bg-slate-50 py-24">
						<div className="mx-auto max-w-6xl px-6">
							<SectionHeading
								title={testimonials.title}
								subtitle={testimonials.subtitle}
							/>
							<div className="mt-12 grid gap-6 md:grid-cols-3">
								{testimonials.items.map((item) => (
									<figure
										key={item.name}
										className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,40,65,0.06)]"
									>
										<blockquote className="flex-1 text-sm text-slate-700">
											“{item.quote}”
										</blockquote>
										<figcaption className="mt-4 text-sm font-semibold text-slate-900">
											{item.name}
											<span className="ml-2 block text-xs font-medium text-slate-500">
												{item.role}
											</span>
										</figcaption>
									</figure>
								))}
							</div>
						</div>
					</section>

					<section id="pricing" className="bg-white py-24">
						<div className="mx-auto max-w-4xl px-6 text-center">
							<p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">
								{translate("launch.pricing.badge")}
							</p>
							<h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
								{translate("launch.pricing.title")}
							</h2>
							<p className="mt-4 text-lg text-slate-600">
								{translate("launch.pricing.subtitle")}
							</p>
							<div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-10 shadow-[0_10px_40px_rgba(15,40,65,0.04)]">
								<p className="text-4xl font-semibold text-slate-900">
									{translate("launch.pricing.price")}
									<span className="text-base font-normal text-slate-500">
										{" "}
										{translate("launch.pricing.per_month")}
									</span>
								</p>
								<p className="mt-3 text-sm text-slate-600">
									{translate("launch.pricing.includes")}
								</p>
								<ul className="mt-6 space-y-3 text-sm text-left text-slate-700">
									<li className="flex items-start gap-2">
										<span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
										<span>{translate("launch.pricing.points.0")}</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
										<span>{translate("launch.pricing.points.1")}</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
										<span>{translate("launch.pricing.points.2")}</span>
									</li>
								</ul>
								<a
									href="#waitlist"
									className="mt-8 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600"
								>
									{translate("launch.pricing.cta")}
								</a>
							</div>
						</div>
					</section>

					<section id="docs" className="bg-slate-950 py-24 text-white">
						<div className="mx-auto max-w-5xl px-6">
							<SectionHeading
								title={translate("launch.docs.title")}
								subtitle={translate("launch.docs.subtitle")}
							/>
							<div className="mt-10 grid gap-6 md:grid-cols-3">
								{["whatsapp", "calendar", "invoicing"].map((key) => (
									<div
										key={key}
										className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
									>
										<p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
											{translate(`launch.docs.cards.${key}.badge`)}
										</p>
										<h3 className="mt-2 text-lg font-semibold text-white">
											{translate(`launch.docs.cards.${key}.title`)}
										</h3>
										<p className="mt-3 text-sm text-slate-200">
											{translate(`launch.docs.cards.${key}.description`)}
										</p>
										<a
											href={translate(`launch.docs.cards.${key}.href`)}
											target="_blank"
											rel="noreferrer"
											className="mt-6 inline-flex items-center text-sm font-semibold text-emerald-200 hover:text-emerald-100"
										>
											{translate("launch.docs.cards.cta")}
										</a>
									</div>
								))}
							</div>
						</div>
					</section>

					<section id="waitlist" className="bg-white py-24">
						<div className="mx-auto max-w-5xl px-6">
							<SectionHeading
								title={translate("launch.waitlist.heading")}
								subtitle={translate("launch.waitlist.subtitle")}
							/>
							<div className="mt-12">
								<WaitlistForm />
							</div>
						</div>
					</section>
				</main>

				<footer className="bg-slate-950 py-16 text-sm text-slate-300">
					<div className="mx-auto max-w-6xl gap-10 px-6 md:grid md:grid-cols-[1.2fr_1fr]">
						<div>
							<p className="text-base font-semibold text-white">
								{footer.tagline}
							</p>
							<p className="mt-3 max-w-md text-slate-400">
								{footer.organisation}
							</p>
						</div>
						<div className="grid gap-6 md:grid-cols-2">
							{footer.links.map((group) => (
								<div key={group.title}>
									<p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
										{group.title}
									</p>
									<ul className="mt-3 space-y-2">
										{group.links.map((link) => (
											<li key={link.href}>
												<a
													href={link.href}
													target={
														link.href.startsWith("http") ? "_blank" : undefined
													}
													rel={
														link.href.startsWith("http")
															? "noreferrer"
															: undefined
													}
													className="hover:text-white"
												>
													{link.label}
												</a>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
					<p className="mt-12 text-center text-xs text-slate-500">
						{footer.legal}
					</p>
				</footer>
			</div>
		</>
	);
}
