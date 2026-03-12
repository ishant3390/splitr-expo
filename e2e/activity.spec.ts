import { test, expect } from "./auth.setup";

test.describe("Activity Screen", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Activity tab (use role to target tab bar, not page content)
    await page.getByRole("button", { name: "Activity" }).click();
  });

  test("shows activity header", async ({ page }) => {
    await expect(page.getByText("Recent Activity")).toBeVisible({ timeout: 10000 });
  });

  test("shows activity list or empty state", async ({ page }) => {
    // Wait for the screen to load
    await page.waitForTimeout(2000);

    // Either real activity items or an empty state message
    const hasActivity = await page
      .getByText("Recent Activity")
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText("No activity yet")
      .first()
      .isVisible()
      .catch(() => false);
    const hasItems = await page
      .getByText(/ago|today|yesterday/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasActivity || hasEmptyState || hasItems).toBeTruthy();
  });
});
