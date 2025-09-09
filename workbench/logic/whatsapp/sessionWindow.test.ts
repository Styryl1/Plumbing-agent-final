import { describe, it, expect } from "vitest";
import "~/lib/time"; // Load Temporal polyfill
import { toSessionInfoDTO } from "~/server/dto/whatsapp";

describe("WhatsApp Session Window Logic", () => {
	it("should return active session within 24-hour window", () => {
		// Given: inbound message received 1 hour ago
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		
		// When: calculating session info
		const sessionInfo = toSessionInfoDTO(oneHourAgo);
		
		// Then: session should be active
		expect(sessionInfo.active).toBe(true);
		expect(sessionInfo.expiresAt).toBeDefined();
		
		// And: session should expire in approximately 23 hours
		const expiryTime = new Date(sessionInfo.expiresAt!);
		const hoursUntilExpiry = (expiryTime.getTime() - Date.now()) / (1000 * 60 * 60);
		expect(hoursUntilExpiry).toBeGreaterThan(22);
		expect(hoursUntilExpiry).toBeLessThan(24);
	});

	it("should return inactive session after 24-hour window", () => {
		// Given: inbound message received 25 hours ago
		const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
		
		// When: calculating session info
		const sessionInfo = toSessionInfoDTO(twentyFiveHoursAgo);
		
		// Then: session should be inactive
		expect(sessionInfo.active).toBe(false);
		expect(sessionInfo.expiresAt).toBeUndefined();
	});

	it("should return inactive session when no inbound message exists", () => {
		// Given: no last inbound message
		const sessionInfo = toSessionInfoDTO(null);
		
		// Then: session should be inactive
		expect(sessionInfo.active).toBe(false);
		expect(sessionInfo.expiresAt).toBeUndefined();
	});

	it("should calculate exact 24-hour expiry boundary", () => {
		// Given: inbound message received exactly 24 hours ago minus 1 second
		const almostTwentyFourHours = new Date(Date.now() - (24 * 60 * 60 * 1000) + 1000).toISOString();
		
		// When: calculating session info
		const sessionInfo = toSessionInfoDTO(almostTwentyFourHours);
		
		// Then: session should still be active
		expect(sessionInfo.active).toBe(true);
		
		// Given: inbound message received exactly 24 hours ago plus 1 second
		const justOverTwentyFourHours = new Date(Date.now() - (24 * 60 * 60 * 1000) - 1000).toISOString();
		
		// When: calculating session info
		const sessionInfoExpired = toSessionInfoDTO(justOverTwentyFourHours);
		
		// Then: session should be inactive
		expect(sessionInfoExpired.active).toBe(false);
	});

	it("should handle edge case of very recent message", () => {
		// Given: inbound message received 30 seconds ago
		const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
		
		// When: calculating session info
		const sessionInfo = toSessionInfoDTO(thirtySecondsAgo);
		
		// Then: session should be active with almost full window remaining
		expect(sessionInfo.active).toBe(true);
		
		const expiryTime = new Date(sessionInfo.expiresAt!);
		const hoursUntilExpiry = (expiryTime.getTime() - Date.now()) / (1000 * 60 * 60);
		expect(hoursUntilExpiry).toBeGreaterThan(23.9);
		expect(hoursUntilExpiry).toBeLessThan(24.1);
	});
});