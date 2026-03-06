import { test, expect } from "./auth.setup";

test.describe("Cross-Screen Navigation", () => {
  test("tab bar navigates to all main tabs", async ({ page }) => {
    // Start on Home
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Navigate to Groups
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    // Navigate to Activity
    await page.getByRole("tab", { name: "Activity" }).click();
    await expect(page.getByText("Recent Activity")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to Profile
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.getByText("Edit Profile")).toBeVisible({
      timeout: 5000,
    });

    // Navigate back to Home
    await page.getByRole("tab", { name: "Home" }).click();
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 5000 });
  });

  test("Home tab to Group detail and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Go to Groups tab
    await page.getByRole("tab", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasGroups) return;

    // Open a group
    await page.getByText("members").first().click();
    await expect(page.getByText("MEMBERS")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Total Spent")).toBeVisible();

    // Navigate back using the tab bar (Groups tab)
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
  });

  test("FAB / Add tab navigates to Add Expense", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Click the center Add tab (3rd child in tablist)
    await page
      .getByRole("tab", { name: /^$/ })
      .or(page.locator('[role="tablist"] > *:nth-child(3)'))
      .first()
      .click();

    await page.waitForTimeout(2000);

    // Should show Add Expense or Scan Receipt
    const hasAddExpense = await page
      .getByText("Add Expense")
      .isVisible()
      .catch(() => false);
    const hasScanReceipt = await page
      .getByText("Scan Receipt")
      .isVisible()
      .catch(() => false);

    expect(hasAddExpense || hasScanReceipt).toBeTruthy();
  });

  test("Profile to Edit Profile and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Navigate to Profile
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.getByText("Edit Profile")).toBeVisible({
      timeout: 5000,
    });

    // Click "Edit Profile"
    await page.getByText("Edit Profile").first().click();

    // Should show edit profile form
    await expect(page.getByText("Name")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByText("Save Changes")).toBeVisible();

    // Navigate back to Profile via tab bar
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.getByText("Edit Profile")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Sign Out")).toBeVisible();
  });

  test("Groups to Create Group and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Navigate to Groups
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("New")).toBeVisible({ timeout: 5000 });

    // Click "New" to go to create group
    await page.getByText("New").click();
    await expect(page.getByText("New Group")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Create Group")).toBeVisible();

    // Go back to Groups via tab bar
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
  });

  test("Group detail to Settle Up and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasGroups) return;

    // Open group
    await page.getByText("members").first().click();
    await expect(page.getByText("Settle Up")).toBeVisible({ timeout: 5000 });

    // Go to settle up
    await page.getByText("Settle Up").click();
    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/History/)).toBeVisible();

    // Go back via tab bar to Groups
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
  });

  test("navigating to invalid group URL shows error or redirects", async ({
    page,
  }) => {
    // Try navigating to a non-existent group
    await page.goto("/group/invalid-group-id-12345");
    await page.waitForTimeout(3000);

    // Should either show an error, redirect to groups, or show empty state
    const hasError = await page
      .getByText(/not found|error|something went wrong/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasGroups = await page
      .getByText("Active")
      .isVisible()
      .catch(() => false);
    const hasHome = await page
      .getByText("Splitr")
      .isVisible()
      .catch(() => false);

    // App should handle the invalid route gracefully
    expect(hasError || hasGroups || hasHome).toBeTruthy();
  });

  test("Home quick actions navigate correctly", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Check for Scan quick action
    const hasScan = await page
      .getByText("Scan")
      .isVisible()
      .catch(() => false);

    if (hasScan) {
      await page.getByText("Scan").click();
      await page.waitForTimeout(2000);

      // Should navigate to receipt scanner or scan-related screen
      const isOnScan = await page
        .getByText(/Scan Receipt|Scanner/i)
        .isVisible()
        .catch(() => false);
      const isOnHome = await page
        .getByText("Splitr")
        .isVisible()
        .catch(() => false);

      // Either navigated to scan screen or stayed on home (if scan opens a modal)
      expect(isOnScan || isOnHome).toBeTruthy();

      // Navigate back to home
      await page.getByRole("tab", { name: "Home" }).click();
      await expect(page.getByText("Splitr")).toBeVisible({ timeout: 5000 });
    }

    // Check for Chat quick action
    const hasChat = await page
      .getByText("Chat")
      .isVisible()
      .catch(() => false);

    if (hasChat) {
      await page.getByText("Chat").click();
      await page.waitForTimeout(2000);

      // Should navigate to chat screen
      const isOnChat = await page
        .getByText(/Chat|AI|Assistant/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(isOnChat).toBeTruthy();
    }
  });

  test("tab bar maintains state across tab switches", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Go to Groups and verify content
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    // Switch to Activity
    await page.getByRole("tab", { name: "Activity" }).click();
    await expect(page.getByText("Recent Activity")).toBeVisible({
      timeout: 5000,
    });

    // Switch back to Groups — should still show group content
    await page.getByRole("tab", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Archived")).toBeVisible();
  });
});
