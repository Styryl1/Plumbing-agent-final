import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "~/lib/env";

type LookupOk = {
	ok: true;
	street: string;
	city: string;
	municipality?: string;
	province?: string;
	lat?: number;
	lon?: number;
	provider: "pdok" | "postcodeapi";
};

type LookupErr = { ok: false; error: string };

interface PdokDoc {
	straatnaam?: string;
	woonplaatsnaam?: string;
	gemeentenaam?: string;
	provincienaam?: string;
	centroide_ll?: string;
}

interface PdokResponse {
	response?: {
		docs?: PdokDoc[];
	};
}

interface PostcodeApiResponse {
	street?: string;
	city?: string;
	data?: {
		street?: string;
		city?: string;
	};
}

function normPostcode(pc: string): string {
	return pc.replace(/\s+/g, "").toUpperCase();
}

function normHouseNumber(n: string): string {
	return n.trim();
}

async function lookupViaPdok(
	postcode: string,
	houseNumber: string,
): Promise<LookupOk | null> {
	// PDOK Locatieserver (free) — filter by address type, exact postcode + huisnummer
	// Docs: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
	// Example (Solr-style): /free?fq=type:adres&fq=postcode:1071XX&fq=huisnummer:1
	const url = new URL("https://api.pdok.nl/bzk/locatieserver/search/v3_1/free");
	url.searchParams.set("fq", "type:adres");
	url.searchParams.append("fq", `postcode:${postcode}`);
	url.searchParams.append("fq", `huisnummer:${houseNumber}`);
	url.searchParams.set("rows", "1");

	const r = await fetch(url.toString(), {
		headers: { Accept: "application/json" },
		cache: "no-store",
	});
	if (!r.ok) return null;

	const json = (await r.json()) as PdokResponse;
	const doc = json.response?.docs?.[0];
	if (!doc) return null;

	// Common PDOK fields: straatnaam, woonplaatsnaam, gemeente, provincie, centroide_ll
	const [lat, lon] =
		typeof doc.centroide_ll === "string"
			? doc.centroide_ll
					.replace(/^POINT\(/, "")
					.replace(/\)$/, "")
					.split(" ")
					.map(parseFloat)
			: [undefined, undefined];

	const result: LookupOk = {
		ok: true,
		street: doc.straatnaam ?? "",
		city: doc.woonplaatsnaam ?? "",
		provider: "pdok",
	};

	if (doc.gemeentenaam) {
		result.municipality = doc.gemeentenaam;
	}

	if (doc.provincienaam) {
		result.province = doc.provincienaam;
	}

	if (lat !== undefined) {
		result.lat = lat;
	}

	if (lon !== undefined) {
		result.lon = lon;
	}

	return result;
}

async function lookupViaPostcodeApi(
	postcode: string,
	houseNumber: string,
): Promise<LookupOk | null> {
	// PostcodeAPI.nu v3 — simple lookup (requires API key)
	// GET https://api.postcodeapi.nu/v3/lookup/{postcode}/{number}
	// Docs: https://www.postcodeapi.nu/docs/v3/
	const apiKey = env.POSTCODEAPI_NU_KEY;
	if (!apiKey || apiKey.trim() === "") return null;

	const url = `https://api.postcodeapi.nu/v3/lookup/${postcode}/${houseNumber}`;
	const r = await fetch(url, {
		headers: { "X-Api-Key": apiKey, Accept: "application/json" },
		cache: "no-store",
	});
	if (!r.ok) return null;

	const json = (await r.json()) as PostcodeApiResponse;
	const street = json.street ?? json.data?.street;
	const city = json.city ?? json.data?.city;
	if (!street || street.trim() === "" || !city || city.trim() === "")
		return null;

	return { ok: true, street, city, provider: "postcodeapi" };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
	const { searchParams } = new URL(req.url);
	const pc = searchParams.get("postalCode") ?? "";
	const hn = searchParams.get("houseNumber") ?? "";

	const postcode = normPostcode(pc);
	const houseNumber = normHouseNumber(hn);
	if (!/^\d{4}[A-Z]{2}$/.test(postcode) || houseNumber.trim() === "") {
		return NextResponse.json<LookupErr>(
			{ ok: false, error: "invalid_input" },
			{ status: 400 },
		);
	}

	// Minimal edge cache (5 min) to be nice to PDOK; adjust as you like.
	// You can also persist a small LRU or Supabase table for hot lookups.
	const tryPdok = await lookupViaPdok(postcode, houseNumber);
	if (tryPdok) {
		return new NextResponse(JSON.stringify(tryPdok), {
			headers: {
				"content-type": "application/json",
				"cache-control": "public, max-age=300",
			},
		});
	}

	const tryPostcodeApi = await lookupViaPostcodeApi(postcode, houseNumber);
	if (tryPostcodeApi) {
		return new NextResponse(JSON.stringify(tryPostcodeApi), {
			headers: {
				"content-type": "application/json",
				"cache-control": "public, max-age=300",
			},
		});
	}

	return NextResponse.json<LookupErr>(
		{ ok: false, error: "not_found" },
		{ status: 404 },
	);
}
