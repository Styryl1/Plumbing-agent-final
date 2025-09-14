import { test, expect } from "@playwright/test";

test("health endpoint", async ({ request }) => {
	const res = await request.get("/api/health");
	expect(res.status()).toBe(200);

	const body = await res.json();
	expect(body.status).toBe("ok");
	expect(body.database).toBe("reachable");
});

test.describe("launch demos", () => {
	test("EN demo loads and has lang=en", async ({ page }) => {
		await page.goto("/en/launch/demo");
		await expect(page).toHaveURL(/\/en\/launch\/demo/);
		await expect(page.locator("html")).toHaveAttribute("lang", "en");

		// Check for key demo elements
		await expect(page.getByText("Product Demo")).toBeVisible();
	});

	test("NL demo loads and has lang=nl", async ({ page }) => {
		await page.goto("/nl/launch/demo");
		await expect(page).toHaveURL(/\/nl\/launch\/demo/);
		await expect(page.locator("html")).toHaveAttribute("lang", "nl");

		// Check for key demo elements (Dutch)
		await expect(page.getByText("Productdemo")).toBeVisible();
	});
});

test.describe("public pages", () => {
	test("homepage loads", async ({ page }) => {
		await page.goto("/");
		// Should redirect to a locale-specific page
		await expect(page).toHaveURL(/\/(en|nl)/);
	});

	test("EN launch page loads", async ({ page }) => {
		await page.goto("/en/launch");
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
	});

	test("NL launch page loads", async ({ page }) => {
		await page.goto("/nl/launch");
		await expect(page.locator("html")).toHaveAttribute("lang", "nl");
	});
});