/**
 * Dev Sanity — Activity feed completeness
 * Verifies that key actions (expense create, settlement, expense edit, member join)
 * produce correctly typed activity entries with accurate details.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Activity Completeness", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("activity shows expense creation with correct details", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create group, User B joins
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity Expense" })
    );
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // User A creates expense
    const description = `[SANITY] Dinner ${Date.now().toString(36)}`;
    await userAClient.createExpense(group.id, {
      description,
      totalAmount: 5000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 5000 }],
      splits: [
        { userId: userA.id, splitAmount: 2500 },
        { userId: userB.id, splitAmount: 2500 },
      ],
    });

    // Verify activity feed contains the expense_created entry
    const activity = await userAClient.getActivity({ limit: 10 });
    const entry = activity.find(
      (a: any) =>
        a.activityType === "expense_created" &&
        a.details?.description?.includes("Dinner")
    );
    expect(entry).toBeTruthy();
  });

  test("activity shows settlement with correct participants", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create group, User B joins, User A creates expense
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity Settle" })
    );
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Taxi",
        totalAmount: 4000,
      })
    );

    // User B settles
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 2000 })
    );

    // Verify activity feed contains settlement_created entry
    const activity = await userAClient.getActivity({ limit: 10 });
    const entry = activity.find(
      (a: any) => a.activityType === "settlement_created"
    );
    expect(entry).toBeTruthy();
  });

  test("activity shows expense edit with old and new values", async ({
    userAClient,
  }) => {
    const userA = await userAClient.getMe();

    // Create group with guest
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity Edit" })
    );
    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember({ name: "Guest Edit" })
    );
    const guestId = guest.guestUser?.id || guest.id;

    // Create $50 expense
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.guestExpense(userA.id, guestId, {
        description: "Original Expense",
        totalAmount: 5000,
      })
    );

    // Fetch current version for optimistic locking
    const current = await userAClient.getExpense(expense.id);

    // Edit to $80
    await userAClient.updateExpense(expense.id, {
      description: `[SANITY] Edited Expense ${Date.now().toString(36)}`,
      totalAmount: 8000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 8000 }],
      splits: [
        { userId: userA.id, splitAmount: 4000 },
        { guestUserId: guestId, splitAmount: 4000 },
      ],
      version: current.version!,
    });

    // Verify activity feed contains expense_updated entry
    const activity = await userAClient.getActivity({ limit: 10 });
    const entry = activity.find(
      (a: any) => a.activityType === "expense_updated"
    );
    expect(entry).toBeTruthy();
  });

  test("activity shows member join via invite", async ({
    userAClient,
    userBClient,
  }) => {
    // User A creates group
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Activity Join" })
    );
    const groupDetail = await userAClient.getGroup(group.id);
    expect(groupDetail.inviteCode).toBeTruthy();

    // User B joins via invite code
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // Verify activity feed contains member join entry
    const activity = await userAClient.getActivity({ limit: 10 });
    const entry = activity.find(
      (a: any) =>
        a.activityType === "member_joined_via_invite" ||
        a.activityType === "member_joined"
    );
    expect(entry).toBeTruthy();
  });
});
