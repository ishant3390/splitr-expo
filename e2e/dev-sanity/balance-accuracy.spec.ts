/**
 * Dev Sanity — Balance accuracy
 * Verifies financial correctness: expenses + settlements = correct balances.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Balance Accuracy", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("equal split calculates correct amounts", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Balance Equal" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // User A pays $100, split equally → each owes $50, so B owes A $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Dinner",
        totalAmount: 10000,
      })
    );

    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(5000);
  });

  test("partial settlement leaves correct remainder", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Balance Partial" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // User A pays $100 → B owes $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Tickets",
        totalAmount: 10000,
      })
    );

    // B pays $30 partial settlement
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 3000 })
    );

    // B should still owe $20
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(2000);
  });

  test("multiple expenses accumulate correctly", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Balance Multi" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // Expense 1: A pays $60 → B owes $30
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Lunch",
        totalAmount: 6000,
      })
    );

    // Expense 2: B pays $40 → A owes $20
    await userBClient.createExpense(
      group.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        description: "Coffee",
        totalAmount: 4000,
      })
    );

    // Net: B owes A $30 - $20 = $10
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(1000);
  });

  test("user balance endpoint reflects group activity", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Snapshot balances before
    const balanceBefore = await userAClient.getBalance();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Balance API" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $200, split equally → B owes A $100
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Flight",
        totalAmount: 20000,
      })
    );

    // Balance should reflect the new owed amount
    const balanceAfter = await userAClient.getBalance();
    const owedBefore =
      balanceBefore.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;
    const owedAfter =
      balanceAfter.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    // User A is owed $100 more than before
    expect(owedAfter - owedBefore).toBe(10000);
  });
});
