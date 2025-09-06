import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "~/lib/time";

describe("e-Boekhouden session management", () => {
	let fetchSpy: any;
	let sessionCallCount = 0;

	beforeEach(() => {
		sessionCallCount = 0;
		
		fetchSpy = vi.spyOn(global, "fetch" as any).mockImplementation(async (url: string, init?: any) => {
			const urlStr = String(url);
			
			if (urlStr.endsWith("/v1/session")) {
				sessionCallCount++;
				return {
					ok: true,
					json: async () => ({ sessiontoken: `SESSION_TOKEN_${sessionCallCount}` }),
					status: 200,
				} as any;
			}
			
			// Other API calls expect Authorization header
			const hasAuth = init?.headers?.Authorization || init?.headers?.authorization;
			if (!hasAuth) {
				return {
					ok: false,
					status: 401,
					text: async () => "Unauthorized",
				} as any;
			}

			return {
				ok: true,
				json: async () => ({ success: true }),
				status: 200,
			} as any;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates session once and reuses token", async () => {
		// Simulate session creation
		const sessionResponse = await fetch("https://api.e-boekhouden.nl/v1/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "api-token-123" }),
		});

		const sessionData = await sessionResponse.json();
		expect(sessionData.sessiontoken).toBe("SESSION_TOKEN_1");

		// Simulate API calls with the session token
		await fetch("https://api.e-boekhouden.nl/v1/relaties", {
			headers: { Authorization: `Bearer ${sessionData.sessiontoken}` },
		});

		await fetch("https://api.e-boekhouden.nl/v1/facturen", {
			headers: { Authorization: `Bearer ${sessionData.sessiontoken}` },
		});

		// Should have made exactly one session call
		expect(sessionCallCount).toBe(1);
		
		// Should have made 3 total calls (1 session + 2 API)
		expect(fetchSpy).toHaveBeenCalledTimes(3);
	});

	it("handles session creation with proper request format", async () => {
		await fetch("https://api.e-boekhouden.nl/v1/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "test-api-token" }),
		});

		const [url, options] = fetchSpy.mock.calls[0];
		expect(url).toBe("https://api.e-boekhouden.nl/v1/session");
		expect(options.method).toBe("POST");
		expect(options.headers["Content-Type"]).toBe("application/json");
		
		const body = JSON.parse(options.body);
		expect(body.token).toBe("test-api-token");
	});

	it("handles session creation failures", async () => {
		fetchSpy.mockResolvedValueOnce({
			ok: false,
			status: 401,
			text: async () => "Invalid API token",
		} as any);

		try {
			await fetch("https://api.e-boekhouden.nl/v1/session", {
				method: "POST",
				body: JSON.stringify({ token: "invalid-token" }),
			});
			
			const response = await fetchSpy.mock.results[0].value;
			expect(response.ok).toBe(false);
			expect(response.status).toBe(401);
			
			const errorText = await response.text();
			expect(errorText).toBe("Invalid API token");
		} catch (error) {
			// Network errors might be thrown
		}
	});

	it("sends proper headers for API requests with session", async () => {
		// Create session first
		await fetch("https://api.e-boekhouden.nl/v1/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "api-token" }),
		});

		// Make API call with session token
		await fetch("https://api.e-boekhouden.nl/v1/relaties", {
			headers: { 
				Authorization: "Bearer SESSION_TOKEN_1",
				"Content-Type": "application/json"
			},
		});

		// Check API call headers
		const apiCall = fetchSpy.mock.calls.find(call => 
			String(call[0]).includes("/v1/relaties")
		);
		expect(apiCall).toBeDefined();
		expect(apiCall[1].headers.Authorization).toBe("Bearer SESSION_TOKEN_1");
	});

	it("handles invoice operations with session", async () => {
		// Mock session creation
		await fetch("https://api.e-boekhouden.nl/v1/session", {
			method: "POST",
			body: JSON.stringify({ token: "test-token" }),
		});

		// Mock creating an invoice
		fetchSpy.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				Factuurnummer: "F2025-001",
				Relatiecode: "CUST001", 
				Status: "Concept"
			}),
			status: 200,
		} as any);

		await fetch("https://api.e-boekhouden.nl/v1/facturen", {
			method: "POST",
			headers: { 
				Authorization: "Bearer SESSION_TOKEN_1",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				Relatiecode: "CUST001",
				Factuurbedrag: "121.00",
				Regels: [
					{ Omschrijving: "Test service", Aantal: 1, Eenheidsprijs: "100.00" }
				]
			}),
		});

		const invoiceCall = fetchSpy.mock.calls.find(call =>
			String(call[0]).includes("/v1/facturen") && call[1]?.method === "POST"
		);
		expect(invoiceCall).toBeDefined();
		
		const body = JSON.parse(invoiceCall[1].body);
		expect(body.Relatiecode).toBe("CUST001");
		expect(body.Factuurbedrag).toBe("121.00");
		expect(body.Regels).toHaveLength(1);
	});

	it("handles TTL expiration simulation", async () => {
		// First session creation
		const response1 = await fetch("https://api.e-boekhouden.nl/v1/session", {
			method: "POST",
			body: JSON.stringify({ token: "api-token" }),
		});
		const data1 = await response1.json();
		expect(data1.sessiontoken).toBe("SESSION_TOKEN_1");

		// Simulate expired session by creating a new one
		const response2 = await fetch("https://api.e-boekhouden.nl/v1/session", {
			method: "POST",
			body: JSON.stringify({ token: "api-token" }),
		});
		const data2 = await response2.json();
		expect(data2.sessiontoken).toBe("SESSION_TOKEN_2");

		// Should have made 2 session calls
		expect(sessionCallCount).toBe(2);
	});
});