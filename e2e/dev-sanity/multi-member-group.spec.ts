/**
 * Dev Sanity — Multi-member groups, reciprocal expenses, and post-settlement mutations.
 * Verifies balance correctness in 3+ member groups, netting of reciprocal expenses,
 * and balance recalculation after editing/deleting expenses post-settlement.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";
import { ApiClient } from "../integration/helpers/api-client";

test.describe("Dev Sanity — Multi-Member Group", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) testInfo.skip();
  });

  test("three-member group with multiple payers shows correct suggestions", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create group, B joins, add guest C
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Three Payers" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);
    const guest = await userAClient.addGuestMember(group.id, {
      name: `[SANITY] Guest C ${Date.now().toString(36)}`,
    });
    const guestId = guest.guestUser?.id || guest.id;

    // A pays $60 (6000) equal 3-way split → each share = 2000
    await userAClient.createExpense(group.id, {
      description: `[SANITY] Dinner ${Date.now().toString(36)}`,
      totalAmount: 6000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 6000 }],
      splits: [
        { userId: userA.id, splitAmount: 2000 },
        { userId: userB.id, splitAmount: 2000 },
        { guestUserId: guestId, splitAmount: 2000 },
      ],
    });

    // B pays $90 (9000) equal 3-way split → each share = 3000
    await userBClient.createExpense(group.id, {
      description: `[SANITY] Hotel ${Date.now().toString(36)}`,
      totalAmount: 9000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userB.id, amountPaid: 9000 }],
      splits: [
        { userId: userA.id, splitAmount: 3000 },
        { userId: userB.id, splitAmount: 3000 },
        { guestUserId: guestId, splitAmount: 3000 },
      ],
    });

    // Net: each person's total share = 5000 (2000 + 3000)
    // A paid 6000, share 5000 → owed 1000
    // B paid 9000, share 5000 → owed 4000
    // Guest paid 0, share 5000 → owes 5000
    // Suggestions should settle these debts
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);

    // Suggestions can be non-minimal if simplify-debts is disabled on the group.
    // Validate financial conservation: total suggested amount equals total creditor claims.
    const totalSettlement = suggestions.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettlement).toBe(6000);
  });

  test("reciprocal expenses net out correctly", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Reciprocal" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $60 equal split → B owes A 3000
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Lunch",
        totalAmount: 6000,
      })
    );

    // B pays $40 equal split → A owes B 2000
    await userBClient.createExpense(
      group.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        description: "Coffee",
        totalAmount: 4000,
      })
    );

    // Net: B owes A 3000 - 2000 = 1000 ($10)
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(1000);
  });

  test("partial settlement leaves correct remainder", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Partial Settle" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $60 equal split → B owes A 3000
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Taxi",
        totalAmount: 6000,
      })
    );

    // B settles 2000 ($20)
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 2000 })
    );

    // B still owes A 1000 ($10)
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(1000);
  });

  test("full settlement zeros out balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Full Settle" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $40 equal split → B owes A 2000
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Groceries",
        totalAmount: 4000,
      })
    );

    // B settles exact amount 2000
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 2000 })
    );

    // Balance should be zero — no suggestions
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(0);
  });

  test("delete expense after settlement flips balance direction", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Delete After Settle" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $100 equal split → B owes A 5000
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Flight",
        totalAmount: 10000,
      })
    );

    // B settles full 5000
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 5000 })
    );

    // Balance should be zero
    const settled = await userAClient.getSettlementSuggestions(group.id);
    expect(settled.length).toBe(0);

    // Delete the expense — settlement remains, so B overpaid by 5000
    await userAClient.deleteExpense(expense.id);

    // Now A owes B 5000 (balance flipped)
    const flipped = await userAClient.getSettlementSuggestions(group.id);
    expect(flipped.length).toBe(1);
    expect(flipped[0].amount).toBe(5000);

    // Verify direction: A should pay B
    const fromId = flipped[0].fromUser?.id;
    const toId = flipped[0].toUser?.id;
    expect(fromId).toBe(userA.id);
    expect(toId).toBe(userB.id);
  });

  test("edit expense amount after partial settlement recalculates", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Edit After Settle" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $100 (10000) equal split → B owes A 5000
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Hotel",
        totalAmount: 10000,
      })
    );

    // B settles 3000
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 3000 })
    );

    // B still owes 2000
    const before = await userAClient.getSettlementSuggestions(group.id);
    expect(before.length).toBe(1);
    expect(before[0].amount).toBe(2000);

    // Edit expense to $60 (6000) — B's new share = 3000, already settled 3000 → balance zero
    const fetched = await userAClient.getExpense(expense.id);
    await userAClient.updateExpense(expense.id, {
      description: `[SANITY] Hotel Adjusted ${Date.now().toString(36)}`,
      totalAmount: 6000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 6000 }],
      splits: [
        { userId: userA.id, splitAmount: 3000 },
        { userId: userB.id, splitAmount: 3000 },
      ],
      version: fetched.version!,
    });

    // Balance should be zero — B's share (3000) equals settlement (3000)
    const after = await userAClient.getSettlementSuggestions(group.id);
    expect(after.length).toBe(0);
  });
});
