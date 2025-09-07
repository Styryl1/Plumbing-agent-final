import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = "https://loodgieter-agent.nl";
	// Static date for SEO - sitemaps don't need dynamic timestamps
	const lastModified = { toString: () => "2025-09-07T00:00:00Z" } as Date;

	return [
		// Dutch launch pages (primary)
		{
			url: `${baseUrl}/nl/launch`,
			lastModified,
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${baseUrl}/nl/launch/demo`,
			lastModified,
			changeFrequency: "monthly",
			priority: 0.8,
		},
		// English launch pages
		{
			url: `${baseUrl}/en/launch`,
			lastModified,
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${baseUrl}/en/launch/demo`,
			lastModified,
			changeFrequency: "monthly",
			priority: 0.7,
		},
		// Main app pages
		{
			url: baseUrl,
			lastModified,
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${baseUrl}/sign-in`,
			lastModified,
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${baseUrl}/sign-up`,
			lastModified,
			changeFrequency: "monthly",
			priority: 0.6,
		},
	];
}
