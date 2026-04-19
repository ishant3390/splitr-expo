/**
 * Dev Sanity — Promoted Member Scenarios (BE-20 + BE-21)
 *
 * Exercises the guest-to-user promotion pathway end-to-end against live DEV:
 *   1. Reproduces BE-20: creating an expense that splits with a promoted member
 *      must not hit ERR-420 (PARTICIPANT_IDENTITY_INVALID).
 *   2. Reproduces BE-21: post-promotion balance reads must include pre-promotion
 *      guest-keyed debt (listMembers.balance + /me/balance).
 *
 * These tests intentionally start from the "User A adds User B's email as a
 * guest before User B joins" flow — the exact scenario that surfaced the
 * Goa Trip regression.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Promoted Member Scenarios", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("BE-20: promoted member can be included in a new expense split without ERR-420", async ({
    userAClient,
    userBClient,
  }) => {
    const userB = await userBClient.getMe();
    expect(userB.email).toBeTruthy();

    // User A creates group and adds a guest with User B's email
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Promo Expense" })
    );
    await userAClient.addGuestMember(group.id, {
      name: `[SANITY] Promoted-B ${Date.now().toString(36)}`,
      email: userB.email,
    });

    // User B joins via invite code → guest is promoted to User B
    const groupDetail = await userAClient.getGroup(group.id);
    expect(groupDetail.inviteCode).toBeTruthy();
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // Confirm DTO carries only user identity (BE-20 invariant)
    const members = await userAClient.listMembers(group.id);
    const promoted = members.find((m: any) => m.user?.id === userB.id);
    expect(promoted).toBeTruthy();
    expect(promoted.user).toBeTruthy();
    expect(promoted.guestUser).toBeNull();

    // User A creates a NEW expense that includes the promoted member as a split
    // Pre-BE-20 fix: this would fail with ERR-420.
    const userA = await userAClient.getMe();
    const expense = await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Post-promotion dinner",
        totalAmount: 4000,
      })
    );
    expect(expense.id).toBeTruthy();
  });

  test("BE-21: promoted member's balance includes pre-promotion guest-keyed debt", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Promo Balance" })
    );

    // Guest membership for User B's email
    const guestMember = await userAClient.addGuestMember(group.id, {
      name: `[SANITY] Promoted-B-Balance ${Date.now().toString(36)}`,
      email: userB.email,
    });
    const guestUserId = guestMember.guestUser?.id;
    expect(guestUserId).toBeTruthy();

    // Pre-promotion expense: User A pays $50, split 50/50 with the guest
    await userAClient.createExpense(
      group.id,
      sanityFixtures.guestExpense(userA.id, guestUserId!, {
        description: "Pre-promotion taxi",
        totalAmount: 5000,
      })
    );

    // User B joins via invite → promotion fires
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // listMembers must show User B with -2500 balance (pre-promotion guest debt).
    // Pre-BE-21 fix: balance shows 0 because the debt is keyed under guest:X.
    const members = await userAClient.listMembers(group.id);
    const promoted = members.find((m: any) => m.user?.id === userB.id);
    expect(promoted).toBeTruthy();
    expect(promoted.balance).toBe(-2500);

    // User B's /me/balance must include the debt under totalOwing.
    const summary = await userBClient.getBalance();
    const usdOwing = (summary.totalOwing || []).find(
      (cb: any) => cb.currency === "USD"
    );
    expect(usdOwing).toBeTruthy();
    expect(usdOwing.amount).toBeGreaterThanOrEqual(2500);

    // The group entry should carry the -2500 balance too.
    const groupEntry = (summary.groupBalances || []).find(
      (gb: any) => gb.groupId === group.id
    );
    expect(groupEntry).toBeTruthy();
    expect(groupEntry.balanceCents).toBe(-2500);
  });

  test("post-promotion expense suggestion references the real user identity (not guest)", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Promo Suggest" })
    );

    // User B added as guest first, then joins → promoted
    await userAClient.addGuestMember(group.id, {
      name: `[SANITY] Guest-B-Suggest ${Date.now().toString(36)}`,
      email: userB.email,
    });
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // Post-promotion expense: User A pays $80, split equally → User B owes $40
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Post-promo dinner",
        totalAmount: 8000,
      })
    );

    // Suggestion must carry fromUser (real user), not fromGuest
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBeGreaterThan(0);
    const suggestion = suggestions[0];
    expect(suggestion.fromUser).toBeTruthy();
    expect(suggestion.fromUser!.id).toBe(userB.id);
    expect(suggestion.fromGuest).toBeFalsy();
    expect(suggestion.amount).toBe(4000); // $40
  });

  test("settling a post-promotion userId-based debt via userId clears the balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Promo Settle" })
    );

    await userAClient.addGuestMember(group.id, {
      name: `[SANITY] Guest-B-Settle ${Date.now().toString(36)}`,
      email: userB.email,
    });
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // Post-promotion expense: User A pays $100, split equally → User B owes $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Post-promo hotel",
        totalAmount: 10000,
      })
    );

    // Settle using User B's userId (the promoted real-user path)
    await userBClient.createSettlement(
      group.id,
      sanityFixtures.settlement(userB.id, userA.id, { amount: 5000 })
    );

    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(0);
  });

  /**
   * NOTE: This test verifies the BE-21 fix. It will fail until the backend
   * aggregates pre-promotion (guest:X keyed) and post-promotion (user:Y keyed)
   * ledger entries when building settlement suggestions for the promoted member.
   */
  test("[BE-21] pre-promotion and post-promotion debts both appear in settlement suggestions", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Promo Agg" })
    );

    const guestMember = await userAClient.addGuestMember(group.id, {
      name: `[SANITY] Guest-B-Agg ${Date.now().toString(36)}`,
      email: userB.email,
    });
    const guestUserId = guestMember.guestUser?.id;
    expect(guestUserId).toBeTruthy();

    // Pre-promotion: User A pays $100, split 50/50 with guest → guest owes $50
    await userAClient.createExpense(
      group.id,
      sanityFixtures.guestExpense(userA.id, guestUserId!, {
        description: "Pre-promo flight",
        totalAmount: 10000,
      })
    );

    // User B joins → promotion fires
    const groupDetail = await userAClient.getGroup(group.id);
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // Post-promotion: User A pays $60, split equally → User B additionally owes $30
    await userAClient.createExpense(
      group.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        description: "Post-promo taxi",
        totalAmount: 6000,
      })
    );

    // Both debts must appear in suggestions (whether merged or as separate entries).
    // Total owing from User B's side = $50 (pre-promo) + $30 (post-promo) = $80.
    const suggestions = await userAClient.getSettlementSuggestions(group.id);
    const totalOwing = suggestions
      .filter(
        (s: any) =>
          s.fromUser?.id === userB.id || s.fromGuest?.id === guestUserId
      )
      .reduce((sum: number, s: any) => sum + s.amount, 0);
    expect(totalOwing).toBe(8000); // $80
  });

  test("re-joining after promotion returns already-member error (ERR-301)", async ({
    userAClient,
    userBClient,
  }) => {
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Promo Rejoin" })
    );

    const groupDetail = await userAClient.getGroup(group.id);
    expect(groupDetail.inviteCode).toBeTruthy();

    // User B joins → promoted to real member
    const joined = await userBClient.joinGroupByInvite(groupDetail.inviteCode!);
    expect(joined.id).toBeTruthy();

    // User B attempts to join the same group again
    const result = await userBClient.requestSafe("/v1/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: groupDetail.inviteCode }),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    const errorBody = result.error ? JSON.parse(result.error) : {};
    expect(errorBody.code).toBe("ERR-301");
  });
});
