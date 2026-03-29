/**
 * Dev Sanity — Invite & Join flow (multi-user)
 * User A creates group, User B joins via invite code, both interact.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Invite & Join", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("User B joins User A's group via invite code", async ({
    userAClient,
    userBClient,
  }) => {
    // User A creates group
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Invite Test" })
    );

    // Get invite code
    const groupDetail = await userAClient.getGroup(group.id);
    expect(groupDetail.inviteCode).toBeTruthy();

    // User B joins via invite code
    const joined = await userBClient.joinGroupByInvite(
      groupDetail.inviteCode!
    );
    expect(joined.id).toBeTruthy();

    // Verify User B appears in member list
    const members = await userAClient.listMembers(group.id);
    const userB = await userBClient.getMe();
    const found = members.some(
      (m: any) => m.user?.id === userB.id || m.userId === userB.id
    );
    expect(found).toBe(true);
  });

  test("expense split between User A and User B", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // User A creates group, User B joins
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Split Test" })
    );
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // User A creates $80 expense split equally
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Concert Tickets",
        totalAmount: 8000,
      })
    );
    expect(expense.id).toBeTruthy();

    // Verify settlement suggestions: User B owes User A $40
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(4000);

    // Verify from User B's perspective too
    const suggestionsB =
      await userBClient.getSettlementSuggestions(group.id);
    expect(suggestionsB.length).toBe(1);
    expect(suggestionsB[0].amount).toBe(4000);
  });

  test("User B can create expense in shared group", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Setup: create group, User B joins
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "B Expense Test" })
    );
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // User B creates expense (User B pays)
    const expense = await userBClient.createExpense(
      group.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        description: "Groceries",
        totalAmount: 6000,
      })
    );
    expect(expense.id).toBeTruthy();

    // User A should now owe User B $30
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(3000);
  });

  test("settlement between real users zeroes balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Setup
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Settle Real Test" })
    );
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // User A pays $100, split equally → B owes A $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Hotel",
        totalAmount: 10000,
      })
    );

    // User B settles full amount
    const settlement = await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 5000 })
    );
    expect(settlement.id).toBeTruthy();

    // Balance should be zero
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(0);
  });
});
