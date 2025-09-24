import { expect, test } from "@playwright/test";

const locales = ["en", "nl"] as const;

for (const locale of locales) {
	test.describe(`${locale.toUpperCase()} launch page`, () => {
		test(`renders navigation and hero CTA`, async ({ page }) => {
			await page.goto(`/${locale}/launch`);
			await expect(page.locator("header")).toBeVisible();
			const primaryCta = page.getByRole("link", { name: /whatsapp/i });
			await expect(primaryCta).toHaveAttribute("href", /wa\.me/);
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		});

		test(`hero lead form accepts contact details`, async ({ page }) => {
			await page.goto(`/${locale}/launch`);
			const emailInput = page.getByPlaceholder(/email/i);
			await expect(emailInput).toBeVisible();
			await emailInput.fill("crew@plumbingagent.test");
			const phoneInput = page.getByPlaceholder(/mobiel|mobile/i);
			await phoneInput.fill("0612345678");
			await page.getByRole("button", { name: /checklist|request/i }).click();
			await expect(page.locator("text=/onboarding/i")).toBeVisible();
		});

		test(`feature grid contains four cards`, async ({ page }) => {
			await page.goto(`/${locale}/launch#features`);
			await expect(page.locator('[data-testid="feature-card"]')).toHaveCount(4);
		});

		test(`workflow shows four steps`, async ({ page }) => {
			await page.goto(`/${locale}/launch#workflow`);
			await expect(page.locator("section#workflow li")).toHaveCount(4);
		});

		test(`FAQ accordion expands answers`, async ({ page }) => {
			await page.goto(`/${locale}/launch#faq`);
			const firstQuestion = page.locator("section#faq button").first();
			await firstQuestion.click();
			await expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
		});
	});
}
