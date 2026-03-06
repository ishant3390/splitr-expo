import { test, expect } from "./auth.setup";

test.describe("Edit Profile Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Profile tab, then to Edit Profile
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.getByText("Edit Profile").first()).toBeVisible({
      timeout: 10000,
    });
    await page.getByText("Edit Profile").first().click();

    // Wait for edit profile screen to load
    await expect(page.getByText("Name")).toBeVisible({ timeout: 5000 });
  });

  test("shows name field", async ({ page }) => {
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
  });

  test("shows email field (read-only)", async ({ page }) => {
    await expect(page.getByText("Email", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Email is managed by your auth provider")
    ).toBeVisible();
  });

  test("shows phone field", async ({ page }) => {
    await expect(page.getByText("Phone")).toBeVisible();
    await expect(page.getByPlaceholder("+1 234 567 8900")).toBeVisible();
  });

  test("shows default currency selector", async ({ page }) => {
    await expect(page.getByText("Default Currency")).toBeVisible();
    // Currency buttons may have duplicates (display + selector) — use last()
    await expect(page.getByText("USD").last()).toBeVisible();
    await expect(page.getByText("EUR").last()).toBeVisible();
    await expect(page.getByText("INR").last()).toBeVisible();
  });

  test("shows save button", async ({ page }) => {
    await expect(page.getByText("Save Changes")).toBeVisible();
  });
});
