import { test, expect } from "./auth.setup";

test.describe("Cross-Screen Navigation", () => {
  test("tab bar navigates to all main tabs", async ({ page }) => {
    // Start on Home
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Navigate to Groups
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    // Navigate to Activity
    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByText("Recent Activity")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to Profile
    await page.getByRole("button", { name: "Profile" }).click();
    await expect(page.getByText("Edit Profile")).toBeVisible({
      timeout: 5000,
    });

    // Navigate back to Home
    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 5000 });
  });

  test("Home tab to Group detail and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Go to Groups tab
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasGroups) return;

    // Open a group
    await page.getByText("members").first().click();
    await expect(page.getByText("Your Balance")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Total Spent")).toBeVisible();

    // group/[id] is a push screen (no tab bar) — go back
    await page.goBack();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
  });

  test("FAB / Add tab navigates to Add Expense", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Click the center Add tab (3rd child in tablist)
    await page.getByRole("button", { name: "Add Expense" }).click();

    await expect(page.getByText("Add Expense")).toBeVisible({ timeout: 5000 });
  });

  test("Profile to Edit Profile and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Navigate to Profile
    await page.getByRole("button", { name: "Profile" }).click();
    await expect(page.getByText("Edit Profile")).toBeVisible({
      timeout: 5000,
    });

    // Click "Edit Profile"
    await page.getByText("Edit Profile").first().click();

    // Should show edit profile form
    await expect(page.getByText("Name")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByText("Save Changes")).toBeVisible();

    // edit-profile is a push screen (no tab bar) — use back navigation
    await page.goBack();
    await expect(page.getByText("Edit Profile")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Sign Out")).toBeVisible();
  });

  test("Groups to Create Group and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Navigate to Groups
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByRole("button", { name: "New" })).toBeVisible({ timeout: 5000 });

    // Click "New" to go to create group
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByText("New Group", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Create Group")).toBeVisible();

    // create-group is a push screen (no tab bar) — use back navigation
    await page.goBack();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
  });

  test("Group detail to Settle Up and back", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasGroups) return;

    // Open group
    await page.getByText("members").first().click();
    await expect(page.getByText("Settle Up", { exact: true })).toBeVisible({ timeout: 5000 });

    // Go to settle up
    await page.getByText("Settle Up", { exact: true }).click();
    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/History/)).toBeVisible();

    // settle-up is a push screen (no tab bar) — go back to group detail, then back to groups
    await page.goBack();
    await page.goBack();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
  });

  test("navigating to invalid group URL shows error or redirects", async ({
    page,
  }) => {
    // Try navigating to a non-existent group
    await page.goto("/groups/invalid-group-id-12345");
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

  test("Home screen shows key sections", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Balance card
    await expect(page.getByText("Net Balance")).toBeVisible();

    // Recent activity section
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("tab bar maintains state across tab switches", async ({ page }) => {
    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 10000 });

    // Go to Groups and verify content
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    // Switch to Activity
    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByText("Recent Activity")).toBeVisible({
      timeout: 5000,
    });

    // Switch back to Groups — should still show group content
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Archived")).toBeVisible();
  });
});
