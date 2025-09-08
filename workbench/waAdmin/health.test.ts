// Test for WhatsApp Admin health logic
// Tests the pure health derivation function

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the env module with controllable values - must be done before import
const mockEnv = {
	NEXT_PUBLIC_APP_URL: undefined as string | undefined,
};

const mockServerOnlyEnv = {
	WHATSAPP_BUSINESS_PHONE_ID: undefined as string | undefined,
	WHATSAPP_ACCESS_TOKEN: undefined as string | undefined,
	WHATSAPP_WEBHOOK_SECRET: undefined as string | undefined,
	WHATSAPP_APP_SECRET: undefined as string | undefined,
	WHATSAPP_VERIFY_TOKEN: undefined as string | undefined,
	WA_GRAPH_TOKEN: undefined as string | undefined,
	WA_CUSTOMER_NUMBER_ID: undefined as string | undefined,
	WA_CONTROL_NUMBER_ID: undefined as string | undefined,
	WA_APP_SECRET: undefined as string | undefined,
};

vi.mock("~/lib/env", () => ({
	env: mockEnv,
	serverOnlyEnv: mockServerOnlyEnv,
}));

// Dynamic import after mock is set up
const { deriveHealthFlags } = await import("../../src/server/api/routers/waAdmin");

describe("deriveHealthFlags", () => {
	beforeEach(() => {
		// Reset mock env before each test
		mockEnv.NEXT_PUBLIC_APP_URL = undefined;
		mockServerOnlyEnv.WHATSAPP_BUSINESS_PHONE_ID = undefined;
		mockServerOnlyEnv.WHATSAPP_ACCESS_TOKEN = undefined;
		mockServerOnlyEnv.WHATSAPP_WEBHOOK_SECRET = undefined;
		mockServerOnlyEnv.WHATSAPP_APP_SECRET = undefined;
		mockServerOnlyEnv.WHATSAPP_VERIFY_TOKEN = undefined;
		mockServerOnlyEnv.WA_GRAPH_TOKEN = undefined;
		mockServerOnlyEnv.WA_CUSTOMER_NUMBER_ID = undefined;
		mockServerOnlyEnv.WA_CONTROL_NUMBER_ID = undefined;
		mockServerOnlyEnv.WA_APP_SECRET = undefined;
	});

	it("returns all false when no env vars are set", () => {
		// Env vars are already undefined from beforeEach
		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false,
			webhookOk: false,
			secretOk: false,
			webhookUrl: undefined,
			verifyToken: undefined,
		});
	});

	it("returns partial true when some env vars are set", () => {
		mockServerOnlyEnv.WHATSAPP_VERIFY_TOKEN = "test_verify_token";
		mockServerOnlyEnv.WHATSAPP_APP_SECRET = "test_app_secret";
		// Keep phone ID and access token undefined

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false, // Missing business phone and token
			webhookOk: true, // secretOk is true
			secretOk: true, // Both secrets are present
			webhookUrl: undefined, // No base URL set
			verifyToken: "test_verify_token",
		});
	});

	it("returns all true when all required env vars are set", () => {
		mockEnv.NEXT_PUBLIC_APP_URL = "https://test.example.com";
		mockServerOnlyEnv.WA_GRAPH_TOKEN = "test_token";
		mockServerOnlyEnv.WA_CUSTOMER_NUMBER_ID = "test_customer_id";
		mockServerOnlyEnv.WA_CONTROL_NUMBER_ID = "test_control_id";
		mockServerOnlyEnv.WHATSAPP_VERIFY_TOKEN = "test_verify_token";
		mockServerOnlyEnv.WA_APP_SECRET = "test_app_secret";

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: true,
			webhookOk: true,
			secretOk: true,
			webhookUrl: "https://test.example.com/api/wa/customer",
			verifyToken: "test_verify_token",
		});
	});

	it("handles empty string env vars as missing", () => {
		mockServerOnlyEnv.WA_CUSTOMER_NUMBER_ID = "";
		mockServerOnlyEnv.WA_GRAPH_TOKEN = "test_token";
		mockServerOnlyEnv.WA_APP_SECRET = "";
		mockServerOnlyEnv.WHATSAPP_VERIFY_TOKEN = "test_verify_token";

		const result = deriveHealthFlags();

		expect(result).toEqual({
			envOk: false, // Empty phone ID is falsy
			webhookOk: false, // Empty app secret is falsy
			secretOk: false, // Empty app secret is falsy
			webhookUrl: undefined,
			verifyToken: "test_verify_token",
		});
	});
});