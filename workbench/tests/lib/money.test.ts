import { describe, it, expect } from "vitest";

function centsToDecimalEUR(cents: number): string {
	return (cents / 100).toFixed(2);
}

function decimalToCents(decimal: string): number {
	const parsed = parseFloat(decimal);
	return Math.round(parsed * 100);
}

describe("money conversion", () => {
	it("converts cents to EUR decimal string", () => {
		expect(centsToDecimalEUR(0)).toBe("0.00");
		expect(centsToDecimalEUR(1)).toBe("0.01");
		expect(centsToDecimalEUR(1234)).toBe("12.34");
		expect(centsToDecimalEUR(199)).toBe("1.99");
		expect(centsToDecimalEUR(250050)).toBe("2500.50");
	});

	it("converts decimal to cents", () => {
		expect(decimalToCents("0.00")).toBe(0);
		expect(decimalToCents("0.01")).toBe(1);
		expect(decimalToCents("12.34")).toBe(1234);
		expect(decimalToCents("1.99")).toBe(199);
		expect(decimalToCents("2500.50")).toBe(250050);
	});

	it("handles rounding edge cases", () => {
		// Floating point precision issues
		expect(decimalToCents("0.1")).toBe(10);
		expect(decimalToCents("0.2")).toBe(20);
		expect(decimalToCents("0.3")).toBe(30);
		
		// Common BTW calculations (21% Dutch VAT)
		const netCents = 12396; // €123.96
		const grossCents = Math.round(netCents * 1.21);
		expect(grossCents).toBe(14999); // €149.99
		expect(centsToDecimalEUR(grossCents)).toBe("149.99");
	});

	it("maintains precision in round-trip conversions", () => {
		const testAmounts = [0, 1, 99, 100, 1234, 999999];
		for (const cents of testAmounts) {
			const decimal = centsToDecimalEUR(cents);
			const backToCents = decimalToCents(decimal);
			expect(backToCents).toBe(cents);
		}
	});
});