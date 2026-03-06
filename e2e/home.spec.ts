import { test, expect } from "./auth.setup";

test.describe("Home Screen", () => {
  test("shows app header and welcome message", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Welcome/)).toBeVisible();
  });

  test("shows balance card", async ({ page }) => {
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You are owed")).toBeVisible();
    await expect(page.getByText("You owe")).toBeVisible();
  });

  test("shows quick action buttons", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Scan")).toBeVisible();
    await expect(page.getByText("Chat")).toBeVisible();
  });

  test("shows category filter bar", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("All")).toBeVisible();
  });

  test("shows Recent Activity section", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });
});
