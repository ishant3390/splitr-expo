import { test, expect } from "./auth.setup";

test.describe("Activity Screen", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Activity tab (use role to target tab bar, not page content)
    await page.getByRole("tab", { name: "Activity" }).click();
  });

  test("shows activity header", async ({ page }) => {
    await expect(page.getByText("Recent Activity")).toBeVisible({ timeout: 10000 });
  });

  test("shows activity list or empty state", async ({ page }) => {
    // Wait for the screen to load
    await page.waitForTimeout(2000);

    const hasActivity = await page
      .locator("[data-testid='activity-item']")
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasActivity) {
      // May show empty state or recent activity section
      await expect(
        page.getByText("No activity yet").first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
