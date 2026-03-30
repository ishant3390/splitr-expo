/**
 * Dev Sanity — Expense lifecycle (edit, delete, currency)
 * Verifies expense CRUD with optimistic locking and balance adjustments.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Expense Lifecycle", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) testInfo.skip();
  });

  test("edit expense updates amount and description", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Edit Expense" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // Create $60 expense
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Original Lunch",
        totalAmount: 6000,
      })
    );

    // Edit to $80 with new description (requires version)
    const fetched = await userAClient.getExpense(expense.id);
    const updated = await userAClient.updateExpense(expense.id, {
      description: `[SANITY] Updated Dinner ${Date.now().toString(36)}`,
      totalAmount: 8000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 8000 }],
      splits: [
        { userId: userA.id, splitAmount: 4000 },
        { userId: userB.id, splitAmount: 4000 },
      ],
      version: fetched.version!,
    });
    expect(updated.amountCents).toBe(8000);

    // Balance should reflect $40 owed (not $30)
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(4000);
  });

  test("delete expense reverses balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Delete Expense" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // Create expense
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "To Delete",
        totalAmount: 5000,
      })
    );

    // Verify balance exists
    const before = await userAClient.getSettlementSuggestions(group.id);
    expect(before.length).toBe(1);

    // Delete expense
    await userAClient.deleteExpense(expense.id);

    // Balance should be zero
    const after = await userAClient.getSettlementSuggestions(group.id);
    expect(after.length).toBe(0);
  });

  test("delete settlement reverses balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Delete Settlement" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // Create $100 expense → B owes A $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Hotel",
        totalAmount: 10000,
      })
    );

    // B settles $50
    const settlement = await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 5000 })
    );

    // Balance should be zero
    const settled = await userAClient.getSettlementSuggestions(group.id);
    expect(settled.length).toBe(0);

    // Delete settlement → balance should return to $50
    await userAClient.deleteSettlement(settlement.id);
    const afterDelete = await userAClient.getSettlementSuggestions(group.id);
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].amount).toBe(5000);
  });

  test("update settlement amount recalculates remaining balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Update Settlement" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // Create $100 expense -> B owes A $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Settlement Update Base",
        totalAmount: 10000,
      })
    );

    // B settles $20 first
    const settlement = await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 2000 })
    );

    // Remaining should be $30
    const beforeUpdate = await userAClient.getSettlementSuggestions(group.id);
    expect(beforeUpdate.length).toBe(1);
    expect(beforeUpdate[0].amount).toBe(3000);

    // Update settlement from $20 -> $35 (requires version)
    await userBClient.updateSettlement(settlement.id, {
      payerUserId: userB.id,
      payeeUserId: userA.id,
      amount: 3500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
      version: settlement.version,
    });

    // Remaining should now be $15
    const afterUpdate = await userAClient.getSettlementSuggestions(group.id);
    expect(afterUpdate.length).toBe(1);
    expect(afterUpdate[0].amount).toBe(1500);
  });

  test("expense in non-USD currency works", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "GBP Group", defaultCurrency: "GBP" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // Create £50 expense
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "London Dinner",
        totalAmount: 5000,
        currency: "GBP",
      })
    );
    expect(expense.id).toBeTruthy();

    // B owes A £25
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(2500);
    expect(suggestions[0].currency).toBe("GBP");
  });
});
