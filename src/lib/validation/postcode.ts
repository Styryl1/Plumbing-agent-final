// NL Postcode: 1234 AB (space optional)
export const NL_POSTCODE = /^\d{4}\s?[A-Za-z]{2}$/;

export function isValidPostcode(v: string): boolean {
	return NL_POSTCODE.test(v.trim());
}
