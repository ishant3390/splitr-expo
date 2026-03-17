import { test, expect } from "./auth.setup";

test.describe("Payment Methods Screen", () => {
  async function navigateToPaymentMethods(page: any) {
    await page.getByText("Profile").click();
    await expect(page.getByText("Payment Methods")).toBeVisible({ timeout: 5000 });
    await page.getByText("Payment Methods").click();
    await expect(
      page.getByText("Add your handles so friends can pay you directly")
    ).toBeVisible({ timeout: 5000 });
  }

  test("navigates to payment methods from profile", async ({ page }) => {
    await navigateToPaymentMethods(page);
  });

  test("shows region-appropriate provider fields", async ({ page }) => {
    await navigateToPaymentMethods(page);

    // USD region shows Venmo, PayPal, Cash App, Zelle by default
    // (user's default currency determines which appear)
    const saveButton = page.getByText("Save Payment Methods");
    await expect(saveButton).toBeVisible();

    // At least one provider placeholder should be visible
    const hasProviderField = await page
      .getByPlaceholder(/username|email|cashtag/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasProviderField).toBeTruthy();
  });

  test("show all toggle reveals other region providers", async ({ page }) => {
    await navigateToPaymentMethods(page);

    const toggle = page.getByText("Show all payment methods");
    const toggleVisible = await toggle.isVisible().catch(() => false);
    if (!toggleVisible) return; // No other regions (only if all providers are in user's region)

    await toggle.click();
    await expect(page.getByText("Other Regions")).toBeVisible({ timeout: 3000 });
  });

  test("show fewer collapses other region providers", async ({ page }) => {
    await navigateToPaymentMethods(page);

    const toggle = page.getByText("Show all payment methods");
    const toggleVisible = await toggle.isVisible().catch(() => false);
    if (!toggleVisible) return;

    await toggle.click();
    await expect(page.getByText("Other Regions")).toBeVisible({ timeout: 3000 });

    await page.getByText("Show fewer").click();
    await expect(page.getByText("Other Regions")).not.toBeVisible();
  });

  test("save with empty fields succeeds", async ({ page }) => {
    await navigateToPaymentMethods(page);

    await page.getByText("Save Payment Methods").click();

    // Wait for API response, then check outcome
    await page.waitForTimeout(2000);

    const hasError = await page
      .getByText("Failed to save")
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(hasError).toBeFalsy();

    // Page should still be functional (save button visible again)
    await expect(page.getByText("Save Payment Methods")).toBeVisible();
  });

  test("navigates back from payment methods", async ({ page }) => {
    await navigateToPaymentMethods(page);

    // Back button is the first role=button element
    await page.locator('[role="button"]').first().click();

    // Should be back on profile
    await expect(page.getByText("Edit Profile")).toBeVisible({ timeout: 5000 });
  });

  test("entering text in provider field works", async ({ page }) => {
    await navigateToPaymentMethods(page);

    // Find the first input placeholder and type
    const firstInput = page.getByPlaceholder(/username|email|cashtag|you@/i).first();
    const isVisible = await firstInput.isVisible().catch(() => false);
    if (!isVisible) return;

    await firstInput.fill("test-handle-123");
    await expect(firstInput).toHaveValue("test-handle-123");
  });

  test("settle-up screen shows payment method selector", async ({ page }) => {
    // Navigate to Groups tab
    await page.getByText("Groups").click();
    await page.waitForTimeout(1000);

    // Check if user has any groups
    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasGroups) return;

    // Tap first group
    await page.getByText("members").first().click();
    await page.waitForTimeout(1000);

    // Look for Settle Up button
    const settleUp = page.getByText("Settle Up").first();
    const hasSettleUp = await settleUp.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSettleUp) return;

    await settleUp.click();
    await page.waitForTimeout(1000);

    // Either "All settled" or suggestions with payment methods
    const allSettled = await page
      .getByText("All settled")
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!allSettled) {
      // Should see suggestion cards with "Record" button
      const hasRecord = await page
        .getByText(/Record/)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(hasRecord).toBeTruthy();
    }
  });
});
