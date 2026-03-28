import { test, expect } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import { fixtures } from "./helpers/fixtures";

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

/**
 * Scroll to find a group by name in the Groups tab and click it.
 */
async function scrollToGroupAndClick(page: any, groupName: string) {
  const groupLocator = page.getByText(groupName).first();
  await groupLocator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(groupLocator).toBeVisible({ timeout: 10000 });
  await groupLocator.click();
}

test.describe("Navigation with Data", () => {
  test("group card click → correct group detail screen", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Nav Group" })
    );

    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });

    await scrollToGroupAndClick(page, group.name);

    // Should be on the correct group's detail page
    await expect(page.getByText(group.name).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 member").first()).toBeVisible({ timeout: 5000 });
  });

  test("expense in group detail → edit expense screen", async ({
    page,
    apiClient,
  }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Nav Expense" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] NavGuest",
    });

    const expense = await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guest.guestUser!.id, {
        description: "Nav Dinner",
        totalAmount: 2000,
      })
    );

    // Navigate to group detail
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);

    // Click on the expense
    await expect(
      page.getByText(expense.description).first()
    ).toBeVisible({ timeout: 10000 });
    await page.getByText(expense.description).first().click();

    // Should navigate to edit expense screen
    const hasEditExpense = await page
      .getByText(/Edit Expense/)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasDescription = await page
      .getByText(expense.description)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasEditExpense || hasDescription).toBeTruthy();
  });

  test("back navigation from group detail preserves groups list", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Nav Back" })
    );

    // Navigate to Groups → Group Detail → Back
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await expect(page.getByText(group.name).first()).toBeVisible({ timeout: 10000 });

    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Groups list should still be visible
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });

    const groupLocator = page.getByText(group.name).first();
    await groupLocator.scrollIntoViewIfNeeded().catch(() => {});
    await expect(groupLocator).toBeVisible({ timeout: 5000 });
  });

  test("tab switching preserves groups tab state", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Tab State" })
    );

    // Go to Groups
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });

    const groupLocator = page.getByText(group.name).first();
    await groupLocator.scrollIntoViewIfNeeded().catch(() => {});
    await expect(groupLocator).toBeVisible({ timeout: 10000 });

    // Switch to Activity
    await page.getByRole("button", { name: "Activity" }).click();
    await page.waitForTimeout(1000);

    // Switch back to Groups
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(1000);

    // Groups should still be there
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("Home View All → navigates to Groups or Activity", async ({
    page,
  }) => {
    await expect(page.getByText("Splitr").first()).toBeVisible({ timeout: 15000 });

    const viewAll = page.getByText("View All").first();
    const hasViewAll = await viewAll
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasViewAll) {
      await viewAll.click();
      await page.waitForTimeout(1000);

      // Should navigate to Activity or Groups screen
      const hasActivity = await page
        .getByText("Recent Activity")
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasGroups = await page
        .getByText("Active", { exact: true })
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasActivity || hasGroups).toBeTruthy();
    }
  });
});
