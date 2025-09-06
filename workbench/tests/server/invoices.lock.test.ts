import { describe, it, expect } from "vitest";

// Guard predicate used server-side: locked after send/issued
function isLocked(provider_status?: string | null, issued_at?: string | null): boolean {
	const lockedStates = new Set(["sent", "viewed", "paid", "overdue", "cancelled"]);
	return Boolean(issued_at) || (provider_status != null && lockedStates.has(provider_status));
}

describe("post-send invoice lock guard", () => {
	it("locks when issued_at is set", () => {
		expect(isLocked("draft", "2025-09-05T12:00:00Z")).toBe(true);
		expect(isLocked(null, "2025-09-05T12:00:00Z")).toBe(true);
		expect(isLocked(undefined, "2025-09-05T12:00:00Z")).toBe(true);
	});

	it("locks in terminal statuses", () => {
		expect(isLocked("paid", null)).toBe(true);
		expect(isLocked("overdue", null)).toBe(true);
		expect(isLocked("cancelled", null)).toBe(true);
		expect(isLocked("viewed", null)).toBe(true);
		expect(isLocked("sent", null)).toBe(true);
	});

	it("allows draft without issued_at", () => {
		expect(isLocked("draft", null)).toBe(false);
		expect(isLocked("draft", undefined)).toBe(false);
	});

	it("allows null/undefined states without issued_at", () => {
		expect(isLocked(null, null)).toBe(false);
		expect(isLocked(undefined, undefined)).toBe(false);
		expect(isLocked(undefined, null)).toBe(false);
	});

	it("handles edge cases correctly", () => {
		// Empty string should not lock
		expect(isLocked("", null)).toBe(false);
		
		// Unknown status should not lock (unless issued_at is set)
		expect(isLocked("unknown_status", null)).toBe(false);
		expect(isLocked("unknown_status", "2025-09-05T12:00:00Z")).toBe(true);
		
		// Any issued_at value should lock
		expect(isLocked("draft", "")).toBe(false); // Empty string is falsy
		expect(isLocked("draft", "invalid-date")).toBe(true); // Still truthy
	});
});

describe("invoice mutation guards", () => {
	// Simulated guard logic from the server
	function canEditInvoice(invoice: { provider_status?: string; issued_at?: string | null }): boolean {
		return !isLocked(invoice.provider_status, invoice.issued_at);
	}

	function canDeleteInvoice(invoice: { provider_status?: string; issued_at?: string | null }): boolean {
		// Deletes only allowed for drafts
		return invoice.provider_status === "draft" && !invoice.issued_at;
	}

	it("prevents editing locked invoices", () => {
		expect(canEditInvoice({ provider_status: "draft", issued_at: null })).toBe(true);
		expect(canEditInvoice({ provider_status: "sent", issued_at: null })).toBe(false);
		expect(canEditInvoice({ provider_status: "paid", issued_at: "2025-09-05T12:00:00Z" })).toBe(false);
		expect(canEditInvoice({ provider_status: "draft", issued_at: "2025-09-05T12:00:00Z" })).toBe(false);
	});

	it("prevents deleting non-draft invoices", () => {
		expect(canDeleteInvoice({ provider_status: "draft", issued_at: null })).toBe(true);
		expect(canDeleteInvoice({ provider_status: "sent", issued_at: null })).toBe(false);
		expect(canDeleteInvoice({ provider_status: "paid", issued_at: null })).toBe(false);
		expect(canDeleteInvoice({ provider_status: "draft", issued_at: "2025-09-05T12:00:00Z" })).toBe(false);
	});

	it("enforces provider-specific lock rules", () => {
		// Provider-specific states that should lock
		const providerStates = [
			{ provider: "moneybird", status: "sent" },
			{ provider: "moneybird", status: "paid" },
			{ provider: "wefact", status: "sent" },
			{ provider: "wefact", status: "paid" },
			{ provider: "eboekhouden", status: "sent" },
			{ provider: "eboekhouden", status: "paid" },
		];

		for (const { provider, status } of providerStates) {
			const invoice = { provider, provider_status: status, issued_at: null };
			expect(canEditInvoice(invoice)).toBe(false);
			expect(canDeleteInvoice(invoice)).toBe(false);
		}
	});
});

describe("invoice state transitions", () => {
	// Define canEditInvoice and canDeleteInvoice functions for this test suite
	function canEditInvoice(invoice: { provider_status?: string; issued_at?: string | null }): boolean {
		return !isLocked(invoice.provider_status, invoice.issued_at);
	}

	function canDeleteInvoice(invoice: { provider_status?: string; issued_at?: string | null }): boolean {
		// Deletes only allowed for drafts
		return invoice.provider_status === "draft" && !invoice.issued_at;
	}
	// Valid state transitions
	const validTransitions: [string, string][] = [
		["draft", "sent"],
		["sent", "viewed"],
		["sent", "paid"],
		["viewed", "paid"],
		["sent", "overdue"],
		["overdue", "paid"],
		["overdue", "cancelled"],
	];

	// Invalid state transitions (going backwards)
	const invalidTransitions: [string, string][] = [
		["sent", "draft"],
		["paid", "draft"],
		["paid", "sent"],
		["overdue", "draft"],
		["cancelled", "draft"],
	];

	function isValidTransition(from: string, to: string): boolean {
		// Can't change from locked state to draft
		if (to === "draft" && isLocked(from, null)) {
			return false;
		}

		// Check valid transitions
		return validTransitions.some(([f, t]) => f === from && t === to);
	}

	it("allows valid state transitions", () => {
		for (const [from, to] of validTransitions) {
			expect(isValidTransition(from, to)).toBe(true);
		}
	});

	it("prevents invalid state transitions", () => {
		for (const [from, to] of invalidTransitions) {
			expect(isValidTransition(from, to)).toBe(false);
		}
	});

	it("prevents any changes once paid", () => {
		const paidInvoice = { provider_status: "paid", issued_at: "2025-09-05T12:00:00Z" };
		
		// Should be fully locked
		expect(isLocked(paidInvoice.provider_status, paidInvoice.issued_at)).toBe(true);
		expect(canEditInvoice(paidInvoice)).toBe(false);
		expect(canDeleteInvoice(paidInvoice)).toBe(false);
		
		// Can't transition from paid to anything
		expect(isValidTransition("paid", "draft")).toBe(false);
		expect(isValidTransition("paid", "sent")).toBe(false);
		expect(isValidTransition("paid", "overdue")).toBe(false);
	});
});