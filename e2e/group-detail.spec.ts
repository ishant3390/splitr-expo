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
      await expect(page.getByText("Settle Up", { exact: true })).toBeVisible({ timeout: 5000 });
    }
  });

  test("group detail shows activity section", async ({ page }) => {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasGroups) {
      await page.getByText("members").first().click();
      await expect(page.getByText(/^ACTIVITY/).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("group detail shows add member button", async ({ page }) => {
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

      // "Add" button in the MEMBERS section header
      await expect(page.getByText("Add", { exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("shows Simplify debts toggle on group detail", async ({ page }) => {
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

      await expect(page.getByText("Simplify debts")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Reduces the number of transactions needed to settle up")).toBeVisible();
    }
  });
});
