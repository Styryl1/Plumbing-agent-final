import { describe, it, beforeEach, expect, vi } from "vitest";
import { Temporal } from "temporal-polyfill";

// Use real environment for database integration testing
// The database helper needs actual credentials from .env.local

import { env } from "~/lib/env";
import { signBody } from "../helpers/crypto";
import { makePostRequest } from "../helpers/next";
import { ensureMappings, truncateWa, db } from "../helpers/db";
import { POST as CustomerPOST } from "~/app/api/wa/customer/route";
import { textMessagePayloads } from "../fixtures/whatsapp_payloads";

const ORG = process.env.TEST_ORG_ID!;
const PNID = process.env.WHATSAPP_BUSINESS_PHONE_ID!;

describe("WhatsApp Basic Integration", () => {
	beforeEach(async () => {
		await ensureMappings(ORG, PNID, process.env.WHATSAPP_CONTROL_PHONE_ID!);
		await truncateWa(ORG);
	});

	it("should process a simple text message webhook", async () => {
		const payload = textMessagePayloads.simple(PNID, "+31612345678");
		const raw = JSON.stringify(payload);
		const sig = signBody(env.WHATSAPP_APP_SECRET!, raw);
		const req = makePostRequest(raw, { "X-Hub-Signature-256": sig });
		
		const res = await CustomerPOST(req);
		expect(res.status).toBe(200);
		
		// Verify conversation was created
		const { data: conversations } = await db.from("wa_conversations")
			.select("*")
			.eq("org_id", ORG);
			
		expect(conversations?.length).toBeGreaterThan(0);
	});

	it("should handle emoji text messages", async () => {
		const payload = textMessagePayloads.withEmojis(PNID, "+31687654321");
		const raw = JSON.stringify(payload);
		const sig = signBody(env.WHATSAPP_APP_SECRET!, raw);
		const req = makePostRequest(raw, { "X-Hub-Signature-256": sig });
		
		const res = await CustomerPOST(req);
		expect(res.status).toBe(200);
		
		// Verify message content preserved emojis
		const { data: messages } = await db.from("wa_messages")
			.select("content")
			.eq("org_id", ORG);
			
		expect(messages?.[0]?.content).toContain("🚰");
		expect(messages?.[0]?.content).toContain("🔧");
	});

	it("should handle maximum length text messages", async () => {
		const payload = textMessagePayloads.maxLength(PNID, "+31611111111");
		const raw = JSON.stringify(payload);
		const sig = signBody(env.WHATSAPP_APP_SECRET!, raw);
		const req = makePostRequest(raw, { "X-Hub-Signature-256": sig });
		
		const res = await CustomerPOST(req);
		expect(res.status).toBe(200);
		
		// Verify long content is stored
		const { data: messages } = await db.from("wa_messages")
			.select("content")
			.eq("org_id", ORG);
			
		expect(messages?.[0]?.content?.length).toBeGreaterThan(1000);
	});
});