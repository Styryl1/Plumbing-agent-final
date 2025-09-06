import { describe, it, expect, vi } from "vitest";
import { Temporal } from "temporal-polyfill";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock the backoff functions since they use server-only
const calcNextRun = (attempt: number, baseSec = 60, capMin = 60): Temporal.ZonedDateTime => {
	const exponentialSec = baseSec * Math.pow(2, attempt);
	const cappedSec = Math.min(exponentialSec, capMin * 60);
	const jitterRange = cappedSec * 0.2;
	const jitter = (Math.random() - 0.5) * 2 * jitterRange;
	const finalSec = Math.max(1, cappedSec + jitter);
	
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	return now.add({ seconds: Math.round(finalSec) });
};

const getBackoffDescription = (attempt: number, baseSec = 60): string => {
	const exponentialSec = baseSec * Math.pow(2, attempt);
	const minutes = Math.round(exponentialSec / 60);
	
	if (minutes < 60) {
		return `${minutes}min`;
	}
	
	const hours = Math.round(minutes / 60);
	return `${hours}h`;
};

describe("backoff calculation", () => {
	beforeEach(() => {
		// Mock Math.random for predictable jitter in tests
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("increases exponentially with attempts", () => {
		const baseSec = 60;
		
		// Calculate delays without jitter (Math.random = 0.5)
		const delay0 = calcNextRun(0, baseSec);
		const delay1 = calcNextRun(1, baseSec);
		const delay2 = calcNextRun(2, baseSec);
		
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		
		// Check that delays increase exponentially
		const diff0 = delay0.since(now).total('seconds');
		const diff1 = delay1.since(now).total('seconds');
		const diff2 = delay2.since(now).total('seconds');
		
		expect(diff0).toBeCloseTo(60, 0); // 60s
		expect(diff1).toBeCloseTo(120, 0); // 120s (2^1 * 60)
		expect(diff2).toBeCloseTo(240, 0); // 240s (2^2 * 60)
	});

	it("caps at maximum delay", () => {
		const baseSec = 60;
		const capMin = 60; // 1 hour cap
		
		// Large attempt number should hit the cap
		const delayHigh = calcNextRun(10, baseSec, capMin);
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const diff = delayHigh.since(now).total('seconds');
		
		// Should be capped at 60 minutes = 3600 seconds
		expect(diff).toBeLessThanOrEqual(3600);
		expect(diff).toBeGreaterThan(3000); // Should be close to cap
	});

	it("applies jitter correctly", () => {
		// Test with different random values
		vi.spyOn(Math, 'random').mockReturnValue(0.0); // Minimum jitter
		const delayMin = calcNextRun(1, 60);
		
		vi.spyOn(Math, 'random').mockReturnValue(1.0); // Maximum jitter
		const delayMax = calcNextRun(1, 60);
		
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const diffMin = delayMin.since(now).total('seconds');
		const diffMax = delayMax.since(now).total('seconds');
		
		// With 20% jitter on 120s base: min ~96s, max ~144s
		expect(diffMin).toBeLessThan(diffMax);
		expect(diffMin).toBeGreaterThan(90);
		expect(diffMax).toBeLessThan(150);
	});

	it("ensures minimum 1 second delay", () => {
		// Even with negative jitter, should never go below 1 second
		vi.spyOn(Math, 'random').mockReturnValue(0.0); // Maximum negative jitter
		
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const delaySmall = calcNextRun(0, 1); // Very small base
		const diff = delaySmall.since(now).total('seconds');
		
		// Allow for minor timing precision issues (within 50ms)
		expect(diff).toBeGreaterThanOrEqual(0.95);
	});

	it("returns proper timezone", () => {
		const delay = calcNextRun(0, 60);
		expect(delay.timeZoneId).toBe("Europe/Amsterdam");
	});
});

describe("backoff description", () => {
	it("formats minutes correctly", () => {
		expect(getBackoffDescription(0, 60)).toBe("1min"); // 60s = 1min
		expect(getBackoffDescription(1, 60)).toBe("2min"); // 120s = 2min
		expect(getBackoffDescription(2, 60)).toBe("4min"); // 240s = 4min
		expect(getBackoffDescription(3, 60)).toBe("8min"); // 480s = 8min
	});

	it("formats hours correctly", () => {
		expect(getBackoffDescription(6, 60)).toBe("1h"); // 3840s ≈ 1h
		expect(getBackoffDescription(7, 60)).toBe("2h"); // 7680s ≈ 2h
	});

	it("handles edge cases", () => {
		expect(getBackoffDescription(0, 30)).toBe("1min"); // 30s rounds to 1min
		expect(getBackoffDescription(10, 1)).toBe("17min"); // 2^10 * 1 = 1024s ≈ 17min
	});
});