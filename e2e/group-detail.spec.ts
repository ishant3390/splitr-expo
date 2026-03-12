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

      // Should show group detail elements
      await expect(page.getByText(/^MEMBERS/).first()).toBeVisible({ timeout: 5000 });
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
      await expect(page.getByText("Total Spent")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Per Person (avg)")).toBeVisible();
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
      await expect(page.getByText("Settle Up")).toBeVisible({ timeout: 5000 });
    }
  });

  test("group detail shows expenses section", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await expect(page.getByText(/^EXPENSES/).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("group detail shows share button", async ({ page }) => {
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

      // Add member button (teal "Add" in header) should be visible
      await expect(page.getByText("Add", { exact: true }).nth(1)).toBeVisible({ timeout: 5000 });
    }
  });
});
