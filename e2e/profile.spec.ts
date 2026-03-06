import { test, expect } from "./auth.setup";

test.describe("Profile Screen", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Profile tab
    await page.getByText("Profile").click();
    await expect(page.getByText("Profile").first()).toBeVisible({ timeout: 10000 });
  });

  test("shows profile header", async ({ page }) => {
    await expect(page.getByText("Profile").first()).toBeVisible();
  });

  test("shows user info sections", async ({ page }) => {
    await expect(page.getByText("Currency")).toBeVisible();
    await expect(page.getByText("Member since")).toBeVisible();
  });

  test("shows settings menu items", async ({ page }) => {
    await expect(page.getByText("Edit Profile")).toBeVisible();
    await expect(page.getByText("Notifications")).toBeVisible();
    await expect(page.getByText("Dark Mode")).toBeVisible();
    await expect(page.getByText("Sign Out")).toBeVisible();
  });
});
