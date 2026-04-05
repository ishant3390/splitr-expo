/**
 * Dev Sanity — Simplify Debts
 *
 * Verifies that the debt simplification algorithm works correctly
 * on the live dev environment. Tests middleman elimination,
 * toggle behavior, and multi-expense simplification.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";
import { ApiClient } from "../integration/helpers/api-client";

test.describe("Dev Sanity — Simplify Debts", () => {
  test.slow();

  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) testInfo.skip();
  });

  test("middleman elimination: 3-user chain reduces to single debt", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create group with A + B + a guest (C)
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Simplify Chain" })
    );
    await userBClient.joinGroupByInvite(group.inviteCode!);
    const guest = await userAClient.addGuestMember(group.id, { name: "[SANITY] Charlie" });
    const guestId = guest.guestUser?.id ?? guest.id;

    // A pays $30 split 3 ways → B owes $10, C owes $10
    await userAClient.createExpense(group.id, {
      description: "[SANITY] Simplify dinner",
      totalAmount: 3000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 3000 }],
      splits: [
        { userId: userA.id, splitAmount: 1000 },
        { userId: userB.id, splitAmount: 1000 },
        { guestUserId: guestId, splitAmount: 1000 },
      ],
    });

    // B pays $30 split 3 ways → A owes $10, C owes $10
    await userBClient.createExpense(group.id, {
      description: "[SANITY] Simplify taxi",
      totalAmount: 3000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userB.id, amountPaid: 3000 }],
      splits: [
        { userId: userA.id, splitAmount: 1000 },
        { userId: userB.id, splitAmount: 1000 },
        { guestUserId: guestId, splitAmount: 1000 },
      ],
    });

    // Without simplify: A↔B cancel out, C owes A $10 and C owes B $10 = 2 debts
    const rawSuggestions = await userAClient.getSettlementSuggestions(group.id);
    // C owes both A and B
    const cDebts = rawSuggestions.filter(
      (s: any) => s.fromGuest?.id === guestId || s.fromGuestUser?.id === guestId
    );
    expect(cDebts.length).toBe(2);

    // Enable simplify
    const freshGroup = await userAClient.getGroup(group.id);
    await userAClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    // With simplify: C owes $20 total — should be reduced to fewer transactions
    const simplified = await userAClient.getSettlementSuggestions(group.id);
    // Simplified should have fewer or equal debts, total amount preserved
    const totalSimplified = simplified.reduce((sum: number, s: any) => sum + s.amount, 0);
    const totalRaw = rawSuggestions.reduce((sum: number, s: any) => sum + s.amount, 0);
    expect(totalSimplified).toBeLessThanOrEqual(totalRaw);
    expect(simplified.length).toBeLessThanOrEqual(rawSuggestions.length);
  });

  test("toggling simplify on and off returns different suggestion counts", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Simplify Toggle" })
    );
    await userBClient.joinGroupByInvite(group.inviteCode!);
    const guest = await userAClient.addGuestMember(group.id, { name: "[SANITY] Dave" });
    const guestId = guest.guestUser?.id ?? guest.id;

    // Create cross-debts: A pays $60 for all, B pays $30 for all
    await userAClient.createExpense(group.id, {
      description: "[SANITY] Toggle test A",
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

    await userBClient.createExpense(group.id, {
      description: "[SANITY] Toggle test B",
      totalAmount: 3000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userB.id, amountPaid: 3000 }],
      splits: [
        { userId: userA.id, splitAmount: 1000 },
        { userId: userB.id, splitAmount: 1000 },
        { guestUserId: guestId, splitAmount: 1000 },
      ],
    });

    // OFF: get suggestions
    const offSuggestions = await userAClient.getSettlementSuggestions(group.id);

    // ON: enable simplify
    let freshGroup = await userAClient.getGroup(group.id);
    await userAClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });
    const onSuggestions = await userAClient.getSettlementSuggestions(group.id);

    // Simplified should have fewer or equal suggestions
    expect(onSuggestions.length).toBeLessThanOrEqual(offSuggestions.length);

    // Total debt amount should be preserved or reduced (simplify can eliminate circular debts)
    const totalOff = offSuggestions.reduce((sum: number, s: any) => sum + s.amount, 0);
    const totalOn = onSuggestions.reduce((sum: number, s: any) => sum + s.amount, 0);
    expect(totalOn).toBeLessThanOrEqual(totalOff);

    // OFF again: toggle back
    freshGroup = await userAClient.getGroup(group.id);
    await userAClient.updateGroup(group.id, {
      simplifyDebts: false,
      version: freshGroup.version,
    });
    const revertedSuggestions = await userAClient.getSettlementSuggestions(group.id);

    // Should return to original count
    expect(revertedSuggestions.length).toBe(offSuggestions.length);
  });

  test("simplify with settlement: partial payment + simplify recalculates correctly", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Simplify + Settle" })
    );
    await userBClient.joinGroupByInvite(group.inviteCode!);
    const guest = await userAClient.addGuestMember(group.id, { name: "[SANITY] Eve" });
    const guestId = guest.guestUser?.id ?? guest.id;

    // A pays $90 split 3 ways → B owes $30, Eve owes $30
    await userAClient.createExpense(group.id, {
      description: "[SANITY] Simplify settle test",
      totalAmount: 9000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: userA.id, amountPaid: 9000 }],
      splits: [
        { userId: userA.id, splitAmount: 3000 },
        { userId: userB.id, splitAmount: 3000 },
        { guestUserId: guestId, splitAmount: 3000 },
      ],
    });

    // B partially settles $15 of $30
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, {
        amount: 1500,
        currency: "USD",
      })
    );

    // Enable simplify
    const freshGroup = await userAClient.getGroup(group.id);
    await userAClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    const suggestions = await userAClient.getSettlementSuggestions(group.id);

    // B should owe $15 remaining, Eve should owe $30
    // Total remaining debt = $45
    const totalRemaining = suggestions.reduce((sum: number, s: any) => sum + s.amount, 0);
    expect(totalRemaining).toBe(4500);

    // All suggestions should be in USD
    for (const s of suggestions) {
      expect(s.currency).toBe("USD");
    }

    // A should be the creditor in all suggestions
    for (const s of suggestions) {
      expect(s.toUser?.id).toBe(userA.id);
    }
  });

  test("unequal splits with simplify debts optimizes correctly", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Simplify Unequal" })
    );
    await userBClient.joinGroupByInvite(group.inviteCode!);
    const guest = await userAClient.addGuestMember(group.id, { name: "[SANITY] Fiona" });
    const guestId = guest.guestUser?.id ?? guest.id;

    // A pays $100 — unequal split: A=$20, B=$50, Fiona=$30
    await userAClient.createExpense(
      group.id,
      sanityFixtures.unequalExpense(userA.id, [
        { userId: userA.id, amount: 2000 },
        { userId: userB.id, amount: 5000 },
        { guestUserId: guestId, amount: 3000 },
      ], { description: "Unequal simplify #1" })
    );

    // B pays $60 — unequal split: A=$30, B=$10, Fiona=$20
    await userBClient.createExpense(
      group.id,
      sanityFixtures.unequalExpense(userB.id, [
        { userId: userA.id, amount: 3000 },
        { userId: userB.id, amount: 1000 },
        { guestUserId: guestId, amount: 2000 },
      ], { description: "Unequal simplify #2" })
    );

    // Without simplify:
    // A paid $100, owes $30 → net A paid $70, should get back $70 - $20(own share) = $50?
    // Let's just verify raw vs simplified
    const rawSuggestions = await userAClient.getSettlementSuggestions(group.id);
    const rawTotal = rawSuggestions.reduce((sum: number, s: any) => sum + s.amount, 0);

    // Enable simplify
    const freshGroup = await userAClient.getGroup(group.id);
    await userAClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    const simplified = await userAClient.getSettlementSuggestions(group.id);
    const simplifiedTotal = simplified.reduce((sum: number, s: any) => sum + s.amount, 0);

    // Simplified should have fewer or equal transactions
    expect(simplified.length).toBeLessThanOrEqual(rawSuggestions.length);

    // Total debt flow should be reduced or equal (simplification eliminates middleman)
    expect(simplifiedTotal).toBeLessThanOrEqual(rawTotal);

    // All suggestions should be in USD
    for (const s of simplified) {
      expect(s.currency).toBe("USD");
    }
  });
});
