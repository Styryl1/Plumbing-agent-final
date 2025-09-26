export type ManufacturerLocale = "nl" | "en";

export interface ManufacturerInfo {
	brand: string;
	domains: string[];
	defaultLocale: ManufacturerLocale;
	synonyms?: string[];
	archiveDomains?: string[];
	manualQuery?: string;
}

const MANUFACTURERS: ManufacturerInfo[] = [
	{
		brand: "Remeha",
		domains: ["remeha.nl", "remeha.com"],
		archiveDomains: ["docs.remeha.nl"],
		defaultLocale: "nl",
		synonyms: ["remeha bv"],
		manualQuery: "site:remeha.nl bestand:pdf handleiding",
	},
	{
		brand: "Intergas",
		domains: ["intergas-verwarming.nl", "intergasheating.co.uk"],
		archiveDomains: ["downloads.intergas-verwarming.nl"],
		defaultLocale: "nl",
		synonyms: ["intergas verwarming"],
		manualQuery: "site:intergas-verwarming.nl bestand:pdf handleiding",
	},
	{
		brand: "Vaillant",
		domains: ["vaillant.nl", "vaillant.co.uk"],
		archiveDomains: ["vaillant.be"],
		defaultLocale: "nl",
		synonyms: ["vaillant group"],
		manualQuery: "site:vaillant.nl bestand:pdf handleiding",
	},
	{
		brand: "ATAG",
		domains: ["atagverwarming.nl", "atagheating.co.uk"],
		archiveDomains: ["atag.nl"],
		defaultLocale: "nl",
		synonyms: ["atag verwarming"],
		manualQuery: "site:atagverwarming.nl bestand:pdf handleiding",
	},
	{
		brand: "Nefit Bosch",
		domains: ["nefit-bosch.nl", "bosch-thermotechnology.com"],
		archiveDomains: ["nefit.nl"],
		defaultLocale: "nl",
		synonyms: ["nefit", "bosch", "bosch thermotechnology"],
		manualQuery: "site:nefit-bosch.nl bestand:pdf handleiding",
	},
	{
		brand: "Viessmann",
		domains: ["viessmann.nl", "viessmann.co.uk"],
		archiveDomains: ["static.viessmann.com"],
		defaultLocale: "nl",
		synonyms: ["viessman"],
		manualQuery: "site:viessmann.nl bestand:pdf handleiding",
	},
	{
		brand: "Baxi",
		domains: ["baxi.co.uk"],
		archiveDomains: ["baxipowermaster.nl"],
		defaultLocale: "en",
		synonyms: ["baxi heating"],
		manualQuery: "site:baxi.co.uk filetype:pdf manual",
	},
	{
		brand: "Ideal",
		domains: ["idealheating.com", "idealheating.co.uk"],
		defaultLocale: "en",
		synonyms: ["ideal boilers"],
		manualQuery: "site:idealheating.com filetype:pdf manual",
	},
	{
		brand: "Worcester Bosch",
		domains: ["worcester-bosch.co.uk"],
		archiveDomains: ["worcester-bosch.ie"],
		defaultLocale: "en",
		synonyms: ["worcester"],
		manualQuery: "site:worcester-bosch.co.uk filetype:pdf manual",
	},
	{
		brand: "Ferroli",
		domains: ["ferroli.com", "ferroli.nl"],
		defaultLocale: "nl",
		synonyms: ["ferolli"],
		manualQuery: "site:ferroli.com filetype:pdf manual",
	},
];

const BRAND_LOOKUP: Map<string, ManufacturerInfo> = (() => {
	const map = new Map<string, ManufacturerInfo>();

	for (const record of MANUFACTURERS) {
		map.set(record.brand.toLowerCase(), record);
		if (record.synonyms) {
			for (const synonym of record.synonyms) {
				map.set(synonym.toLowerCase(), record);
			}
		}
	}

	return map;
})();

export function normalizeBrand(
	input: string | null | undefined,
): string | null {
	if (!input) {
		return null;
	}

	const cleaned = input.trim().toLowerCase();
	if (cleaned.length === 0) {
		return null;
	}

	const record = BRAND_LOOKUP.get(cleaned);
	if (record) {
		return record.brand;
	}

	for (const [key, record] of BRAND_LOOKUP.entries()) {
		if (cleaned.includes(key)) {
			return record.brand;
		}
	}

	return input
		.trim()
		.replace(/\s+/g, " ")
		.replace(/[^a-z0-9 \-/]/gi, "")
		.replace(/\bboiler\b/gi, "")
		.replace(/\bservice\b/gi, "")
		.trim();
}

export function getManufacturerInfo(
	brand: string | null | undefined,
): ManufacturerInfo | null {
	if (brand == null) {
		return null;
	}

	const trimmed = brand.trim();
	if (trimmed.length === 0) {
		return null;
	}

	return BRAND_LOOKUP.get(trimmed.toLowerCase()) ?? null;
}

export function listManufacturers(): ManufacturerInfo[] {
	return MANUFACTURERS;
}

export function sanitizeSegment(value: string): string {
	const cleaned = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-/g, "")
		.replace(/-$/g, "");

	return cleaned.length > 0 ? cleaned : "unknown";
}
