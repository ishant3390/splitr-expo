import { test, expect } from "./auth.setup";

test.describe("Home Screen", () => {
  test("shows app header with wordmark logo", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Splitr" })).toBeVisible({ timeout: 10000 });
  });

  test("shows balance card", async ({ page }) => {
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You are owed")).toBeVisible();
    await expect(page.getByText("You owe")).toBeVisible();
  });

  test("shows balance card elements", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Splitr" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Net Balance")).toBeVisible();
    await expect(page.getByText("You are owed")).toBeVisible();
    await expect(page.getByText("You owe")).toBeVisible();
  });

  test("shows category filter bar", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Splitr" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("All")).toBeVisible();
  });

  test("shows Recent Activity section", async ({ page }) => {
    await expect(page.getByRole("img", { name: "Splitr" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });
});
