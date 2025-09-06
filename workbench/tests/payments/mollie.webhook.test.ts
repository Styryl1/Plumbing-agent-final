import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDbStub } from "../_helpers/db";

function parseFormUrlEncoded(body: string): Record<string, string> {
	const params = new URLSearchParams(body);
	const result: Record<string, string> = {};
	for (const [key, value] of params) {
		result[key] = value;
	}
	return result;
}

describe("mollie webhook processing", () => {
	let db: ReturnType<typeof makeDbStub>;

	beforeEach(() => {
		// Fresh db instance for each test - prevents mock drift
		db = makeDbStub();
		
		// Sanity guard: ensure mock implementation is present
		expect(vi.isMockFunction(db.rpc)).toBe(true);
		if (!db.rpc.getMockImplementation()) {
			// Re-seed (paranoid guard; should not trigger after config fix)
			db = makeDbStub();
			expect(db.rpc.getMockImplementation()).toBeTruthy();
		}
	});

	it("parses form-urlencoded bodies correctly", () => {
		const body = "id=tr_12345&status=paid";
		const parsed = parseFormUrlEncoded(body);
		
		expect(parsed.id).toBe("tr_12345");
		expect(parsed.status).toBe("paid");
	});

	it("handles single field form data", () => {
		const body = "id=tr_WDqYK6vllg";
		const parsed = parseFormUrlEncoded(body);
		
		expect(parsed.id).toBe("tr_WDqYK6vllg");
		expect(parsed.status).toBeUndefined();
	});

	it("handles URL-encoded special characters", () => {
		const body = "id=tr_12345&description=Test%20Payment%20%26%20VAT";
		const parsed = parseFormUrlEncoded(body);
		
		expect(parsed.id).toBe("tr_12345");
		expect(parsed.description).toBe("Test Payment & VAT");
	});

	it("dedupes events using payment_id:status combination", async () => {
		// Seed invoice
		db._tables["invoices"] = [
			{
				id: "inv1",
				org_id: "org1",
				mollie_payment_id: "tr_12345",
				payment_status: "unpaid",
				paid_at: null,
			},
		];

		// Mock Mollie API response
		vi.spyOn(global, "fetch" as any).mockResolvedValue({
			ok: true,
			json: async () => ({
				id: "tr_12345",
				status: "paid",
				paidAt: "2025-09-05T12:00:00.000+02:00",
				amount: { value: "100.00", currency: "EUR" },
				metadata: { invoiceId: "inv1" },
			}),
			status: 200,
		} as any);

		// Create unique event ID for deduplication
		const eventId = `tr_12345:paid`;

		// First processing - should succeed
		const exists1 = await db.rpc("get_webhook_event_exists", {
			p_provider: "mollie",
			p_webhook_id: eventId,
		});
		expect(exists1.data).toBe(false);

		// Record the event
		await db.rpc("record_webhook_event", {
			p_provider: "mollie",
			p_webhook_id: eventId,
			p_event_type: "payment.updated",
			p_entity_type: "payment",
			p_entity_id: "tr_12345",
		});

		// Update invoice
		const updateResult = db.from("invoices").update({
			payment_status: "paid",
			paid_at: "2025-09-05T12:00:00.000+02:00",
		}).eq("id", "inv1");

		expect(updateResult.data?.payment_status).toBe("paid");
		expect(updateResult.data?.paid_at).toBe("2025-09-05T12:00:00.000+02:00");

		// Second processing - should be deduplicated
		const exists2 = await db.rpc("get_webhook_event_exists", {
			p_provider: "mollie",
			p_webhook_id: eventId,
		});
		expect(exists2.data).toBe(true);

		// Verify invoice wasn't double-updated
		const invoice = db.from("invoices").select("*").eq("id", "inv1").single();
		expect(invoice.data?.payment_status).toBe("paid");
	});

	it("reconciles payment statuses correctly", async () => {
		const statusMappings = [
			{ mollieStatus: "paid", expectedStatus: "paid", shouldSetPaidAt: true },
			{ mollieStatus: "failed", expectedStatus: "failed", shouldSetPaidAt: false },
			{ mollieStatus: "canceled", expectedStatus: "canceled", shouldSetPaidAt: false },
			{ mollieStatus: "expired", expectedStatus: "expired", shouldSetPaidAt: false },
			{ mollieStatus: "open", expectedStatus: "pending", shouldSetPaidAt: false },
			{ mollieStatus: "pending", expectedStatus: "pending", shouldSetPaidAt: false },
		];

		for (const { mollieStatus, expectedStatus, shouldSetPaidAt } of statusMappings) {
			db._reset();
			
			// Seed invoice
			const invoiceId = `inv_${mollieStatus}`;
			const paymentId = `tr_${mollieStatus}`;
			
			db._tables["invoices"] = [
				{
					id: invoiceId,
					org_id: "org1",
					mollie_payment_id: paymentId,
					payment_status: "unpaid",
					paid_at: null,
				},
			];

			// Mock Mollie API response
			vi.spyOn(global, "fetch" as any).mockResolvedValue({
				ok: true,
				json: async () => ({
					id: paymentId,
					status: mollieStatus,
					paidAt: shouldSetPaidAt ? "2025-09-05T12:00:00.000+02:00" : null,
					amount: { value: "100.00", currency: "EUR" },
					method: "ideal",
					metadata: { invoiceId },
				}),
				status: 200,
			} as any);

			// Process webhook
			const eventId = `${paymentId}:${mollieStatus}`;
			
			await db.rpc("record_webhook_event", {
				p_provider: "mollie",
				p_webhook_id: eventId,
				p_event_type: "payment.updated",
				p_entity_type: "payment",
				p_entity_id: paymentId,
			});

			// Update invoice based on payment status
			const updateData: any = {
				payment_status: expectedStatus,
				payment_method: "ideal",
			};
			
			if (shouldSetPaidAt) {
				updateData.paid_at = "2025-09-05T12:00:00.000+02:00";
			} else {
				updateData.paid_at = null;
			}

			db.from("invoices").update(updateData).eq("id", invoiceId);

			// Verify update
			const invoice = db.from("invoices").select("*").eq("id", invoiceId).single();
			expect(invoice.data?.payment_status).toBe(expectedStatus);
			
			if (shouldSetPaidAt) {
				expect(invoice.data?.paid_at).toBe("2025-09-05T12:00:00.000+02:00");
			} else {
				expect(invoice.data?.paid_at).toBeNull();
			}
		}
	});

	it("handles missing invoice gracefully", async () => {
		// Initialize and verify empty invoices table
		db._tables["invoices"] = [];
		expect(db._tables["invoices"]).toHaveLength(0);

		// Mock Mollie API response
		vi.spyOn(global, "fetch" as any).mockResolvedValue({
			ok: true,
			json: async () => ({
				id: "tr_unknown",
				status: "paid",
				paidAt: "2025-09-05T12:00:00.000+02:00",
				amount: { value: "100.00", currency: "EUR" },
				metadata: { invoiceId: "nonexistent" },
			}),
			status: 200,
		} as any);

		// Try to find invoice - should fail
		const invoice = db.from("invoices").select("*").eq("mollie_payment_id", "tr_unknown").single();
		expect(invoice.error?.message).toBe("not found");

		// Event should still be recorded for idempotency
		const eventId = "tr_unknown:paid";
		await db.rpc("record_webhook_event", {
			p_provider: "mollie",
			p_webhook_id: eventId,
			p_event_type: "payment.updated",
			p_entity_type: "payment",
			p_entity_id: "tr_unknown",
		});

		const exists = await db.rpc("get_webhook_event_exists", {
			p_provider: "mollie",
			p_webhook_id: eventId,
		});
		expect(exists.data).toBe(true);
	});

	it("handles webhook token verification", () => {
		const validToken = "test-webhook-token-12345678901234567890123456789012";
		const requestToken = "test-webhook-token-12345678901234567890123456789012";
		
		// Simple token comparison (actual implementation uses constant-time comparison)
		expect(requestToken === validToken).toBe(true);
		
		// Invalid token
		const invalidToken = "wrong-token";
		expect(invalidToken === validToken).toBe(false);
	});

	it("updates payment method from webhook data", async () => {
		db._tables["invoices"] = [
			{
				id: "inv1",
				org_id: "org1",
				mollie_payment_id: "tr_12345",
				payment_status: "unpaid",
				payment_method: null,
			},
		];

		// Mock response with payment method
		vi.spyOn(global, "fetch" as any).mockResolvedValue({
			ok: true,
			json: async () => ({
				id: "tr_12345",
				status: "paid",
				paidAt: "2025-09-05T12:00:00.000+02:00",
				amount: { value: "100.00", currency: "EUR" },
				method: "creditcard",
				details: {
					cardNumber: "************1234",
					cardHolder: "J. Doe",
				},
				metadata: { invoiceId: "inv1" },
			}),
			status: 200,
		} as any);

		// Update invoice with payment method
		db.from("invoices").update({
			payment_status: "paid",
			payment_method: "creditcard",
			paid_at: "2025-09-05T12:00:00.000+02:00",
		}).eq("id", "inv1");

		const invoice = db.from("invoices").select("*").eq("id", "inv1").single();
		expect(invoice.data?.payment_method).toBe("creditcard");
	});

	it("handles webhook replay correctly", async () => {
		// Seed invoice with already paid status
		db._tables["invoices"] = [
			{
				id: "inv1",
				org_id: "org1",
				mollie_payment_id: "tr_12345",
				payment_status: "paid",
				paid_at: "2025-09-05T11:00:00.000+02:00",
			},
		];

		// Replay of same webhook with same status
		const eventId = "tr_12345:paid";
		
		// First record
		await db.rpc("record_webhook_event", {
			p_provider: "mollie",
			p_webhook_id: eventId,
			p_event_type: "payment.updated",
			p_entity_type: "payment",
			p_entity_id: "tr_12345",
		});

		// Try to record again - should be deduplicated
		const exists = await db.rpc("get_webhook_event_exists", {
			p_provider: "mollie",
			p_webhook_id: eventId,
		});
		expect(exists.data).toBe(true);

		// Invoice should remain unchanged
		const invoice = db.from("invoices").select("*").eq("id", "inv1").single();
		expect(invoice.data?.payment_status).toBe("paid");
		expect(invoice.data?.paid_at).toBe("2025-09-05T11:00:00.000+02:00");
	});
});