import { Temporal } from "temporal-polyfill";
import {
	getManufacturerInfo,
	listManufacturers,
	type ManufacturerInfo,
	type ManufacturerLocale,
	normalizeBrand,
	sanitizeSegment,
} from "~/lib/manuals/catalog";

export {
	getManufacturerInfo,
	listManufacturers,
	normalizeBrand,
	sanitizeSegment,
	type ManufacturerInfo,
	type ManufacturerLocale,
};

export function buildManualStoragePath(input: {
	brand: string;
	model: string;
	language?: ManufacturerLocale;
	version?: string | null;
}): string {
	const safeBrand = sanitizeSegment(input.brand);
	const safeModel = sanitizeSegment(input.model);
	const safeLang = input.language ?? "nl";
	const version = input.version ? sanitizeSegment(input.version) : "latest";
	const timestamp = Temporal.Now.instant().toString();

	return [
		"manuals",
		safeBrand,
		safeModel,
		`${version}_${safeLang}_${timestamp}.pdf`,
	]
		.join("/")
		.replace(/\/+/, "/");
}
