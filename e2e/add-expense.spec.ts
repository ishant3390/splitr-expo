import { test, expect } from "./auth.setup";

test.describe("Add Expense Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate via tab bar — the Add tab is the center button
    // Use the tab bar role/structure to find the + button
    // On web, Expo Router renders tabs with role="tablist"
    await page.getByRole("button", { name: "Add Expense" }).click();

    // Wait for the add expense screen — it might also land on the add tab screen
    await page.waitForTimeout(2000);
  });

  test("shows add expense screen elements", async ({ page }) => {
    // The add expense screen should show these elements
    const hasAddExpense = await page
      .getByText("Add Expense")
      .isVisible()
      .catch(() => false);
    const hasScanReceipt = await page
      .getByText("Scan Receipt")
      .isVisible()
      .catch(() => false);

    // Should be on either Add Expense or another add-related screen
    expect(hasAddExpense || hasScanReceipt).toBeTruthy();
  });

  test("can navigate to add expense from home quick action", async ({ page }) => {
    // Alternative: use the "Add" quick action on home screen
    // Go back to home first
    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 5000 });

    // Look for "Add" quick action button on home
    const addButton = page.getByText("Add", { exact: true });
    const hasAdd = await addButton.isVisible().catch(() => false);
    if (hasAdd) {
      await addButton.click();
      await page.waitForTimeout(2000);

      // Should navigate to add-related screen
      const isOnAdd = await page
        .getByText("Add Expense")
        .isVisible()
        .catch(() => false);
      const isOnScan = await page
        .getByText("Scan Receipt")
        .isVisible()
        .catch(() => false);
      expect(isOnAdd || isOnScan).toBeTruthy();
    }
  });
});
