/**
 * Integration tests for the Simplify Debts feature.
 *
 * The Middleman Elimination scenario:
 *   Expense 1: Alice (me) pays $30 split among Alice, Bob, Charlie ($10 each)
 *   Expense 2: Bob pays $20 split between Bob and Charlie ($10 each)
 *
 *   Net balances: Alice +$20, Bob $0, Charlie -$20
 *
 *   Without simplification: 3 debts (Bob→Alice $10, Charlie→Alice $10, Charlie→Bob $10)
 *   With simplification:    1 debt  (Charlie→Alice $20) — Bob eliminated from the ledger
 */

import { test, expect, skipOnboardingIfPresent } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import { fixtures } from "./helpers/fixtures";

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

/**
 * Scroll to find a group by name in the Groups tab and click it.
 */
async function scrollToGroupAndClick(page: any, groupName: string) {
  const groupLocator = page.getByText(groupName).first();
  await groupLocator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(groupLocator).toBeVisible({ timeout: 10000 });
  await groupLocator.click();
}

/**
 * Set up the Middleman Elimination scenario:
 * Me (Alice) + Guest Bob + Guest Charlie in a group with 2 expenses.
 */
async function setupMiddlemanScenario(apiClient: ApiClient) {
  const me = await apiClient.getMe();
  const group = await apiClient.createGroup(
    fixtures.group({ name: "Simplify Test" })
  );

  const bob = await apiClient.addGuestMember(group.id, {
    name: "[E2E] Bob",
  });
  const charlie = await apiClient.addGuestMember(group.id, {
    name: "[E2E] Charlie",
  });

  const bobId = bob.guestUser!.id;
  const charlieId = charlie.guestUser!.id;
  const today = new Date().toISOString().split("T")[0];

  // Expense 1: Alice (me) pays $30, split equally among Alice, Bob, Charlie ($10 each)
  await apiClient.createExpense(group.id, {
    description: "[E2E] Group Dinner",
    totalAmount: 3000,
    currency: "USD",
    expenseDate: today,
    splitType: "EQUAL",
    payers: [{ userId: me.id, amountPaid: 3000 }],
    splits: [
      { userId: me.id, splitAmount: 1000 },
      { guestUserId: bobId, splitAmount: 1000 },
      { guestUserId: charlieId, splitAmount: 1000 },
    ],
  });

  // Expense 2: Bob pays $20, split equally between Bob and Charlie ($10 each)
  await apiClient.createExpense(group.id, {
    description: "[E2E] Taxi Ride",
    totalAmount: 2000,
    currency: "USD",
    expenseDate: today,
    splitType: "EQUAL",
    payers: [{ guestUserId: bobId, amountPaid: 2000 }],
    splits: [
      { guestUserId: bobId, splitAmount: 1000 },
      { guestUserId: charlieId, splitAmount: 1000 },
    ],
  });

  return { group, me, bobId, charlieId };
}

test.describe("Simplify Debts", () => {
  // ── API-level tests ──────────────────────────────────────────────────────

  test("without simplification returns multiple debts", async ({
    apiClient,
  }) => {
    const { group, me, bobId, charlieId } =
      await setupMiddlemanScenario(apiClient);

    // Ensure simplifyDebts is OFF
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: false,
      version: freshGroup.version,
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);

    // Without simplification there should be multiple debts:
    // Bob→Alice $10, Charlie→Alice $10, Charlie→Bob $10
    expect(suggestions.length).toBeGreaterThanOrEqual(2);

    // Total debt amount across all suggestions should be $30 (3000 cents)
    const totalCents = suggestions.reduce((sum, s) => sum + s.amount, 0);
    expect(totalCents).toBe(3000);
  });

  test("with simplification reduces to single debt (middleman elimination)", async ({
    apiClient,
  }) => {
    const { group, me, bobId, charlieId } =
      await setupMiddlemanScenario(apiClient);

    // Enable simplifyDebts
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);

    // With simplification: exactly 1 debt — Charlie → Alice $20
    expect(suggestions.length).toBe(1);

    const debt = suggestions[0];
    expect(debt.amount).toBe(2000); // $20.00 in cents

    // Charlie is the debtor (fromGuest)
    expect(debt.fromGuest?.id).toBe(charlieId);

    // Alice (me) is the creditor (toUser)
    expect(debt.toUser?.id).toBe(me.id);
  });

  test("Bob has no debts after simplification", async ({ apiClient }) => {
    const { group, bobId } = await setupMiddlemanScenario(apiClient);

    // Enable simplifyDebts
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);

    // Bob should not appear in any debt — fully eliminated
    const bobInvolved = suggestions.some(
      (s) =>
        s.fromGuest?.id === bobId ||
        s.toGuest?.id === bobId ||
        s.fromUser?.id === bobId ||
        s.toUser?.id === bobId
    );
    expect(bobInvolved).toBe(false);
  });

  test("penny drop: indivisible amount does not lose or gain a cent", async ({
    apiClient,
  }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Penny Test" })
    );
    const guest1 = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Penny1",
    });
    const guest2 = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Penny2",
    });
    const g1Id = guest1.guestUser!.id;
    const g2Id = guest2.guestUser!.id;
    const today = new Date().toISOString().split("T")[0];

    // $10 split 3 ways: $3.33 + $3.33 + $3.34 = $10.00
    // Backend handles the remainder allocation
    await apiClient.createExpense(group.id, {
      description: "[E2E] Indivisible Split",
      totalAmount: 1000,
      currency: "USD",
      expenseDate: today,
      splitType: "EQUAL",
      payers: [{ userId: me.id, amountPaid: 1000 }],
      splits: [
        { userId: me.id, splitAmount: 334 },
        { guestUserId: g1Id, splitAmount: 333 },
        { guestUserId: g2Id, splitAmount: 333 },
      ],
    });

    // Enable simplification
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);

    // Total owed must equal exactly what me is owed (1000 - 334 = 666 cents)
    const totalOwed = suggestions.reduce((sum, s) => sum + s.amount, 0);
    expect(totalOwed).toBe(666);

    // No negative or zero-amount debts
    suggestions.forEach((s) => {
      expect(s.amount).toBeGreaterThan(0);
    });
  });

  // ── UI-level tests ───────────────────────────────────────────────────────

  test("settle-up UI shows single simplified suggestion after enabling via API", async ({
    page,
    apiClient,
  }) => {
    const { group } = await setupMiddlemanScenario(apiClient);

    // Enable simplifyDebts via API
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    // Navigate to group → Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByText("Settle Up", { exact: true }).click();
    await expect(page.getByText("Suggested").first()).toBeVisible({
      timeout: 10000,
    });

    // With simplification enabled, should see exactly 1 suggestion
    // showing $20.00 (Charlie → me) and "SUGGESTED PAYMENTS (1)"
    await expect(
      page.getByText(/SUGGESTED PAYMENTS \(1\)/).first()
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByText(/owes \$20\.00/).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("simplified suggestion shows correct debtor and creditor names", async ({
    page,
    apiClient,
  }) => {
    const { group, me } = await setupMiddlemanScenario(apiClient);

    // Enable simplifyDebts via API
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    // Navigate to Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByText("Settle Up", { exact: true }).click();
    await expect(page.getByText("Suggested").first()).toBeVisible({
      timeout: 10000,
    });

    // Wait for suggestions to render
    await page.waitForTimeout(2000);

    // Charlie should appear as the debtor
    await expect(page.getByText(/Charlie/).first()).toBeVisible({ timeout: 5000 });

    // "owes $20.00" text should be visible (amount rendered inline with "owes")
    await expect(page.getByText(/owes \$20\.00/).first()).toBeVisible({ timeout: 5000 });

    // Record button should show $20.00
    await expect(page.getByText(/Record \$20\.00 payment/).first()).toBeVisible({ timeout: 5000 });
  });

  test("recording simplified payment clears all debts", async ({
    page,
    apiClient,
  }) => {
    const { group, me, charlieId } =
      await setupMiddlemanScenario(apiClient);

    // Enable simplifyDebts via API
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    // Record the single simplified settlement via API: Charlie pays Alice $20
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: charlieId,
      payeeUserId: me.id,
      amount: 2000,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    // Verify no more suggestions remain
    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(0);

    // Verify in UI: navigate to Settle Up, should show "All settled up!"
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByText("Settle Up", { exact: true }).click();
    await expect(page.getByText("Suggested").first()).toBeVisible({
      timeout: 10000,
    });

    const allSettled = await page
      .getByText("All settled up!")
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(allSettled).toBeTruthy();
  });

  // ── Circular Debt ─────────────────────────────────────────────────────────

  test("circular debt: simplification eliminates zero-sum loop → empty suggestions", async ({
    apiClient,
  }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Circular Debt" })
    );

    const bob = await apiClient.addGuestMember(group.id, {
      name: "[E2E] CircBob",
    });
    const charlie = await apiClient.addGuestMember(group.id, {
      name: "[E2E] CircCharlie",
    });
    const bobId = bob.guestUser!.id;
    const charlieId = charlie.guestUser!.id;
    const today = new Date().toISOString().split("T")[0];

    // Me pays $20 split with Bob → Bob owes Me $10
    await apiClient.createExpense(group.id, {
      description: "[E2E] Circular A→B",
      totalAmount: 2000,
      currency: "USD",
      expenseDate: today,
      splitType: "EQUAL",
      payers: [{ userId: me.id, amountPaid: 2000 }],
      splits: [
        { userId: me.id, splitAmount: 1000 },
        { guestUserId: bobId, splitAmount: 1000 },
      ],
    });

    // Bob pays $20 split with Charlie → Charlie owes Bob $10
    await apiClient.createExpense(group.id, {
      description: "[E2E] Circular B→C",
      totalAmount: 2000,
      currency: "USD",
      expenseDate: today,
      splitType: "EQUAL",
      payers: [{ guestUserId: bobId, amountPaid: 2000 }],
      splits: [
        { guestUserId: bobId, splitAmount: 1000 },
        { guestUserId: charlieId, splitAmount: 1000 },
      ],
    });

    // Charlie pays $20 split with Me → Me owes Charlie $10
    await apiClient.createExpense(group.id, {
      description: "[E2E] Circular C→A",
      totalAmount: 2000,
      currency: "USD",
      expenseDate: today,
      splitType: "EQUAL",
      payers: [{ guestUserId: charlieId, amountPaid: 2000 }],
      splits: [
        { guestUserId: charlieId, splitAmount: 1000 },
        { userId: me.id, splitAmount: 1000 },
      ],
    });

    // Enable simplifyDebts → perfect circular loop cancels to zero
    const freshGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: true,
      version: freshGroup.version,
    });

    const simplified = await apiClient.getSettlementSuggestions(group.id);
    expect(simplified.length).toBe(0);

    // Disable simplifyDebts → should show 3 debts totaling $30
    const updatedGroup = await apiClient.getGroup(group.id);
    await apiClient.updateGroup(group.id, {
      simplifyDebts: false,
      version: updatedGroup.version,
    });

    const unsimplified = await apiClient.getSettlementSuggestions(group.id);
    expect(unsimplified.length).toBe(3);
    const totalCents = unsimplified.reduce((sum, s) => sum + s.amount, 0);
    expect(totalCents).toBe(3000);
  });
});
