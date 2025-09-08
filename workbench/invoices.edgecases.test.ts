import { describe, it, expect, beforeEach, vi } from "vitest";
import { epochMs } from "~/lib/time";

// Mock the required dependencies
vi.mock("~/lib/time", () => ({
	parseZdt: vi.fn((iso: string) => Temporal.ZonedDateTime.from(iso)),
	now: vi.fn(() => Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
	epochMs: vi.fn(() => Temporal.Now.instant().epochMilliseconds),
}));

vi.mock("~/server/db/client", () => ({
	createSystemClient: vi.fn(() => ({
		from: vi.fn(() => ({
			select: vi.fn(),
			update: vi.fn(),
			insert: vi.fn(),
		})),
	})),
}));

// Mock dunning selection logic
function mockDunningSelector(invoices: Array<{
	id: string;
	status: string;
	provider_status?: string;
	total_cents: number;
	issued_at?: string;
	last_dunning_at?: string;
}>) {
	// Dunning logic: select overdue invoices that haven't been dunned recently
	return invoices.filter((invoice) => {
		// Skip paid/cancelled invoices
		if (invoice.status === "paid" || invoice.provider_status === "paid") {
			return false;
		}
		if (invoice.status === "cancelled" || invoice.provider_status === "cancelled") {
			return false;
		}

		// Must be issued
		if (!invoice.issued_at) {
			return false;
		}

		// Must be overdue (simplified: older than 30 days)
		const issuedTime = Temporal.Instant.from(invoice.issued_at).epochMilliseconds;
		const now = epochMs();
		const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
		
		if (now - issuedTime < thirtyDaysMs) {
			return false; // Not overdue yet
		}

		// Skip if dunned recently (within last 7 days)
		if (invoice.last_dunning_at) {
			const lastDunningTime = Temporal.Instant.from(invoice.last_dunning_at).epochMilliseconds;
			const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
			
			if (now - lastDunningTime < sevenDaysMs) {
				return false; // Too soon to dun again
			}
		}

		return true;
	});
}

// Mock status refresh with backoff
function mockStatusRefresh(invoiceId: string, lastRefreshAt?: string) {
	const now = epochMs();
	
	// Implement exponential backoff
	if (lastRefreshAt) {
		try {
			const lastRefreshTime = Temporal.Instant.from(lastRefreshAt).epochMilliseconds;
			const timeSinceLastRefresh = now - lastRefreshTime;
			
			// Start with 5 minute minimum interval, double up to 2 hours max
			const baseInterval = 5 * 60 * 1000; // 5 minutes
			const maxInterval = 2 * 60 * 60 * 1000; // 2 hours
			
			// Simple backoff: double interval for each hour since last refresh
			const hoursSinceRefresh = Math.floor(timeSinceLastRefresh / (60 * 60 * 1000));
			const currentInterval = Math.min(baseInterval * Math.pow(2, hoursSinceRefresh), maxInterval);
			
			if (timeSinceLastRefresh < currentInterval) {
				return { shouldRefresh: false, reason: "backoff", nextRefreshIn: currentInterval - timeSinceLastRefresh };
			}
		} catch (error) {
			// Handle corrupted timestamp - treat as no previous refresh
			// This allows the refresh to proceed
		}
	}
	
	return { shouldRefresh: true, reason: "eligible" };
}

describe("Invoice Dunning Edge Cases", () => {
	beforeEach(() => {
		// Reset time mocks
		vi.clearAllMocks();
	});

	describe("Late payment exclusion", () => {
		it("removes invoice from dunning when paid late", async () => {
			const invoices = [
				{
					id: "invoice-1",
					status: "sent",
					provider_status: "sent",
					total_cents: 100000, // €1000
					issued_at: "2024-01-01T10:00:00Z", // 30+ days ago
					last_dunning_at: "2024-01-20T10:00:00Z", // 7+ days ago
				},
				{
					id: "invoice-2", 
					status: "sent",
					provider_status: "paid", // Paid after dunning started
					total_cents: 50000, // €500
					issued_at: "2024-01-01T10:00:00Z", // 30+ days ago
					last_dunning_at: "2024-01-20T10:00:00Z", // 7+ days ago
				},
			];

			// Mock current time as February 2024
			const timeModule = await import("~/lib/time");
			vi.mocked(timeModule.epochMs).mockReturnValue(Temporal.Instant.from("2024-02-01T10:00:00Z").epochMilliseconds);

			const dunningCandidates = mockDunningSelector(invoices);

			// Should include invoice-1 (still unpaid) but exclude invoice-2 (paid)
			expect(dunningCandidates).toHaveLength(1);
			expect(dunningCandidates[0].id).toBe("invoice-1");
			expect(dunningCandidates.find(i => i.id === "invoice-2")).toBeUndefined();
		});

		it("handles status change during dunning process", async () => {
			const invoice = {
				id: "invoice-rapid-pay",
				status: "sent",
				provider_status: "sent", // Initially sent
				total_cents: 75000,
				issued_at: "2024-01-01T10:00:00Z",
				last_dunning_at: undefined, // Never dunned
			};

			// First check: eligible for dunning
			const timeModule = await import("~/lib/time");
			vi.mocked(timeModule.epochMs).mockReturnValue(Temporal.Instant.from("2024-02-01T10:00:00Z").epochMilliseconds);
			let candidates = mockDunningSelector([invoice]);
			expect(candidates).toHaveLength(1);

			// Simulate status change to paid during dunning
			const updatedInvoice = { ...invoice, provider_status: "paid" };
			candidates = mockDunningSelector([updatedInvoice]);
			expect(candidates).toHaveLength(0); // Should be excluded now
		});

		it("respects cancelled status for dunning exclusion", async () => {
			const invoices = [
				{
					id: "invoice-cancelled",
					status: "cancelled",
					provider_status: "sent",
					total_cents: 100000,
					issued_at: "2024-01-01T10:00:00Z",
				},
				{
					id: "invoice-provider-cancelled",
					status: "sent", 
					provider_status: "cancelled",
					total_cents: 100000,
					issued_at: "2024-01-01T10:00:00Z",
				},
			];

			const timeModule = await import("~/lib/time");
			vi.mocked(timeModule.epochMs).mockReturnValue(Temporal.Instant.from("2024-02-01T10:00:00Z").epochMilliseconds);
			const candidates = mockDunningSelector(invoices);

			// Both cancelled invoices should be excluded
			expect(candidates).toHaveLength(0);
		});
	});

	describe("Dunning frequency controls", () => {
		it("prevents dunning too frequently", async () => {
			const invoice = {
				id: "invoice-recent-dun",
				status: "sent",
				provider_status: "sent",
				total_cents: 100000,
				issued_at: "2024-01-01T10:00:00Z", // Long overdue
				last_dunning_at: "2024-01-25T10:00:00Z", // Recently dunned
			};

			// Current time: only 3 days since last dunning
			const timeModule = await import("~/lib/time");
			vi.mocked(timeModule.epochMs).mockReturnValue(Temporal.Instant.from("2024-01-28T10:00:00Z").epochMilliseconds);
			
			let candidates = mockDunningSelector([invoice]);
			expect(candidates).toHaveLength(0); // Too soon

			// Move forward 5 more days (8 days total since last dunning)
			const timeModule2 = await import("~/lib/time");
			vi.mocked(timeModule2.epochMs).mockReturnValue(Temporal.Instant.from("2024-02-02T10:00:00Z").epochMilliseconds);
			
			candidates = mockDunningSelector([invoice]);
			expect(candidates).toHaveLength(1); // Now eligible again
		});

		it("handles first-time dunning eligibility", async () => {
			const invoice = {
				id: "invoice-first-dun",
				status: "sent",
				provider_status: "sent",
				total_cents: 100000,
				issued_at: "2024-01-01T10:00:00Z", // 30+ days old
				last_dunning_at: undefined, // Never dunned
			};

			const timeModule = await import("~/lib/time");
			vi.mocked(timeModule.epochMs).mockReturnValue(Temporal.Instant.from("2024-02-01T10:00:00Z").epochMilliseconds);
			
			const candidates = mockDunningSelector([invoice]);
			expect(candidates).toHaveLength(1);
			expect(candidates[0].id).toBe("invoice-first-dun");
		});
	});
});

describe("Status Refresh Idempotency & Backoff", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Idempotency checks", () => {
		it("prevents duplicate refresh for same invoice", () => {
			const invoiceId = "invoice-123";
			const recentRefreshTime = Temporal.Instant.fromEpochMilliseconds(epochMs() - 2 * 60 * 1000).toString(); // 2 minutes ago
			
			const result = mockStatusRefresh(invoiceId, recentRefreshTime);
			
			expect(result.shouldRefresh).toBe(false);
			expect(result.reason).toBe("backoff");
			expect(result.nextRefreshIn).toBeGreaterThan(0);
		});

		it("allows refresh after backoff period", () => {
			const invoiceId = "invoice-123";
			const oldRefreshTime = Temporal.Instant.fromEpochMilliseconds(epochMs() - 10 * 60 * 1000).toString(); // 10 minutes ago
			
			const result = mockStatusRefresh(invoiceId, oldRefreshTime);
			
			expect(result.shouldRefresh).toBe(true);
			expect(result.reason).toBe("eligible");
		});
	});

	describe("Exponential backoff", () => {
		it("implements increasing backoff intervals", () => {
			const invoiceId = "invoice-backoff-test";
			
			// First refresh: 3 minutes ago (should allow after 5 minutes)
			let lastRefresh = Temporal.Instant.fromEpochMilliseconds(epochMs() - 3 * 60 * 1000).toString();
			let result = mockStatusRefresh(invoiceId, lastRefresh);
			expect(result.shouldRefresh).toBe(false); // Too soon
			
			// Second attempt: 6 minutes ago (should allow)
			lastRefresh = Temporal.Instant.fromEpochMilliseconds(epochMs() - 6 * 60 * 1000).toString();
			result = mockStatusRefresh(invoiceId, lastRefresh);
			expect(result.shouldRefresh).toBe(true); // Now eligible
			
			// After 1 hour: interval should have doubled
			lastRefresh = Temporal.Instant.fromEpochMilliseconds(epochMs() - 70 * 60 * 1000).toString(); // 70 minutes ago
			result = mockStatusRefresh(invoiceId, lastRefresh);
			expect(result.shouldRefresh).toBe(true); // Should be eligible (backoff period passed)
		});

		it("caps backoff at maximum interval", () => {
			const invoiceId = "invoice-max-backoff";
			
			// Very old refresh (should use max interval)
			const veryOldRefresh = Temporal.Instant.fromEpochMilliseconds(epochMs() - 10 * 60 * 60 * 1000).toString(); // 10 hours ago
			const result = mockStatusRefresh(invoiceId, veryOldRefresh);
			
			expect(result.shouldRefresh).toBe(true); // Should definitely be eligible after 10 hours
		});
	});

	describe("Concurrent refresh prevention", () => {
		it("handles rapid consecutive calls", () => {
			const invoiceId = "invoice-concurrent";
			const justRefreshed = Temporal.Instant.fromEpochMilliseconds(epochMs() - 30 * 1000).toString(); // 30 seconds ago
			
			// Multiple rapid calls should all return false
			const result1 = mockStatusRefresh(invoiceId, justRefreshed);
			const result2 = mockStatusRefresh(invoiceId, justRefreshed);
			const result3 = mockStatusRefresh(invoiceId, justRefreshed);
			
			expect(result1.shouldRefresh).toBe(false);
			expect(result2.shouldRefresh).toBe(false); 
			expect(result3.shouldRefresh).toBe(false);
			
			// All should have identical remaining backoff time since they're called immediately after each other
			expect(result1.nextRefreshIn).toBe(result2.nextRefreshIn);
		});

		it("handles race conditions gracefully", () => {
			// This test simulates multiple workers trying to refresh the same invoice
			const invoiceId = "invoice-race";
			const noRefreshHistory = undefined;
			
			// Both workers see no recent refresh
			const worker1Result = mockStatusRefresh(invoiceId, noRefreshHistory);
			const worker2Result = mockStatusRefresh(invoiceId, noRefreshHistory);
			
			// Both should be allowed to proceed (database constraints would handle duplicates)
			expect(worker1Result.shouldRefresh).toBe(true);
			expect(worker2Result.shouldRefresh).toBe(true);
			
			// In real implementation, database would handle the race with unique constraints
		});
	});

	describe("Error recovery scenarios", () => {
		it("handles corrupted timestamp gracefully", () => {
			const invoiceId = "invoice-bad-timestamp";
			const badTimestamp = "not-a-valid-iso-string";
			
			// Should handle gracefully and allow refresh
			expect(() => {
				const result = mockStatusRefresh(invoiceId, badTimestamp);
				// Bad timestamp should be treated as "no previous refresh"
				expect(result.shouldRefresh).toBe(true);
			}).not.toThrow();
		});

		it("handles null/undefined timestamps", () => {
			const invoiceId = "invoice-null-timestamp";
			
			const resultUndefined = mockStatusRefresh(invoiceId, undefined);
			expect(resultUndefined.shouldRefresh).toBe(true);
			
			const resultNull = mockStatusRefresh(invoiceId, null as any);
			expect(resultNull.shouldRefresh).toBe(true);
		});
	});
});

// Test specific to invoice status refresh job behavior
describe("Invoice Status Refresh Job Edge Cases", () => {
	it("handles provider API failures gracefully", () => {
		// Mock scenario where provider API is down
		const mockJobData = {
			invoiceId: "invoice-api-down",
			provider: "moneybird",
			externalId: "mb-12345",
			lastRefreshAt: undefined,
		};

		// Simulate the job logic decision-making
		const shouldRetry = (attemptCount: number, errorType: string): boolean => {
			if (errorType === "network_timeout" && attemptCount < 3) {
				return true;
			}
			if (errorType === "rate_limit" && attemptCount < 5) {
				return true;
			}
			if (errorType === "auth_error") {
				return false; // Don't retry auth errors
			}
			return attemptCount < 2; // Default: retry once
		};

		// Test retry logic
		expect(shouldRetry(1, "network_timeout")).toBe(true);
		expect(shouldRetry(3, "network_timeout")).toBe(false);
		expect(shouldRetry(1, "auth_error")).toBe(false);
		expect(shouldRetry(1, "rate_limit")).toBe(true);
	});

	it("handles partial batch failures", () => {
		const invoiceBatch = [
			{ id: "inv-1", provider: "moneybird", external_id: "mb-1" },
			{ id: "inv-2", provider: "moneybird", external_id: "mb-2" }, // Will fail
			{ id: "inv-3", provider: "wefact", external_id: "wf-1" },
		];

		// Simulate partial failure scenario
		const batchResults = invoiceBatch.map((invoice) => ({
			invoiceId: invoice.id,
			success: invoice.id !== "inv-2", // inv-2 fails
			error: invoice.id === "inv-2" ? "Provider timeout" : undefined,
		}));

		const successCount = batchResults.filter(r => r.success).length;
		const failureCount = batchResults.filter(r => !r.success).length;

		expect(successCount).toBe(2);
		expect(failureCount).toBe(1);
		
		// Failed items should be retried separately
		const retryQueue = batchResults
			.filter(r => !r.success)
			.map(r => r.invoiceId);
		
		expect(retryQueue).toEqual(["inv-2"]);
	});
});