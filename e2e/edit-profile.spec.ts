import { test, expect } from "./auth.setup";

test.describe("Edit Profile Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Profile tab, then to Edit Profile
    await page.getByRole("button", { name: "Profile" }).click();
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

  test("shows avatar with Add Photo or Change Photo", async ({ page }) => {
    const hasChangePhoto = await page.getByText("Change Photo").isVisible().catch(() => false);
    const hasAddPhoto = await page.getByText("Add Photo").isVisible().catch(() => false);
    expect(hasChangePhoto || hasAddPhoto).toBe(true);
  });

  test("avatar area has accessible button role", async ({ page }) => {
    const avatarButton = page.getByRole("button", { name: /profile photo/i });
    await expect(avatarButton).toBeVisible({ timeout: 5000 });
  });

  test("validates empty name on save", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Your name");
    const originalValue = await nameInput.inputValue();
    await nameInput.clear();
    await page.getByText("Save Changes").click();
    await expect(page.getByText("Name cannot be empty")).toBeVisible({ timeout: 5000 });
    // Restore
    await nameInput.fill(originalValue);
  });

  test("name field is editable", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Your name");
    const originalValue = await nameInput.inputValue();
    await nameInput.clear();
    await nameInput.fill("E2E Temp Name");
    await expect(nameInput).toHaveValue("E2E Temp Name");
    // Restore without saving
    await nameInput.clear();
    await nameInput.fill(originalValue);
  });
});

test.describe("Receipt Scanner Screen", () => {
  test("renders capture screen with gallery option", async ({ page }) => {
    await page.goto("/receipt-scanner");
    await page.waitForTimeout(2000);
    await expect(page.getByText("Scan Receipt")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Scan a Receipt")).toBeVisible();
    await expect(page.getByText("Choose from Gallery")).toBeVisible();
  });
});

test.describe("Add Expense Screen — Receipt Attachment", () => {
  test("shows receipt gallery button for attachment", async ({ page }) => {
    await page.goto("/add");
    await page.waitForTimeout(2000);
    const galleryBtn = page.getByText("Gallery", { exact: true });
    await expect(galleryBtn).toBeVisible({ timeout: 5000 });
  });
});
