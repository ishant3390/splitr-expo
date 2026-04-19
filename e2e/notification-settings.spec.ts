import { test, expect } from "./auth.setup";

test.describe("Notification Settings Screen (web)", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText("Profile").click();
    await expect(page.getByText("Profile").first()).toBeVisible({ timeout: 10000 });
    await page.getByText("Notifications").first().click();
    await expect(page.getByText("Notification Settings")).toBeVisible({ timeout: 10000 });
  });

  test("renders all core sections", async ({ page }) => {
    await expect(page.getByText("Notification Settings")).toBeVisible();
    await expect(page.getByText("Your privacy matters")).toBeVisible();
    await expect(page.getByText("Push Notifications").first()).toBeVisible();
    await expect(page.getByText("NOTIFICATION DETAIL")).toBeVisible();
    await expect(page.getByText("NOTIFICATION CATEGORIES")).toBeVisible();
    await expect(page.getByText("EMAIL DIGEST")).toBeVisible();
  });

  test("renders all four category rows", async ({ page }) => {
    await expect(page.getByText("Expenses").first()).toBeVisible();
    await expect(page.getByText("Settlements").first()).toBeVisible();
    await expect(page.getByText("Groups").first()).toBeVisible();
    await expect(page.getByText("Reminders").first()).toBeVisible();
  });

  test("renders detail level options", async ({ page }) => {
    await expect(page.getByText("Privacy mode (recommended)")).toBeVisible();
    await expect(page.getByText("Detailed")).toBeVisible();
  });

  test("renders all digest frequency options", async ({ page }) => {
    await expect(page.getByText("Weekly").first()).toBeVisible();
    await expect(page.getByText("Daily").first()).toBeVisible();
    await expect(page.getByText("Off").first()).toBeVisible();
  });

  test("back button navigates away from settings", async ({ page }) => {
    // The back button is the first pressable in the header (ArrowLeft)
    // On web, click it and verify we leave the screen
    const backButton = page.locator('[role="button"]').first();
    await backButton.click();
    // We should no longer be on the notification settings screen
    await expect(page.getByText("Notification Settings")).not.toBeVisible({ timeout: 5000 });
  });
});
