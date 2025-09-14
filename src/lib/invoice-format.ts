import { useTranslations } from "next-intl";
// Centralized invoice formatting for Dutch market compliance
// Ensures consistent EUR currency, nl-NL locale, and Europe/Amsterdam timezone

export const INVOICE_LOCALE = "nl-NL" as const;
export const INVOICE_TZ = "Europe/Amsterdam" as const;
export const INVOICE_CURRENCY = "EUR" as const;

/**
 * Format monetary amounts in Dutch style: €1.234,56
 * @param amount - Amount in cents or euros
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatMoney(
	amount: number,
	options: { inCents?: boolean } = {},
): string {
	const { inCents = false } = options;
	const value = inCents ? amount / 100 : amount;

	return new Intl.NumberFormat(INVOICE_LOCALE, {
		style: "currency",
		currency: INVOICE_CURRENCY,
		currencyDisplay: "symbol",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

/**
 * Format dates in Dutch style: 15 januari 2024
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat(INVOICE_LOCALE, {
		dateStyle: "medium",
		timeZone: INVOICE_TZ,
	}).format(date);
}

/**
 * Format date and time in Dutch style: 15 januari 2024 om 14:30
 * @param date - Date to format
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date): string {
	return new Intl.DateTimeFormat(INVOICE_LOCALE, {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: INVOICE_TZ,
	}).format(date);
}

/**
 * Format percentage in Dutch style: 21%
 * @param percentage - Percentage as decimal (0.21 = 21%)
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number): string {
	return new Intl.NumberFormat(INVOICE_LOCALE, {
		style: "percent",
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(percentage);
}

/**
 * Format numbers in Dutch style: 1.234,56
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatNumber(
	value: number,
	options: {
		minimumFractionDigits?: number;
		maximumFractionDigits?: number;
	} = {},
): string {
	const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options;

	return new Intl.NumberFormat(INVOICE_LOCALE, {
		minimumFractionDigits,
		maximumFractionDigits,
	}).format(value);
}

/**
 * Format invoice ID with Dutch business convention: FACT-2024-001
 * @param year - Invoice year
 * @param sequence - Invoice sequence number
 * @returns Formatted invoice ID
 */
export function formatInvoiceId(year: number, sequence: number): string {
	const paddedSequence = sequence.toString().padStart(3, "0");
	return `FACT-${year}-${paddedSequence}`;
}

/**
 * Calculate Dutch BTW (VAT) amount
 * @param subtotal - Amount before VAT
 * @param rate - VAT rate as decimal (0.21 = 21%)
 * @returns VAT amount
 */
export function calculateBtw(subtotal: number, rate: number = 0.21): number {
	return Math.round(subtotal * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Format Dutch business address
 * @param address - Address components
 * @returns Formatted address string
 */
export function formatDutchAddress(address: {
	street: string;
	houseNumber: string;
	postalCode: string;
	city: string;
}): string {
	const { street, houseNumber, postalCode, city } = address;
	return `${street} ${houseNumber}\n${postalCode} ${city}`;
}

/**
 * Validate Dutch postal code format (1234 AB)
 * @param postalCode - Postal code to validate
 * @returns true if valid Dutch postal code
 */
export function isValidDutchPostalCode(postalCode: string): boolean {
	const dutchPostalCodeRegex = /^\d{4}\s?[A-Z]{2}$/i;
	return dutchPostalCodeRegex.test(postalCode.trim());
}

/**
 * Validate Dutch KVK (Chamber of Commerce) number
 * @param kvkNumber - KVK number to validate
 * @returns true if valid KVK number format
 */
export function isValidKvkNumber(kvkNumber: string): boolean {
	// KVK numbers are 8 digits since 2008
	const kvkRegex = /^\d{8}$/;
	const cleaned = kvkNumber.replace(/\s/g, "");
	return kvkRegex.test(cleaned);
}

/**
 * Validate Dutch BTW (VAT) number format
 * @param btwNumber - BTW number to validate (e.g., "NL123456789B01")
 * @returns true if valid Dutch BTW number format
 */
export function isValidBtwNumber(btwNumber: string): boolean {
	// Dutch BTW format: NL + 9 digits + B + 2 digits
	const btwRegex = /^NL\d{9}B\d{2}$/;
	const cleaned = btwNumber.replace(/\s/g, "").toUpperCase();
	return btwRegex.test(cleaned);
}

/**
 * Format Dutch phone number for invoices
 * @param phoneNumber - Raw phone number
 * @returns Formatted Dutch phone number
 */
export function formatDutchPhone(phoneNumber: string): string {
	const cleaned = phoneNumber.replace(/\D/g, "");

	// Dutch mobile: +31 6 XXXXXXXX
	if (cleaned.startsWith("316") && cleaned.length === 11) {
		return `+31 6 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 9)} ${cleaned.substring(9)}`;
	}

	// Dutch landline: +31 XX XXXXXXX
	if (cleaned.startsWith("31") && cleaned.length === 11) {
		const areaCode = cleaned.substring(2, 4);
		const number = cleaned.substring(4);
		return `+31 ${areaCode} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
	}

	// Return as-is if not recognizable Dutch format
	return phoneNumber;
}

/**
 * Payment terms in Dutch (for invoice templates)
 */
export const DUTCH_PAYMENT_TERMS = {
	"14_days": "Betaling binnen 14 dagen",
	"30_days": "Betaling binnen 30 dagen",
	"60_days": "Betaling binnen 60 dagen",
	immediate: "Direct betaalbaar",
	on_completion: "Betaling bij oplevering",
} as const;

/**
 * Common Dutch invoice line item types
 */
export const DUTCH_LINE_ITEM_TYPES = {
	labor: "Arbeid",
	material: "Materiaal",
	materials: "Materiaal", // Support both variants
	travel: "Reiskosten",
	discount: "Korting",
	deposit: "Aanbetaling",
	emergency_surcharge: "Spoedtoeslag",
	weekend_surcharge: "Weekendtoeslag",
	evening_surcharge: "Avondtoeslag",
} as const;
