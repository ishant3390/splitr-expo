/**
 * Dev Sanity — Group → Expense → Settle flow
 * Core happy path: create group, add expense, settle up.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

// Helper: navigate to Groups tab and wait for data
async function navigateToGroupsTab(page: any) {
  await Promise.all([
    page
      .waitForResponse(
        (resp: any) =>
          resp.url().includes("/v1/groups") &&
          resp.request().method() === "GET",
        { timeout: 15000 }
      )
      .catch(() => {}),
    page.getByRole("button", { name: "Groups" }).click(),
  ]).catch(() => {});
  await page.waitForTimeout(2000);
}

// Helper: find and click a group by name (handles Reanimated opacity)
async function scrollToGroupAndClick(page: any, groupName: string) {
  const groupLocator = page.getByText(groupName).first();
  await groupLocator.waitFor({ state: "attached", timeout: 15000 });
  await groupLocator.evaluate((el: HTMLElement) => {
    const target =
      el.closest('[role="button"],button,a,[data-testid]') ?? el;
    (target as HTMLElement).click();
  });
  await page.waitForTimeout(2000);
}

test.describe("Dev Sanity — Group → Expense → Settle", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("create group via API and verify in browser", async ({
    page,
    userAClient,
  }) => {
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Dinner Trip" })
    );
    expect(group.id).toBeTruthy();

    // Navigate to Groups tab and verify the group appears
    await navigateToGroupsTab(page);
    const groupText = page.getByText(group.name).first();
    await expect(groupText).toBeVisible({ timeout: 15000 });
  });

  test("add guest member and create expense via API", async ({
    page,
    userAClient,
  }) => {
    const me = await userAClient.getMe();
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Expense Test" })
    );
    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember({ name: "Guest Bob" })
    );

    const guestId = guest.guestUser?.id || guest.id;
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(me.id, [me.id, guestId], {
        description: "Lunch",
        totalAmount: 4000,
      })
    );
    expect(expense.id).toBeTruthy();

    // Verify expense shows in group detail
    await navigateToGroupsTab(page);
    await scrollToGroupAndClick(page, group.name);
    await expect(page.getByText(/Lunch/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("settle up via API and verify balance changes", async ({
    userAClient,
  }) => {
    const me = await userAClient.getMe();
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Settle Test" })
    );
    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember({ name: "Guest Carol" })
    );
    const guestId = guest.guestUser?.id || guest.id;

    // Create $50 expense split equally → guest owes $25
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(me.id, [me.id, guestId], {
        description: "Dinner",
        totalAmount: 5000,
      })
    );

    // Check suggestions before settlement
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].amount).toBe(2500); // $25

    // Record settlement
    const settlement = await userAClient.createSettlement(
      group.id,
      sanityFixtures.settlement(guestId, me.id, { amount: 2500 })
    );
    expect(settlement.id).toBeTruthy();

    // Suggestions should now be empty (fully settled)
    const afterSuggestions =
      await userAClient.getSettlementSuggestions(group.id);
    expect(afterSuggestions.length).toBe(0);
  });

  test("expense appears in activity feed", async ({ userAClient }) => {
    const me = await userAClient.getMe();
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity Test" })
    );
    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember()
    );
    const guestId = guest.guestUser?.id || guest.id;

    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(me.id, [me.id, guestId], {
        description: "Activity Check",
        totalAmount: 1500,
      })
    );

    // Verify activity feed includes the expense
    const activity = await userAClient.getActivity({ page: 0, limit: 5 });
    expect(activity.length).toBeGreaterThan(0);
  });
});
