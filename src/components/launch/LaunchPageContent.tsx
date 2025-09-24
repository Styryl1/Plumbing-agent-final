"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRight,
	CalendarClock,
	Check,
	ClipboardCheck,
	Laptop2,
	Menu,
	MessageCircle,
	PhoneCall,
	ReceiptEuro,
	Smartphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTrigger,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import type { FeatureIcon, LaunchCopy } from "./launchCopySchema";

type FadeMotion = {
	initial: { opacity: number; y: number };
	whileInView: { opacity: number; y: number };
	transition: { duration: number; ease?: string };
	viewport: { once: boolean; amount: number };
};

const baseFade: FadeMotion = {
	initial: { opacity: 0, y: 28 },
	whileInView: { opacity: 1, y: 0 },
	transition: { duration: 0.45, ease: "easeOut" },
	viewport: { once: true, amount: 0.2 },
};
const reducedFade: FadeMotion = {
	initial: { opacity: 1, y: 0 },
	whileInView: { opacity: 1, y: 0 },
	transition: { duration: 0, ease: "linear" },
	viewport: { once: true, amount: 0.2 },
};

const getFade = (shouldReduceMotion: boolean): FadeMotion =>
	shouldReduceMotion ? reducedFade : baseFade;

const featureIconMap: Record<FeatureIcon, LucideIcon> = {
	intake: MessageCircle,
	schedule: CalendarClock,
	"job-cards": ClipboardCheck,
	invoicing: ReceiptEuro,
};

const SectionHeading = ({
	title,
	subtitle,
	variant = "light",
}: {
	title: string;
	subtitle: string;
	variant?: "light" | "dark";
}): JSX.Element => (
	<div className="mx-auto max-w-3xl text-center">
		<h2
			className={cn(
				"text-3xl font-semibold sm:text-4xl",
				variant === "dark" ? "text-slate-100" : "text-slate-900",
			)}
		>
			{title}
		</h2>
		<p
			className={cn(
				"mt-4 text-lg",
				variant === "dark" ? "text-slate-300" : "text-slate-600",
			)}
		>
			{subtitle}
		</p>
	</div>
);

const HighlightTile = ({
	label,
	value,
}: {
	label: string;
	value: string;
}): JSX.Element => (
	<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
		<p className="text-xs uppercase tracking-wide text-emerald-200">{label}</p>
		<p className="mt-2 text-lg font-semibold text-white">{value}</p>
	</div>
);

function HeroLeadForm({
	form,
}: {
	form: NonNullable<LaunchCopy["hero"]["form"]>;
}): JSX.Element {
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [submitted, setSubmitted] = useState(false);

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		if (!email.trim() && !phone.trim()) return;
		setSubmitted(true);
		setEmail("");
		setPhone("");
	}

	return (
		<div className="mt-8 max-w-lg rounded-2xl border border-white/15 bg-slate-950/40 p-6 text-left shadow-2xl">
			<p className="text-sm font-semibold text-emerald-200">{form.title}</p>
			<p className="mt-2 text-sm text-slate-200">{form.subtitle}</p>
			<form onSubmit={handleSubmit} className="mt-4 space-y-3">
				<Input
					type="email"
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
					placeholder={form.emailLabel}
					className="h-11 border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
				/>
				<Input
					type="tel"
					value={phone}
					onChange={(event) => {
						setPhone(event.target.value);
					}}
					placeholder={form.phoneLabel}
					className="h-11 border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
				/>
				<Button
					type="submit"
					className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
				>
					{form.submitLabel}
				</Button>
			</form>
			{submitted ? (
				<p className="mt-3 text-xs text-emerald-200/80">
					{form.successMessage}
				</p>
			) : null}
		</div>
	);
}

const FeaturePoint = ({
	text,
	invert = false,
}: {
	text: string;
	invert?: boolean;
}): JSX.Element => (
	<p
		className={cn(
			"flex items-start gap-2",
			invert ? "text-slate-200" : "text-slate-600",
		)}
	>
		<Check
			className={cn(
				"mt-1 h-4 w-4",
				invert ? "text-emerald-300" : "text-emerald-500",
			)}
		/>
		<span>{text}</span>
	</p>
);

const TestimonialCard = ({
	quote,
	author,
	role,
}: {
	quote: string;
	author: string;
	role: string;
}): JSX.Element => (
	<Card className="border-emerald-100/70 bg-white shadow-lg">
		<CardContent className="space-y-4 p-6 text-sm text-slate-600">
			<p>“{quote}”</p>
			<div className="text-sm font-semibold text-slate-900">
				{author}
				<p className="text-xs font-normal text-slate-500">{role}</p>
			</div>
		</CardContent>
	</Card>
);

function LaunchNav({ nav }: { nav: LaunchCopy["nav"] }): JSX.Element {
	const pathname = usePathname();
	const currentLocale = pathname.includes("/en/") ? "en" : "nl";
	const targetLocale = currentLocale === "en" ? "nl" : "en";
	const localeHref = pathname.replace(
		`/${currentLocale}/`,
		`/${targetLocale}/`,
	);
	const localeLabel = nav.locale[targetLocale];

	return (
		<header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link
					href={nav.brandHref}
					className="text-base font-semibold text-slate-900 transition hover:text-emerald-600"
				>
					{nav.brand}
				</Link>
				<nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
					{nav.links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="transition hover:text-emerald-600"
						>
							{link.label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-3">
					<Link
						href={localeHref}
						hrefLang={targetLocale}
						className="hidden text-sm font-medium text-slate-500 transition hover:text-emerald-600 md:inline-flex"
					>
						{localeLabel}
					</Link>
					<Button asChild size="sm" className="hidden md:inline-flex">
						<Link href={nav.cta.href} target="_blank" rel="noreferrer">
							{nav.cta.label}
						</Link>
					</Button>
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="md:hidden"
								aria-label={nav.openMenuLabel ?? nav.brand}
							>
								<Menu className="h-5 w-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-72 sm:w-80">
							<div className="mt-6 flex flex-col gap-4 text-base font-medium text-slate-700">
								{nav.links.map((link) => (
									<SheetClose asChild key={link.href}>
										<Link
											href={link.href}
											className="rounded-md px-2 py-2 transition hover:bg-emerald-50 hover:text-emerald-600"
										>
											{link.label}
										</Link>
									</SheetClose>
								))}
								<SheetClose asChild>
									<Link
										href={localeHref}
										hrefLang={targetLocale}
										className="rounded-md px-2 py-2 text-sm text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
									>
										{localeLabel}
									</Link>
								</SheetClose>
								<Button asChild size="sm" className="justify-center">
									<Link href={nav.cta.href} target="_blank" rel="noreferrer">
										{nav.cta.label}
									</Link>
								</Button>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}

function TrustSection({
	logos,
}: {
	logos: LaunchCopy["trust"]["logos"];
}): JSX.Element {
	return (
		<section className="border-y border-slate-200 bg-slate-50 py-6">
			<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6 px-4">
				{logos.map((logo) => (
					<div
						key={logo.name}
						className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold uppercase tracking-wide text-slate-500 shadow-sm"
						aria-label={logo.alt}
					>
						<span>{logo.name}</span>
					</div>
				))}
			</div>
		</section>
	);
}

export function LaunchPageContent({ copy }: { copy: LaunchCopy }): JSX.Element {
	const reducedMotionPreference = useReducedMotion();
	const shouldReduceMotion = Boolean(reducedMotionPreference);
	const fade = useMemo(() => getFade(shouldReduceMotion), [shouldReduceMotion]);

	return (
		<div className="bg-white text-slate-900">
			<LaunchNav nav={copy.nav} />
			<main className="space-y-24 pb-24">
				<HeroSection
					data={copy.hero}
					fade={fade}
					reduced={shouldReduceMotion}
				/>
				{copy.trust.logos.length > 0 ? (
					<TrustSection logos={copy.trust.logos} />
				) : null}
				<section
					id="features"
					className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
				>
					<motion.div {...fade}>
						<SectionHeading
							title={copy.features.title}
							subtitle={copy.features.subtitle}
						/>
						<div className="mt-12 grid gap-6 lg:grid-cols-2">
							{copy.features.items.map((item) => {
								const Icon = featureIconMap[item.icon];
								return (
									<Card
										key={item.title}
										className="h-full border-slate-200 hover:border-emerald-200/80 hover:shadow-lg"
										data-testid="feature-card"
									>
										<CardHeader className="space-y-2">
											<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
												<Icon className="h-6 w-6" />
											</div>
											<CardTitle className="text-xl font-semibold text-slate-900">
												{item.title}
											</CardTitle>
											<p className="text-sm text-slate-600">
												{item.description}
											</p>
										</CardHeader>
										<CardContent className="space-y-2 text-sm text-slate-600">
											{item.points.map((point) => (
												<FeaturePoint key={point} text={point} />
											))}
										</CardContent>
									</Card>
								);
							})}
						</div>
						{copy.features.ctaLabel && copy.features.ctaHref ? (
							<div className="mt-8 text-center">
								<Link
									href={copy.features.ctaHref}
									className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-500"
								>
									{copy.features.ctaLabel}
									<ArrowRight className="h-4 w-4" />
								</Link>
							</div>
						) : null}
					</motion.div>
				</section>
				<section
					id="workflow"
					className="bg-slate-950 px-4 py-20 text-slate-100 sm:px-6 lg:px-8"
				>
					<motion.div {...fade} className="mx-auto max-w-5xl">
						<SectionHeading
							title={copy.workflow.title}
							subtitle={copy.workflow.subtitle}
							variant="dark"
						/>
						<ol className="mt-12 space-y-6 border-l border-white/10 pl-6">
							{copy.workflow.steps.map((step, index) => {
								const stepFade = shouldReduceMotion
									? fade
									: {
											...fade,
											transition: { ...fade.transition, delay: index * 0.08 },
										};
								return (
									<motion.li
										key={step.title}
										{...stepFade}
										className="relative"
									>
										<span className="absolute -left-[42px] flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 text-emerald-100">
											{String(index + 1).padStart(2, "0")}
										</span>
										<h3 className="text-lg font-semibold text-white">
											{step.title}
										</h3>
										<p className="mt-2 text-sm text-slate-300">
											{step.description}
										</p>
									</motion.li>
								);
							})}
						</ol>
					</motion.div>
				</section>
				<section
					id="social-proof"
					className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
				>
					<motion.div {...fade}>
						<SectionHeading
							title={copy.socialProof.title}
							subtitle={copy.socialProof.subtitle}
						/>
						<div className="mt-10 flex flex-wrap items-center justify-center gap-6">
							{copy.socialProof.logos.map((logo) => (
								<div
									key={logo.name}
									className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500"
									aria-label={logo.alt}
								>
									{logo.name}
								</div>
							))}
						</div>
						<div className="mt-10 grid gap-6 lg:grid-cols-3">
							{copy.socialProof.testimonials.map((t) => (
								<TestimonialCard key={t.quote} {...t} />
							))}
						</div>
					</motion.div>
				</section>
				<section
					id="pricing"
					className="bg-slate-950 px-4 py-20 text-slate-100 sm:px-6 lg:px-8"
				>
					<motion.div {...fade} className="mx-auto max-w-4xl text-center">
						<SectionHeading
							title={copy.pricing.title}
							subtitle={copy.pricing.subtitle}
							variant="dark"
						/>
						<div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl border border-emerald-400/30 bg-slate-900/70 text-left">
							<div className="border-b border-white/10 px-8 py-6 text-left">
								<p className="text-sm uppercase tracking-wide text-emerald-200">
									{copy.pricing.plan}
								</p>
								<div className="mt-2 flex flex-wrap items-baseline gap-2 text-white">
									<span className="text-4xl font-semibold">
										{copy.pricing.price}
									</span>
									<span className="text-sm text-slate-400">
										{copy.pricing.frequency}
									</span>
								</div>
								<p className="mt-3 text-sm text-slate-300">
									{copy.pricing.description}
								</p>
							</div>
							<div className="grid gap-3 px-8 py-6 text-sm text-slate-200">
								{copy.pricing.features.map((feature) => (
									<FeaturePoint key={feature} text={feature} invert />
								))}
							</div>
							<div className="border-t border-white/10 px-8 py-6 text-center">
								<Button
									asChild
									size="lg"
									className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
								>
									<Link
										href={copy.pricing.ctaHref}
										target="_blank"
										rel="noreferrer"
									>
										{copy.pricing.cta}
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
								<p className="mt-3 text-xs text-slate-400">
									{copy.pricing.note}
								</p>
							</div>
						</div>
					</motion.div>
				</section>
				<section id="faq" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
					<motion.div {...fade}>
						<SectionHeading
							title={copy.faq.title}
							subtitle={copy.faq.subtitle}
						/>
						<FaqList items={copy.faq.items} />
					</motion.div>
				</section>
				<section className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500 via-emerald-600 to-slate-900 px-6 py-16 text-white">
					<div className="max-w-3xl space-y-6">
						<h2 className="text-3xl font-semibold sm:text-4xl">
							{copy.finalCta.title}
						</h2>
						<p className="text-lg text-emerald-100">{copy.finalCta.subtitle}</p>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Button
								asChild
								size="lg"
								className="h-12 bg-slate-950 text-white hover:bg-slate-900"
							>
								<Link
									href={copy.finalCta.primaryHref}
									target="_blank"
									rel="noreferrer"
								>
									{copy.finalCta.primaryCta}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
							<Button
								asChild
								variant="secondary"
								size="lg"
								className="h-12 bg-white/15 text-white hover:bg-white/25"
							>
								<Link href={copy.finalCta.secondaryHref}>
									{copy.finalCta.secondaryCta}
								</Link>
							</Button>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}

function HeroSection({
	data,
	fade,
	reduced,
}: {
	data: LaunchCopy["hero"];
	fade: FadeMotion;
	reduced: boolean;
}): JSX.Element {
	const preview = data.preview;
	return (
		<section
			id="top"
			className="relative isolate overflow-hidden bg-slate-950 px-4 pb-20 pt-24 text-slate-100 sm:px-6 lg:px-8"
		>
			<div className="absolute inset-0 -z-10">
				<div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(52,211,153,0.55),_rgba(15,23,42,0.4)_60%,_rgba(15,23,42,0.95))] blur-3xl" />
				<div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-emerald-500/30 mix-blend-overlay blur-[120px]" />
				<div className="absolute -right-32 top-24 h-72 w-72 rounded-full bg-cyan-500/25 mix-blend-overlay blur-[140px]" />
			</div>
			<div className="mx-auto flex max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-between">
				<motion.div {...fade} className="w-full max-w-xl">
					<Badge className="bg-emerald-500/15 px-3 py-1 text-emerald-200">
						{data.eyebrow}
					</Badge>
					<h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
						{data.title}
					</h1>
					<p className="mt-6 text-lg text-slate-300 lg:text-xl">
						{data.subtitle}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button
							asChild
							size="lg"
							className="h-12 w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 sm:w-auto"
						>
							<Link href={data.primaryHref} target="_blank" rel="noreferrer">
								{data.primaryCta}
								<ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-12 w-full border-emerald-300/60 text-slate-100 hover:bg-emerald-500/10 sm:w-auto"
						>
							<Link href={data.secondaryHref}>{data.secondaryCta}</Link>
						</Button>
					</div>
					<p className="mt-4 text-sm text-emerald-200">{data.note}</p>
					<div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
						{data.highlights.map((item) => (
							<HighlightTile key={item.label} {...item} />
						))}
					</div>
					<HeroLeadForm form={data.form} />
				</motion.div>
				<motion.div
					{...(reduced
						? fade
						: { ...fade, transition: { ...fade.transition, delay: 0.12 } })}
					className="relative w-full max-w-lg space-y-4"
				>
					<Card className="relative overflow-hidden border-white/10 bg-white/10 text-white shadow-xl">
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.25),_transparent_70%)]" />
						<CardHeader className="relative space-y-4">
							<div className="flex items-center gap-3">
								<div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-200">
									<Laptop2 className="h-6 w-6" />
								</div>
								<div>
									<p className="text-xs uppercase tracking-wide text-emerald-200">
										{preview.boardTitle}
									</p>
									<p className="text-sm text-slate-100">
										{preview.boardSubtitle}
									</p>
								</div>
							</div>
							<div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-200">
								<p className="font-medium text-emerald-200">
									{preview.jobTitle}
								</p>
								<p>{preview.jobTime}</p>
								<p className="text-slate-400">{preview.jobStatus}</p>
							</div>
							<div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs text-slate-200">
								<div className="rounded-xl bg-cyan-500/20 p-3 text-cyan-200">
									<Smartphone className="h-5 w-5" />
								</div>
								<div className="space-y-2">
									<div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
										<p className="text-emerald-200">{preview.smsLabel}</p>
										<p>{preview.smsBody}</p>
									</div>
									<div className="rounded-lg border border-white/10 bg-slate-950/40 p-3 text-emerald-100">
										<p className="text-emerald-200">{preview.aiLabel}</p>
										<p>{preview.aiBody}</p>
									</div>
									<p className="flex items-center gap-2 text-slate-400">
										<PhoneCall className="h-4 w-4" />
										{preview.reviewNote}
									</p>
								</div>
							</div>
						</CardHeader>
					</Card>
				</motion.div>
			</div>
		</section>
	);
}

function FaqList({
	items,
}: {
	items: LaunchCopy["faq"]["items"];
}): JSX.Element {
	const [open, setOpen] = useState<number | null>(0);
	return (
		<div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
			{items.map((item, index) => {
				const expanded = open === index;
				return (
					<div key={item.question}>
						<button
							type="button"
							onClick={() => {
								setOpen(expanded ? null : index);
							}}
							aria-expanded={expanded}
							className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
						>
							<span className="text-base font-medium text-slate-900">
								{item.question}
							</span>
							<span className="text-2xl leading-none text-emerald-500">
								{expanded ? "–" : "+"}
							</span>
						</button>
						{expanded && (
							<div className="px-6 pb-6 text-sm text-slate-600">
								{item.answer}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
