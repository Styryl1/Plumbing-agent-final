import { test } from "@playwright/test";

test.describe.skip("operator proposals", () => {
	test("apply button respects confidence gating", async ({ page }) => {
		await page.goto("/intake");
		// This stub documents the expected interaction. Real assertions require
		// seeded data and will be enabled when the operator console fixtures land.
	});
});
