// Test for WhatsApp Admin health logic
// Tests the pure health derivation function

import { describe, expect, it, vi, beforeEach } from "vitest";
import { deriveHealthFlags } from "../../src/server/api/routers/waAdmin";

// Mock the env module with controllable values
const mockEnv = {
	WHATSAPP_BUSINESS_PHONE_ID: undefined as string | undefined,
	WHATSAPP_ACCESS_TOKEN: undefined as string | undefined,
	WHATSAPP_WEBHOOK_SECRET: undefined as string | undefined,
};

vi.mock("~/lib/env", () => ({
	env: mockEnv,
}));

describe("deriveHealthFlags", () => {
	beforeEach(() => {
		// Reset mock env before each test
		mockEnv.WHATSAPP_BUSINESS_PHONE_ID = undefined;
		mockEnv.WHATSAPP_ACCESS_TOKEN = undefined;
		mockEnv.WHATSAPP_WEBHOOK_SECRET = undefined;
	});

	it("returns all false when no env vars are set", () => {
		// Env vars are already undefined from beforeEach
		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false,
			webhookOk: false,
			secretOk: false,
		});
	});

	it("returns partial true when some env vars are set", () => {
		mockEnv.WHATSAPP_WEBHOOK_SECRET = "test_secret";
		// Keep phone ID and token undefined

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false, // Missing business phone and token
			webhookOk: false, // Depends on envOk
			secretOk: true, // Secret is present
		});
	});

	it("returns all true when all required env vars are set", () => {
		mockEnv.WHATSAPP_BUSINESS_PHONE_ID = "test_phone_id";
		mockEnv.WHATSAPP_ACCESS_TOKEN = "test_token";
		mockEnv.WHATSAPP_WEBHOOK_SECRET = "test_secret";

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: true,
			webhookOk: true, // Currently mirrors envOk
			secretOk: true,
		});
	});

	it("handles empty string env vars as missing", () => {
		mockEnv.WHATSAPP_BUSINESS_PHONE_ID = "";
		mockEnv.WHATSAPP_ACCESS_TOKEN = "test_token";
		mockEnv.WHATSAPP_WEBHOOK_SECRET = "";

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false, // Empty phone ID is falsy
			webhookOk: false,
			secretOk: false, // Empty secret is falsy
		});
	});
});