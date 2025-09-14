/**
 * Dutch phone number formatting utilities
 */

export function formatPhoneNumber(phone: string | null | undefined): string {
	if (!phone?.trim()) return "";

	// Remove all non-digit characters except +
	const cleaned = phone.replace(/[^\d+]/g, "");

	// Handle international format (+31...)
	if (cleaned.startsWith("+31")) {
		const national = cleaned.substring(3);

		// Mobile numbers (6xxxxxxxx)
		if (national.length === 9 && national.startsWith("6")) {
			return `+31 6 ${national.substring(1, 5)}-${national.substring(5)}`;
		}

		// Landline numbers (20xxxxxxx, 30xxxxxxx, etc.)
		if (national.length === 9) {
			const areaCode = national.substring(0, 2);
			const number = national.substring(2);
			return `+31 ${areaCode} ${number.substring(0, 3)}-${number.substring(3)}`;
		}

		// Fallback for other international formats
		return phone;
	}

	// Handle national format
	// Mobile numbers (06xxxxxxxx)
	if (cleaned.length === 10 && cleaned.startsWith("06")) {
		return `(06) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
	}

	// Landline numbers (020xxxxxxx, 030xxxxxxx, etc.)
	if (
		cleaned.length === 10 &&
		(cleaned.startsWith("020") ||
			cleaned.startsWith("030") ||
			cleaned.startsWith("010"))
	) {
		const areaCode = cleaned.substring(0, 3);
		const number = cleaned.substring(3);
		return `(${areaCode}) ${number.substring(0, 3)}-${number.substring(3)}`;
	}

	// Other landline formats (0xx-xxxxxxx)
	if (cleaned.length === 9 && cleaned.startsWith("0")) {
		const areaCode = cleaned.substring(0, 2);
		const number = cleaned.substring(2);
		return `(${areaCode}) ${number.substring(0, 3)}-${number.substring(3)}`;
	}

	// If we can't format it properly, return the original (cleaned)
	return phone;
}

/**
 * Check if a phone number looks valid for Dutch standards
 */
export function isValidDutchPhone(phone: string | null | undefined): boolean {
	if (!phone?.trim()) return false;

	const cleaned = phone.replace(/[^\d+]/g, "");

	// International format
	if (cleaned.startsWith("+31")) {
		const national = cleaned.substring(3);
		return national.length === 9 && /^[1-9]/.test(national);
	}

	// National format
	if (cleaned.length === 10 && cleaned.startsWith("0")) {
		return /^0[1-9]/.test(cleaned);
	}

	if (cleaned.length === 9 && cleaned.startsWith("0")) {
		return /^0[1-9]/.test(cleaned);
	}

	return false;
}
