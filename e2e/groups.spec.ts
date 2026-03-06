import { test, expect } from "./auth.setup";

test.describe("Groups Screen", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Groups tab
    await page.getByRole("tab", { name: "Groups" }).click();
  });

  test("shows groups header and tabs", async ({ page }) => {
    await expect(page.getByText("Active")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Archived")).toBeVisible();
  });

  test("shows New button", async ({ page }) => {
    await expect(page.getByText("New")).toBeVisible({ timeout: 10000 });
  });

  test("shows empty state or group list", async ({ page }) => {
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasGroups) {
      await expect(page.getByText("No groups yet")).toBeVisible();
    }
  });

  test("can switch to Archived tab", async ({ page }) => {
    await expect(page.getByText("Active")).toBeVisible({ timeout: 10000 });
    await page.getByText("Archived").click();

    await page.waitForTimeout(1000);
    const hasArchived = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasArchived) {
      await expect(page.getByText(/No archived groups/)).toBeVisible();
    }
  });

  test("New button navigates to create group", async ({ page }) => {
    await expect(page.getByText("New")).toBeVisible({ timeout: 10000 });
    await page.getByText("New").click();

    // Should navigate to create group screen — look for the "Create Group" button
    await expect(page.getByText("Create Group", { exact: true })).toBeVisible({
      timeout: 5000,
    });
  });
});
