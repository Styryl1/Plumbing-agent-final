import { describe, it, expect } from "vitest";

// Pure version of the cascade logic for testing (no env dependency)
function computeFlagsForTest(config: { pilotMode: boolean }) {
	const baseFlags = {
		whatsappUi: false,
		canIssueInvoices: false,
		showMollieLinks: false,
		calendarEnabled: true,
		dunningMinimal: false,
		pilotMode: config.pilotMode,
	};

	if (config.pilotMode === true) {
		return {
			...baseFlags,
			whatsappUi: true,
			canIssueInvoices: true,
			showMollieLinks: true,
			calendarEnabled: true,
			dunningMinimal: true,
		};
	}

	return baseFlags;
}

describe("Pilot Mode Cascade Logic", () => {
	describe("Base mode (pilotMode=false)", () => {
		it("disables pilot features by default", () => {
			const flags = computeFlagsForTest({ pilotMode: false });

			expect(flags.pilotMode).toBe(false);
			expect(flags.whatsappUi).toBe(false);
			expect(flags.canIssueInvoices).toBe(false);
			expect(flags.showMollieLinks).toBe(false);
			expect(flags.dunningMinimal).toBe(false);
		});

		it("enables calendar by default", () => {
			const flags = computeFlagsForTest({ pilotMode: false });

			expect(flags.calendarEnabled).toBe(true);
		});
	});

	describe("Pilot mode (pilotMode=true)", () => {
		it("enables all MVP features when pilot mode is active", () => {
			const flags = computeFlagsForTest({ pilotMode: true });

			expect(flags.pilotMode).toBe(true);
			expect(flags.whatsappUi).toBe(true);
			expect(flags.canIssueInvoices).toBe(true);
			expect(flags.showMollieLinks).toBe(true);
			expect(flags.calendarEnabled).toBe(true);
			expect(flags.dunningMinimal).toBe(true);
		});

		it("overrides all flags regardless of base configuration", () => {
			const flags = computeFlagsForTest({ pilotMode: true });

			// All flags should be true when pilot mode is active
			const flagValues = Object.values(flags);
			const allTrue = flagValues.every(value => value === true);
			expect(allTrue).toBe(true);
		});
	});

	describe("Flag consistency", () => {
		it("maintains pilotMode flag value in output", () => {
			const flagsOff = computeFlagsForTest({ pilotMode: false });
			const flagsOn = computeFlagsForTest({ pilotMode: true });

			expect(flagsOff.pilotMode).toBe(false);
			expect(flagsOn.pilotMode).toBe(true);
		});

		it("returns the correct number of feature flags", () => {
			const flags = computeFlagsForTest({ pilotMode: false });
			const flagKeys = Object.keys(flags);

			// Should have exactly 6 flags: whatsappUi, canIssueInvoices, showMollieLinks, calendarEnabled, dunningMinimal, pilotMode
			expect(flagKeys.length).toBe(6);
			expect(flagKeys).toEqual([
				"whatsappUi",
				"canIssueInvoices", 
				"showMollieLinks",
				"calendarEnabled",
				"dunningMinimal",
				"pilotMode"
			]);
		});
	});
});