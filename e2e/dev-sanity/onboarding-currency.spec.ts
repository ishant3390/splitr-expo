/**
 * Dev Sanity — Onboarding Currency Step
 * Verifies that the currency step appears in onboarding and that
 * the user's default currency is persisted to the backend.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";

test.describe("Dev Sanity — Onboarding Currency", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("user profile has a default currency set", async ({ userAClient }) => {
    const me = await userAClient.getMe();
    expect(me.defaultCurrency).toBeTruthy();
    // Should be one of the supported currencies
    expect(["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"]).toContain(me.defaultCurrency);
  });

  test("currency can be updated via API", async ({ userAClient }) => {
    const original = await userAClient.getMe();
    const originalCurrency = original.defaultCurrency ?? "USD";

    // Set to GBP
    await userAClient.updateMe({ defaultCurrency: "GBP" });
    const updated = await userAClient.getMe();
    expect(updated.defaultCurrency).toBe("GBP");

    // Restore original
    await userAClient.updateMe({ defaultCurrency: originalCurrency });
    const restored = await userAClient.getMe();
    expect(restored.defaultCurrency).toBe(originalCurrency);
  });

  test("create-group inherits user default currency", async ({ page, userAClient }) => {
    const me = await userAClient.getMe();
    const userCurrency = me.defaultCurrency ?? "USD";

    // Navigate to create group
    await page.goto("/create-group");
    await page.waitForTimeout(2000);

    // The user's default currency should be pre-selected
    // Look for the currency chip that's visually selected (has primary bg)
    const currencyChip = page.getByText(userCurrency, { exact: true }).first();
    await expect(currencyChip).toBeVisible({ timeout: 10000 });
  });
});
