import { z } from "zod";

export const featureIconEnum = z.enum([
	"intake",
	"schedule",
	"job-cards",
	"invoicing",
]);

export const LaunchCopySchema = z
	.object({
		meta: z.object({
			title: z.string(),
			description: z.string(),
			keywords: z.string().optional(),
		}),
		nav: z.object({
			brand: z.string(),
			brandHref: z.string(),
			links: z.array(z.object({ label: z.string(), href: z.string() })),
			cta: z.object({ label: z.string(), href: z.string() }),
			locale: z.object({ en: z.string(), nl: z.string() }),
			openMenuLabel: z.string().optional(),
		}),
		hero: z
			.object({
				eyebrow: z.string(),
				title: z.string(),
				subtitle: z.string(),
				primaryCta: z.string(),
				primaryHref: z.string(),
				secondaryCta: z.string(),
				secondaryHref: z.string(),
				note: z.string(),
				highlights: z.array(z.object({ label: z.string(), value: z.string() })),
				form: z.object({
					title: z.string(),
					subtitle: z.string(),
					emailLabel: z.string(),
					phoneLabel: z.string(),
					submitLabel: z.string(),
					successMessage: z.string(),
				}),
				preview: z.object({
					boardTitle: z.string(),
					boardSubtitle: z.string(),
					jobTitle: z.string(),
					jobTime: z.string(),
					jobStatus: z.string(),
					smsLabel: z.string(),
					smsBody: z.string(),
					aiLabel: z.string(),
					aiBody: z.string(),
					reviewNote: z.string(),
				}),
			})
			.loose(),
		features: z.object({
			title: z.string(),
			subtitle: z.string(),
			items: z.array(
				z.object({
					title: z.string(),
					description: z.string(),
					points: z.array(z.string()),
					icon: featureIconEnum,
				}),
			),
			ctaLabel: z.string().optional(),
			ctaHref: z.string().optional(),
		}),
		workflow: z.object({
			title: z.string(),
			subtitle: z.string(),
			steps: z.array(z.object({ title: z.string(), description: z.string() })),
		}),
		socialProof: z.object({
			title: z.string(),
			subtitle: z.string(),
			logos: z.array(z.object({ name: z.string(), alt: z.string() })),
			testimonials: z.array(
				z.object({ quote: z.string(), author: z.string(), role: z.string() }),
			),
		}),
		pricing: z.object({
			title: z.string(),
			subtitle: z.string(),
			plan: z.string(),
			price: z.string(),
			frequency: z.string(),
			description: z.string(),
			features: z.array(z.string()),
			cta: z.string(),
			ctaHref: z.string(),
			note: z.string(),
		}),
		trust: z
			.object({
				logos: z.array(z.object({ name: z.string(), alt: z.string() })),
			})
			.loose(),
		faq: z.object({
			title: z.string(),
			subtitle: z.string(),
			items: z.array(z.object({ question: z.string(), answer: z.string() })),
		}),
		finalCta: z.object({
			title: z.string(),
			subtitle: z.string(),
			primaryCta: z.string(),
			primaryHref: z.string(),
			secondaryCta: z.string(),
			secondaryHref: z.string(),
		}),
	})
	.loose();

export type LaunchCopy = z.infer<typeof LaunchCopySchema>;
export type FeatureIcon = z.infer<typeof featureIconEnum>;
