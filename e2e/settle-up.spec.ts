import { test, expect } from "./auth.setup";

test.describe("Settle Up Flow", () => {
  test("can navigate to settle up from group detail", async ({ page }) => {
    // First go to Groups and open a group (if any exist)
    await page.getByRole("tab", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    // Check if there are any groups
    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      // Click the first group
      await page.getByText("members").first().click();
      await page.waitForTimeout(1000);

      // Look for Settle Up button
      await expect(page.getByText("Settle Up")).toBeVisible({ timeout: 5000 });
      await page.getByText("Settle Up").click();

      // Should see the settle up screen
      await expect(page.getByText("Settle Up")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Suggested")).toBeVisible();
      await expect(page.getByText("History")).toBeVisible();
    }
  });

  test("settle up screen shows tabs", async ({ page }) => {
    await page.getByRole("tab", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await page.waitForTimeout(1000);
      await page.getByText("Settle Up").click();

      // Verify both tabs
      await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("History")).toBeVisible();

      // Check for either suggestions or "All settled up!" state
      const hasSuggestions = await page
        .getByText("Record")
        .first()
        .isVisible()
        .catch(() => false);
      if (!hasSuggestions) {
        await expect(page.getByText("All settled up!")).toBeVisible();
      }
    }
  });

  test("can switch to History tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await page.waitForTimeout(1000);
      await page.getByText("Settle Up").click();
      await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });

      // Switch to History
      await page.getByText("History").click();

      // Should show history or empty state
      const hasHistory = await page
        .getByText("paid")
        .first()
        .isVisible()
        .catch(() => false);
      if (!hasHistory) {
        await expect(page.getByText("No settlements yet")).toBeVisible();
      }
    }
  });
});
