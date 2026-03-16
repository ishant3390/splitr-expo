import { test, expect } from "./auth.setup";

test.describe("Group Detail Screen", () => {
  test("can open a group from groups list", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();

      // Should show group detail elements — hero balance card + total spent
      await expect(page.getByText("Your Balance")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Total Spent")).toBeVisible();
    }
  });

  test("group detail shows summary card", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await expect(page.getByText("Your Balance")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Total Spent")).toBeVisible();
    }
  });

  test("group detail shows settle up button", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await expect(page.getByText("Settle Up", { exact: true })).toBeVisible({ timeout: 5000 });
    }
  });

  test("group detail shows expenses or activity section", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await page.waitForTimeout(2000);

      // New layout has "RECENT EXPENSES" and/or "RECENT ACTIVITY" sections, or empty state
      const hasExpenses = await page.getByText("RECENT EXPENSES", { exact: true }).isVisible().catch(() => false);
      const hasActivity = await page.getByText("RECENT ACTIVITY", { exact: true }).isVisible().catch(() => false);
      const hasEmpty = await page.getByText("No activity yet").isVisible().catch(() => false);
      const hasEmptyArchived = await page.getByText("No activity").first().isVisible().catch(() => false);

      expect(hasExpenses || hasActivity || hasEmpty || hasEmptyArchived).toBeTruthy();
    }
  });

  test("group detail has settings gear icon", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await page.waitForTimeout(1000);

      // Settings gear icon navigates to group-settings (members, preferences, etc.)
      await expect(page.locator("[aria-label='Group settings']")).toBeVisible({ timeout: 5000 });
    }
  });

  test("group detail settings page has Simplify debts toggle", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await page.waitForTimeout(1000);

      // Navigate to group settings via gear icon
      await page.locator("[aria-label='Group settings']").click();
      await page.waitForTimeout(2000);

      await expect(page.getByText("Simplify debts")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Reduces the number of transactions needed to settle up")).toBeVisible();
    }
  });
});
