import { describe, it, expect, beforeEach } from "vitest";
import { isControlNumberWhitelisted } from "~/server/services/whatsapp/approval";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";

// Mock database helper for testing
const mockDb = () => {
	const data: Array<{ org_id: string; phone_number_id: string; label: string }> = [
		{ org_id: "org-a", phone_number_id: "123", label: "control" },
		{ org_id: "org-a", phone_number_id: "999", label: "customer" }, // not control
		{ org_id: "org-b", phone_number_id: "123", label: "control" }, // different org
	];

	return {
		from: (table: string) => ({
			select: () => ({
				eq: function (column: string, value: string) {
					// Chain the conditions
					const conditions: Record<string, string> = { [column]: value };
					return {
						eq: function (column2: string, value2: string) {
							conditions[column2] = value2;
							return {
								eq: function (column3: string, value3: string) {
									conditions[column3] = value3;
									return {
										maybeSingle: async () => {
											// Find matching row based on all conditions
											const match = data.find(row => 
												(!conditions.org_id || row.org_id === conditions.org_id) &&
												(!conditions.phone_number_id || row.phone_number_id === conditions.phone_number_id) &&
												(!conditions.label || row.label === conditions.label)
											);
											return { data: match ?? null };
										}
									};
								}
							};
						}
					};
				}
			})
		})
	} as unknown as ReturnType<typeof createClient<Database>>;
};

describe("WA control whitelist", () => {
	it("requires exact (org_id, phone_number_id, label='control') match", async () => {
		const db = mockDb();

		// Valid control number for org-a
		expect(await isControlNumberWhitelisted(db, "org-a", "123")).toBe(true);
		
		// Customer number, not control
		expect(await isControlNumberWhitelisted(db, "org-a", "999")).toBe(false);
		
		// Control number but different org
		expect(await isControlNumberWhitelisted(db, "org-b", "123")).toBe(true);
		
		// Non-existent number
		expect(await isControlNumberWhitelisted(db, "org-a", "nope")).toBe(false);
		
		// Wrong org
		expect(await isControlNumberWhitelisted(db, "org-c", "123")).toBe(false);
	});

	it("handles null results correctly", async () => {
		const db = mockDb();
		
		// Should return false for non-existent combinations
		expect(await isControlNumberWhitelisted(db, "non-existent-org", "non-existent-phone")).toBe(false);
	});

	it("validates strict boolean return", async () => {
		const db = mockDb();
		
		// Should always return exactly true or false, never undefined/null
		const result1 = await isControlNumberWhitelisted(db, "org-a", "123");
		const result2 = await isControlNumberWhitelisted(db, "org-a", "999");
		
		expect(result1).toBe(true);
		expect(result2).toBe(false);
		expect(typeof result1).toBe("boolean");
		expect(typeof result2).toBe("boolean");
	});
});