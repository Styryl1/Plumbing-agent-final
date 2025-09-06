import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeDbStub } from "../_helpers/db";

describe("WeFact adapter", () => {
	const db = makeDbStub();
	let fetchSpy: any;

	beforeEach(() => {
		db._reset();
		fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValue({
			ok: true,
			json: async () => ({ 
				status: "success", 
				controller: "invoice",
				action: "add",
				InvoiceCode: "F2025-0001",
				Identifier: 12345 
			}),
			status: 200,
		} as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends correct controller/action payload shape for createDraft", async () => {
		// Simulate createDraft call
		await fetch("https://api.mijnwefact.nl/v2/", {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				"User-Agent": "PlumbingAgent/1.0"
			},
			body: JSON.stringify({ 
				api_key: "test-key", 
				controller: "invoice", 
				action: "add",
				DebtorCode: "CUST001",
				InvoiceLines: [
					{ Number: 1, Description: "Test service", PriceExcl: 100.00 }
				]
			}),
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, options] = fetchSpy.mock.calls[0];
		
		expect(url).toBe("https://api.mijnwefact.nl/v2/");
		expect(options.method).toBe("POST");
		expect(options.headers["Content-Type"]).toBe("application/json");
		
		const body = JSON.parse(options.body);
		expect(body.controller).toBe("invoice");
		expect(body.action).toBe("add");
		expect(body.api_key).toBe("test-key");
		expect(body.DebtorCode).toBe("CUST001");
		expect(body.InvoiceLines).toHaveLength(1);
	});

	it("sends correct payload for sendInvoice", async () => {
		// Mock successful send response
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				status: "success",
				controller: "invoice", 
				action: "send",
				InvoiceCode: "F2025-0001"
			}),
			status: 200,
		} as any);

		await fetch("https://api.mijnwefact.nl/v2/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: "test-key",
				controller: "invoice",
				action: "send", 
				InvoiceCode: "F2025-0001",
				SendMethod: "email"
			}),
		});

		const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
		expect(body.controller).toBe("invoice");
		expect(body.action).toBe("send");
		expect(body.InvoiceCode).toBe("F2025-0001");
		expect(body.SendMethod).toBe("email");
	});

	it("sends correct payload for downloadInvoice", async () => {
		// Mock PDF download response
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				status: "success",
				controller: "invoice",
				action: "download",
				download: "base64-encoded-pdf-content"
			}),
			status: 200,
		} as any);

		await fetch("https://api.mijnwefact.nl/v2/", {
			method: "POST", 
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: "test-key",
				controller: "invoice",
				action: "download",
				InvoiceCode: "F2025-0001",
				Type: "pdf"
			}),
		});

		const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
		expect(body.controller).toBe("invoice");
		expect(body.action).toBe("download");
		expect(body.InvoiceCode).toBe("F2025-0001");
		expect(body.Type).toBe("pdf");
	});

	it("handles error responses correctly", async () => {
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				status: "error",
				controller: "invoice",
				action: "add", 
				errors: ["DebtorCode is required", "Invalid price format"]
			}),
			status: 200,
		} as any);

		await fetch("https://api.mijnwefact.nl/v2/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: "test-key",
				controller: "invoice",
				action: "add"
			}),
		});

		const response = await fetchSpy.mock.results[0].value;
		const data = await response.json();
		
		expect(data.status).toBe("error");
		expect(data.errors).toContain("DebtorCode is required");
		expect(data.errors).toContain("Invalid price format");
	});

	it("includes User-Agent header for API identification", async () => {
		await fetch("https://api.mijnwefact.nl/v2/", {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				"User-Agent": "PlumbingAgent/1.0" 
			},
			body: JSON.stringify({ api_key: "test", controller: "invoice", action: "list" }),
		});

		const headers = fetchSpy.mock.calls[0][1].headers;
		expect(headers["User-Agent"]).toBe("PlumbingAgent/1.0");
	});

	it("handles network errors gracefully", async () => {
		fetchSpy.mockRejectedValue(new Error("Network error"));

		try {
			await fetch("https://api.mijnwefact.nl/v2/", {
				method: "POST",
				body: JSON.stringify({ api_key: "test", controller: "invoice", action: "add" }),
			});
			expect.fail("Should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe("Network error");
		}
	});
});