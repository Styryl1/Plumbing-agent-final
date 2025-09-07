// Test for WhatsApp Admin health logic
// Tests the pure health derivation function

import { describe, expect, it, vi } from "vitest";
import { deriveHealthFlags } from "../../src/server/api/routers/waAdmin";

describe("deriveHealthFlags", () => {
	it("returns all false when no env vars are set", () => {
		// Mock environment with no WhatsApp vars
		vi.stubGlobal("process", {
			env: {},
		});

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false,
			webhookOk: false,
			secretOk: false,
		});
	});

	it("returns partial true when some env vars are set", () => {
		vi.stubGlobal("process", {
			env: {
				WHATSAPP_WEBHOOK_SECRET: "test_secret",
			},
		});

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false, // Missing business phone and token
			webhookOk: false, // Depends on envOk
			secretOk: true, // Secret is present
		});
	});

	it("returns all true when all required env vars are set", () => {
		vi.stubGlobal("process", {
			env: {
				WHATSAPP_BUSINESS_PHONE_ID: "1234567890",
				WHATSAPP_ACCESS_TOKEN: "test_token",
				WHATSAPP_WEBHOOK_SECRET: "test_secret",
			},
		});

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: true,
			webhookOk: true, // Currently mirrors envOk
			secretOk: true,
		});
	});

	it("handles empty string env vars as missing", () => {
		vi.stubGlobal("process", {
			env: {
				WHATSAPP_BUSINESS_PHONE_ID: "",
				WHATSAPP_ACCESS_TOKEN: "test_token",
				WHATSAPP_WEBHOOK_SECRET: "",
			},
		});

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false, // Empty phone ID is falsy
			webhookOk: false,
			secretOk: false, // Empty secret is falsy
		});
	});
});