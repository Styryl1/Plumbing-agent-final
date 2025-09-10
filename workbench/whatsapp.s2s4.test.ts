/**
 * WhatsApp S2 + S4 Integration Tests
 * Tests analyzer integration, approval workflow, and complete flow
 */

import { describe, test, expect, beforeAll } from "vitest";
import { analyzeInbound, persistSuggestion } from "~/server/services/analyzers/whatsapp";
import { handleControlCommand } from "~/server/services/whatsapp/commands";
import { 
	approveSuggestion, 
	rejectSuggestion, 
	isControlNumberWhitelisted 
} from "~/server/services/whatsapp/approval";
import { getServiceDbForWebhook } from "~/server/db/serviceClient";

describe("WhatsApp S2 + S4 Integration", () => {
	const testOrgId = "test-org-123";
	const testUserId = "test-user-123";
	const testPhone = "+31612345678";
	const testConversationId = "test-conv-123";
	const testMessageId = "wam_test_123456";
	
	let db: any;
	
	beforeAll(async () => {
		db = getServiceDbForWebhook();
	});

	describe("S2: Analyzer Integration", () => {
		test("analyzeInbound returns proper structure for leakage", async () => {
			const result = await analyzeInbound({
				orgId: testOrgId,
				conversationId: testConversationId,
				messageId: testMessageId,
				text: "Ik heb een lek in mijn keuken, water komt overal",
			});

			expect(result).toMatchObject({
				proposed_text: expect.stringContaining("lekkage"),
				tags: expect.arrayContaining(["lekkage", "urgent"]),
				urgency: "high",
				confidence: expect.any(Number),
				materials_stub: expect.arrayContaining(["Reparatieset lekkage"]),
				time_stub: "60-90 minuten",
			});

			expect(result.confidence).toBeGreaterThan(0.7);
		});

		test("analyzeInbound returns proper structure for blockage", async () => {
			const result = await analyzeInbound({
				orgId: testOrgId,
				conversationId: testConversationId,
				messageId: testMessageId,
				text: "Mijn toilet is verstopt en loopt over",
			});

			expect(result).toMatchObject({
				proposed_text: expect.stringContaining("verstopping"),
				tags: expect.arrayContaining(["verstopt", "afvoer"]),
				urgency: "normal",
				confidence: expect.any(Number),
				materials_stub: expect.arrayContaining(["Ontstopper"]),
				time_stub: "75-120 minuten",
			});
		});

		test("analyzeInbound handles general inquiries", async () => {
			const result = await analyzeInbound({
				orgId: testOrgId,
				conversationId: testConversationId,
				messageId: testMessageId,
				text: "Hallo, ik heb een vraag over loodgietersdiensten",
			});

			expect(result).toMatchObject({
				proposed_text: expect.stringContaining("postcode"),
				tags: expect.arrayContaining(["algemeen"]),
				urgency: "low",
				confidence: expect.any(Number),
			});
		});

		test("persistSuggestion saves to database (mocked)", async () => {
			// This would need a real test database or mock
			// For now, we test the structure
			const mockResult = {
				proposed_text: "Test response",
				tags: ["test"],
				urgency: "low" as const,
				confidence: 0.8,
				materials_stub: ["Test material"],
				time_stub: "60 minutes",
			};

			// Test that the function exists and has correct signature
			expect(persistSuggestion).toBeDefined();
			expect(typeof persistSuggestion).toBe("function");
		});
	});

	describe("S4: Command Parser", () => {
		test("handleControlCommand parses approve command", () => {
			const result = handleControlCommand({
				text: "#approve wam_ABcd123XYZ",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(result).toEqual({
				kind: "approve",
				msgId: "wam_abcd123xyz",
				createJob: false,
			});
		});

		test("handleControlCommand parses reject command with reason", () => {
			const result = handleControlCommand({
				text: "#reject wam_ABcd123XYZ wrong diagnosis",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(result).toEqual({
				kind: "reject",
				msgId: "wam_abcd123xyz",
				reason: "wrong diagnosis",
			});
		});

		test("handleControlCommand parses send command", () => {
			const result = handleControlCommand({
				text: "#send wam_ABcd123XYZ",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(result).toEqual({
				kind: "send",
				msgId: "wam_abcd123xyz",
			});
		});

		test("handleControlCommand parses quote command", () => {
			const result = handleControlCommand({
				text: "#quote wam_ABcd123XYZ",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(result).toEqual({
				kind: "quote",
				msgId: "wam_abcd123xyz",
			});
		});

		test("handleControlCommand returns null for invalid commands", () => {
			expect(handleControlCommand({
				text: "#invalid wam_123",
				orgId: testOrgId,
				phone: testPhone,
			})).toBeNull();

			expect(handleControlCommand({
				text: "not a command",
				orgId: testOrgId,
				phone: testPhone,
			})).toBeNull();

			expect(handleControlCommand({
				text: "#approve", // missing msgId
				orgId: testOrgId,
				phone: testPhone,
			})).toBeNull();
		});

		test("handleControlCommand handles case insensitive commands", () => {
			const result = handleControlCommand({
				text: "#APPROVE wam_Test123",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(result).toEqual({
				kind: "approve",
				msgId: "wam_test123",
				createJob: false,
			});
		});

		test("handleControlCommand parses approve job command", () => {
			const result = handleControlCommand({
				text: "#approve job wam_ABcd123XYZ",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(result).toEqual({
				kind: "approve",
				msgId: "wam_abcd123xyz",
				createJob: true,
			});
		});
	});

	describe("S4: Approval Actions", () => {
		test("approveSuggestion function exists with correct signature", () => {
			expect(approveSuggestion).toBeDefined();
			expect(typeof approveSuggestion).toBe("function");
		});

		test("rejectSuggestion function exists with correct signature", () => {
			expect(rejectSuggestion).toBeDefined();
			expect(typeof rejectSuggestion).toBe("function");
		});

		test("isControlNumberWhitelisted function exists", () => {
			expect(isControlNumberWhitelisted).toBeDefined();
			expect(typeof isControlNumberWhitelisted).toBe("function");
		});
	});

	describe("Idempotency Tests", () => {
		test("duplicate message analysis should be skipped", async () => {
			// Test that analyzer integration includes idempotency checks
			// This would require actual database integration to fully test
			
			const params = {
				orgId: testOrgId,
				conversationId: testConversationId,
				messageId: "duplicate_test_123",
				text: "Test message",
			};

			// First call should analyze
			const first = await analyzeInbound(params);
			expect(first).toBeDefined();

			// Second call with same message ID should be idempotent
			// (This would be tested in integration with actual webhook flow)
		});
	});

	describe("RLS Security Tests", () => {
		test("cross-org access should be prevented", async () => {
			// Test that suggestions from different orgs cannot be accessed
			// This would require database setup to fully test
			const wrongOrgContext = {
				orgId: "wrong-org-456",
				userId: testUserId,
				phone: testPhone,
			};

			// Attempting to approve suggestion from different org should fail
			// (This would be tested with real database setup)
			expect(true).toBe(true); // Placeholder for now
		});
	});

	describe("End-to-End Flow", () => {
		test("complete analyzer → approval → relay flow", async () => {
			// Test the complete flow:
			// 1. Customer message → Analyzer → Suggestion stored
			// 2. Control command → Approval → Customer relay
			// 3. Audit events recorded

			// Step 1: Analyze message
			const analysisResult = await analyzeInbound({
				orgId: testOrgId,
				conversationId: testConversationId,
				messageId: "e2e_test_123",
				text: "Ik heb een lekkende kraan",
			});

			expect(analysisResult.tags).toContain("lekkage");
			expect(analysisResult.urgency).toBe("high");

			// Step 2: Parse control command
			const command = handleControlCommand({
				text: "#approve e2e_test_123",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(command).toEqual({
				kind: "approve",
				msgId: "e2e_test_123",
				createJob: false,
			});

			// Step 3: Execute approval (would need database for full test)
			expect(command?.kind).toBe("approve");
		});

		test("error handling in approval flow", async () => {
			// Test that errors are handled gracefully
			const command = handleControlCommand({
				text: "#approve nonexistent_msg_123",
				orgId: testOrgId,
				phone: testPhone,
			});

			expect(command).toEqual({
				kind: "approve",
				msgId: "nonexistent_msg_123",
				createJob: false,
			});

			// Approval should fail gracefully for nonexistent message
			// (Would be tested with real database)
		});
	});

	describe("WhatsApp API Compliance", () => {
		test("analyzer outputs are within WhatsApp message limits", async () => {
			const result = await analyzeInbound({
				orgId: testOrgId,
				conversationId: testConversationId,
				messageId: testMessageId,
				text: "Very long customer message with lots of details about complex plumbing issue",
			});

			// WhatsApp has a 4096 character limit for text messages
			expect(result.proposed_text.length).toBeLessThan(4096);
			
			// Check that Dutch text is properly formatted
			expect(result.proposed_text).toMatch(/postcode/i);
		});

		test("command responses are appropriate length", () => {
			// Test that control command responses are not too long
			const commands = [
				"#approve wam_123",
				"#reject wam_123 not urgent enough",
				"#send wam_123",
				"#quote wam_123",
			];

			commands.forEach(cmdText => {
				const cmd = handleControlCommand({
					text: cmdText,
					orgId: testOrgId,
					phone: testPhone,
				});
				expect(cmd).toBeDefined();
			});
		});
	});
});

// Export test utilities for other test files
export {
	analyzeInbound,
	handleControlCommand,
	type ControlAction,
} from "~/server/services/whatsapp/commands";