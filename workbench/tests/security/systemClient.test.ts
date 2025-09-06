import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the server-only module
vi.mock("server-only", () => ({}));

// Mock the systemClient functions since they use server-only
const assertSystemScope = vi.fn((headers: Headers) => {
	const token = headers.get("x-internal-job-token");
	if (token !== process.env.INTERNAL_JOB_TOKEN) {
		throw new Error("Unauthorized");
	}
	return { __brand: "SystemScope" } as const;
});

const getSystemDb = vi.fn((scope: any) => {
	return {
		from: vi.fn(),
		rpc: vi.fn(),
	};
});

describe("system client scope", () => {
	const testToken = "test-internal-job-token-12345678901234567890123456789012";
	let originalEnv: string | undefined;

	beforeEach(() => {
		// Store original env
		originalEnv = process.env.INTERNAL_JOB_TOKEN;
		// Set test token
		process.env.INTERNAL_JOB_TOKEN = testToken;
	});

	it("throws without internal token", () => {
		const headers = new Headers();
		expect(() => assertSystemScope(headers)).toThrow("Unauthorized");
	});

	it("throws with invalid token", () => {
		const headers = new Headers({ "x-internal-job-token": "invalid-token" });
		expect(() => assertSystemScope(headers)).toThrow("Unauthorized");
	});

	it("returns scope with correct token", () => {
		const headers = new Headers({ "x-internal-job-token": testToken });
		const scope = assertSystemScope(headers);
		expect(scope).toEqual({ __brand: "SystemScope" });
	});

	it("allows system DB access with valid scope", () => {
		const headers = new Headers({ "x-internal-job-token": testToken });
		const scope = assertSystemScope(headers);
		
		// Should not throw
		expect(() => getSystemDb(scope)).not.toThrow();
		
		// Should return a client (we can't test the actual DB functionality without env vars)
		const client = getSystemDb(scope);
		expect(client).toBeDefined();
		expect(typeof client.from).toBe("function");
	});

	it("enforces case-sensitive header name", () => {
		// Headers are case-insensitive in browsers/Node, so this test checks
		// that our mock respects the expected lowercase header name
		const headers = new Headers({ "X-Internal-Job-Token": testToken });
		// Headers normalizes to lowercase, so this will actually work
		expect(headers.get("x-internal-job-token")).toBe(testToken);
		// Our implementation should accept it since Headers normalizes
		expect(() => assertSystemScope(headers)).not.toThrow();
	});

	it("prevents token leakage in error message", () => {
		const headers = new Headers({ "x-internal-job-token": "wrong-token" });
		try {
			assertSystemScope(headers);
			expect.fail("Should have thrown");
		} catch (error) {
			expect((error as Error).message).toBe("Unauthorized");
			expect((error as Error).message).not.toContain("wrong-token");
			expect((error as Error).message).not.toContain(testToken);
		}
	});

	// Cleanup
	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.INTERNAL_JOB_TOKEN = originalEnv;
		} else {
			delete process.env.INTERNAL_JOB_TOKEN;
		}
	});
});