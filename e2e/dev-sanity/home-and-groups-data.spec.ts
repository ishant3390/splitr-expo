/**
 * Dev Sanity — Home & Groups Data
 * Verifies home balance, groups list, and activity feed accuracy
 * across multiple groups with expenses and settlements.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Home & Groups Data", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("home balance reflects expenses across multiple groups", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Snapshot balance before
    const balanceBefore = await userAClient.getBalance();
    const owedBefore =
      balanceBefore.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    // Create 2 groups, B joins both
    const group1 = await userAClient.createGroup(
      sanityFixtures.group({ name: "Home Multi G1" })
    );
    const detail1 = await userAClient.getGroup(group1.id);
    await userBClient.joinGroupByInvite(detail1.inviteCode!);

    const group2 = await userAClient.createGroup(
      sanityFixtures.group({ name: "Home Multi G2" })
    );
    const detail2 = await userAClient.getGroup(group2.id);
    await userBClient.joinGroupByInvite(detail2.inviteCode!);

    // A pays $100 in group1 (equal split → B owes $50)
    await userAClient.createExpense(
      group1.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Group1 Dinner",
        totalAmount: 10000,
      })
    );

    // A pays $80 in group2 (equal split → B owes $40)
    await userAClient.createExpense(
      group2.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Group2 Lunch",
        totalAmount: 8000,
      })
    );

    // A should be owed $90 more than before ($50 + $40)
    const balanceAfter = await userAClient.getBalance();
    const owedAfter =
      balanceAfter.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    expect(owedAfter - owedBefore).toBe(9000);
  });

  test("groups list shows per-group data after expenses", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "GroupsList Check" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Groceries",
        totalAmount: 6000,
      })
    );

    const groups = await userAClient.listGroups();
    const found = groups.find((g: any) => g.id === group.id);

    expect(found).toBeDefined();
    expect(found!.name).toContain("GroupsList Check");
  });

  test("home balance updates after settlement", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create group, B joins
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Balance Settle" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $100 → B owes $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Pre-Settle Expense",
        totalAmount: 10000,
      })
    );

    // Snapshot after expense
    const balanceAfterExpense = await userAClient.getBalance();
    const owedAfterExpense =
      balanceAfterExpense.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    // B settles $30
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 3000 })
    );

    // A should be owed $30 less
    const balanceAfterSettle = await userAClient.getBalance();
    const owedAfterSettle =
      balanceAfterSettle.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    expect(owedAfterExpense - owedAfterSettle).toBe(3000);
  });

  test("home balance shows zero when all groups settled", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Snapshot balance before creating test data
    const balanceBefore = await userAClient.getBalance();
    const owedBefore =
      balanceBefore.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    // Create group, B joins
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Balance Zero" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $60 → B owes $30
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Full Settle Expense",
        totalAmount: 6000,
      })
    );

    // B settles the full $30
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 3000 })
    );

    // Balance should return to pre-test level (net zero from this group)
    const balanceAfter = await userAClient.getBalance();
    const owedAfter =
      balanceAfter.totalOwed?.find((b: any) => b.currency === "USD")
        ?.amount || 0;

    expect(owedAfter - owedBefore).toBe(0);
  });

  test("activity feed shows expenses and settlements from all groups", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create 2 groups, B joins both
    const group1 = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity G1" })
    );
    const detail1 = await userAClient.getGroup(group1.id);
    await userBClient.joinGroupByInvite(detail1.inviteCode!);

    const group2 = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity G2" })
    );
    const detail2 = await userAClient.getGroup(group2.id);
    await userBClient.joinGroupByInvite(detail2.inviteCode!);

    // Create expenses in both groups
    await userAClient.createExpense(
      group1.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Activity Exp1",
        totalAmount: 5000,
      })
    );

    await userAClient.createExpense(
      group2.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Activity Exp2",
        totalAmount: 4000,
      })
    );

    // B settles in group1
    await userBClient.createSettlement(
      group1.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 2500 })
    );

    // Activity feed should contain entries from both groups
    const activity = await userAClient.getActivity({ limit: 50 });

    // Find our test entries by description/group
    // Activity API may use 'activityType' or 'type' for the event type field
    const expenseEntries = activity.filter(
      (a: any) =>
        (a.activityType === "expense_created" ||
          a.type === "expense_created") &&
        a.details?.description?.includes("[SANITY] Activity Exp")
    );
    const settlementEntries = activity.filter(
      (a: any) =>
        (a.activityType === "settlement_created" ||
          a.type === "settlement_created") &&
        (a.groupId === group1.id || a.details?.groupId === group1.id)
    );

    expect(expenseEntries.length).toBeGreaterThanOrEqual(2);
    expect(settlementEntries.length).toBeGreaterThanOrEqual(1);
  });
});
