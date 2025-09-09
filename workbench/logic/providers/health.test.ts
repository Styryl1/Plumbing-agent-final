/**
 * Provider Health Logic Tests
 * Pure logic mapping tests for provider status handling
 */

import { describe, expect, it } from "vitest";
import "~/lib/time"; // Temporal polyfill

type ProviderStatus = "ok" | "invalid_token" | "not_connected";
type BadgeVariant = "default" | "secondary" | "destructive";

/**
 * Map provider health status to badge variant for UI display
 */
function getStatusBadgeVariant(status: ProviderStatus): BadgeVariant {
	switch (status) {
		case "ok":
			return "default";
		case "invalid_token":
			return "destructive";
		case "not_connected":
			return "secondary";
	}
}

/**
 * Determine if "Issue via Provider" button should be disabled
 */
function shouldDisableIssueButton(status: ProviderStatus): boolean {
	return status !== "ok";
}

/**
 * Check if provider credentials are expired based on expiry timestamp
 */
function isProviderTokenExpired(
	expiresAt: string,
	now?: Temporal.ZonedDateTime,
): boolean {
	const currentTime =
		now ?? Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	const expiryTime = Temporal.Instant.from(expiresAt);

	return currentTime.toInstant().epochNanoseconds > expiryTime.epochNanoseconds;
}

/**
 * Map raw provider credential data to health status
 */
function mapCredentialsToHealthStatus(
	hasCredentials: boolean,
	expiresAt?: string,
	now?: Temporal.ZonedDateTime,
): ProviderStatus {
	if (!hasCredentials) {
		return "not_connected";
	}

	if (expiresAt && isProviderTokenExpired(expiresAt, now)) {
		return "invalid_token";
	}

	return "ok";
}

describe("Provider Health Logic", () => {
	describe("getStatusBadgeVariant", () => {
		it("should return default variant for ok status", () => {
			expect(getStatusBadgeVariant("ok")).toBe("default");
		});

		it("should return destructive variant for invalid token", () => {
			expect(getStatusBadgeVariant("invalid_token")).toBe("destructive");
		});

		it("should return secondary variant for not connected", () => {
			expect(getStatusBadgeVariant("not_connected")).toBe("secondary");
		});
	});

	describe("shouldDisableIssueButton", () => {
		it("should enable button when status is ok", () => {
			expect(shouldDisableIssueButton("ok")).toBe(false);
		});

		it("should disable button when token is invalid", () => {
			expect(shouldDisableIssueButton("invalid_token")).toBe(true);
		});

		it("should disable button when not connected", () => {
			expect(shouldDisableIssueButton("not_connected")).toBe(true);
		});
	});

	describe("isProviderTokenExpired", () => {
		const mockNow = Temporal.ZonedDateTime.from(
			"2024-01-15T10:00:00[Europe/Amsterdam]",
		);

		it("should return false for future expiry", () => {
			const futureExpiry = "2024-01-16T10:00:00.000Z";
			expect(isProviderTokenExpired(futureExpiry, mockNow)).toBe(false);
		});

		it("should return true for past expiry", () => {
			const pastExpiry = "2024-01-14T10:00:00.000Z";
			expect(isProviderTokenExpired(pastExpiry, mockNow)).toBe(true);
		});

		it("should return true for exact expiry time", () => {
			const exactExpiry = mockNow.toInstant().toString();
			expect(isProviderTokenExpired(exactExpiry, mockNow)).toBe(false);
		});
	});

	describe("mapCredentialsToHealthStatus", () => {
		const mockNow = Temporal.ZonedDateTime.from(
			"2024-01-15T10:00:00[Europe/Amsterdam]",
		);

		it("should return not_connected when no credentials exist", () => {
			expect(mapCredentialsToHealthStatus(false, undefined, mockNow)).toBe(
				"not_connected",
			);
		});

		it("should return ok when credentials exist and not expired", () => {
			const futureExpiry = "2024-01-16T10:00:00.000Z";
			expect(
				mapCredentialsToHealthStatus(true, futureExpiry, mockNow),
			).toBe("ok");
		});

		it("should return invalid_token when credentials exist but expired", () => {
			const pastExpiry = "2024-01-14T10:00:00.000Z";
			expect(mapCredentialsToHealthStatus(true, pastExpiry, mockNow)).toBe(
				"invalid_token",
			);
		});

		it("should return ok when credentials exist without expiry check", () => {
			expect(mapCredentialsToHealthStatus(true, undefined, mockNow)).toBe(
				"ok",
			);
		});
	});

	describe("Integration scenarios", () => {
		it("should properly handle full provider connection flow", () => {
			const mockNow = Temporal.ZonedDateTime.from(
				"2024-01-15T10:00:00[Europe/Amsterdam]",
			);

			// Not connected scenario
			const notConnectedStatus = mapCredentialsToHealthStatus(
				false,
				undefined,
				mockNow,
			);
			expect(notConnectedStatus).toBe("not_connected");
			expect(getStatusBadgeVariant(notConnectedStatus)).toBe("secondary");
			expect(shouldDisableIssueButton(notConnectedStatus)).toBe(true);

			// Connected and valid scenario
			const validExpiry = "2024-01-16T10:00:00.000Z";
			const validStatus = mapCredentialsToHealthStatus(
				true,
				validExpiry,
				mockNow,
			);
			expect(validStatus).toBe("ok");
			expect(getStatusBadgeVariant(validStatus)).toBe("default");
			expect(shouldDisableIssueButton(validStatus)).toBe(false);

			// Connected but expired scenario
			const expiredExpiry = "2024-01-14T10:00:00.000Z";
			const expiredStatus = mapCredentialsToHealthStatus(
				true,
				expiredExpiry,
				mockNow,
			);
			expect(expiredStatus).toBe("invalid_token");
			expect(getStatusBadgeVariant(expiredStatus)).toBe("destructive");
			expect(shouldDisableIssueButton(expiredStatus)).toBe(true);
		});
	});
});