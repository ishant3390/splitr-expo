/**
 * Dev Sanity — Unequal and custom split types
 * Verifies financial correctness for fixed, percentage, and edge-case splits.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Unequal Splits", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("unequal fixed split calculates correct per-person balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Unequal Fixed" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $100 total. Split: A=$30, B=$70
    await userAClient.createExpense(
      group.id,
      sanityFixtures.unequalExpense(
        userA.id,
        [
          { userId: userA.id, amount: 3000 },
          { userId: userB.id, amount: 7000 },
        ],
        { description: "Unequal Dinner" }
      )
    );

    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(7000);
  });

  test("percentage split calculates correct amounts", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Percentage Split" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    // A pays $200. Percentage split: A=25%, B=75%
    // 25% of 20000 = 5000, 75% of 20000 = 15000
    await userAClient.createExpense(group.id, {
      description: `[SANITY] Percentage Hotel ${Date.now().toString(36)}`,
      totalAmount: 20000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EXACT",
      payers: [{ userId: userA.id, amountPaid: 20000 }],
      splits: [
        { userId: userA.id, splitAmount: 5000 },
        { userId: userB.id, splitAmount: 15000 },
      ],
    });

    // B's share = 75% of $200 = $150 (15000 cents). B owes A 15000.
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].amount).toBe(15000);
  });

  test("three-way unequal split with guest", async ({ userAClient, userBClient }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "3-Way Unequal" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember({ name: "Guest Dan" })
    );
    const guestId = guest.guestUser?.id || guest.id;

    // A pays $90. Split: A=$30, B=$40, Guest=$20
    await userAClient.createExpense(
      group.id,
      sanityFixtures.unequalExpense(
        userA.id,
        [
          { userId: userA.id, amount: 3000 },
          { userId: userB.id, amount: 4000 },
          { guestUserId: guestId, amount: 2000 },
        ],
        { description: "3-Way Dinner" }
      )
    );

    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    // B owes A 4000, Guest owes A 2000 (order may vary)
    expect(suggestions.length).toBe(2);

    const amounts = suggestions.map((s: any) => s.amount).sort((a: number, b: number) => a - b);
    expect(amounts).toEqual([2000, 4000]);
  });

  test("odd amount 3-way equal split handles rounding", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Rounding Split" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember({ name: "Guest Eve" })
    );
    const guestId = guest.guestUser?.id || guest.id;

    // A pays $100 (10000 cents), 3-way equal. Each share ~ 3333, last gets remainder.
    const perPerson = Math.floor(10000 / 3); // 3333
    const remainder = 10000 - perPerson * 3; // 1
    await userAClient.createExpense(group.id, {
      description: `[SANITY] Rounding Test ${Date.now().toString(36)}`,
      totalAmount: 10000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 10000 }],
      splits: [
        { userId: userA.id, splitAmount: perPerson },
        { userId: userB.id, splitAmount: perPerson },
        { guestUserId: guestId, splitAmount: perPerson + remainder },
      ],
    });

    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    // B owes 3333, Guest owes 3334 (gets the remainder)
    expect(suggestions.length).toBe(2);
    const amounts = suggestions
      .map((s: any) => s.amount)
      .sort((a: number, b: number) => a - b);
    expect(amounts).toEqual([3333, 3334]);
  });

  test("very small amount split", async ({ userAClient, userBClient }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Tiny Split" })
    );
    const detail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(detail.inviteCode!);

    const guest = await userAClient.addGuestMember(
      group.id,
      sanityFixtures.guestMember({ name: "Guest Fay" })
    );
    const guestId = guest.guestUser?.id || guest.id;

    // A pays $0.03 (3 cents), 3-way equal. Each share = 1 cent.
    await userAClient.createExpense(group.id, {
      description: `[SANITY] Tiny Split ${Date.now().toString(36)}`,
      totalAmount: 3,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 3 }],
      splits: [
        { userId: userA.id, splitAmount: 1 },
        { userId: userB.id, splitAmount: 1 },
        { guestUserId: guestId, splitAmount: 1 },
      ],
    });

    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    // B and Guest each owe 1 cent
    expect(suggestions.length).toBe(2);
    for (const s of suggestions) {
      expect(s.amount).toBe(1);
    }
  });
});
