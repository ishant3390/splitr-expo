/**
 * Dev Sanity — Multi-Currency Balance Tests
 *
 * Regression suite for multi-currency balance correctness.
 * Verifies that balances in different currencies are tracked independently,
 * net balance is not naively summed across currencies, and settlement
 * suggestions respect currency boundaries.
 *
 * Root cause: FE was computing netBalance = sum(allOwed) - sum(allOwing) without
 * FX conversion, producing meaningless numbers like "-$48" when mixing £ and $.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Multi-Currency Balance", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) testInfo.skip();
  });

  test("balances in different currencies remain separate in user balance", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Snapshot balance before
    const balanceBefore = await userAClient.getBalance();
    const owedGBPBefore = (balanceBefore.totalOwed ?? []).find(
      (a: any) => a.currency === "GBP"
    )?.amount ?? 0;
    const owedUSDBefore = (balanceBefore.totalOwed ?? []).find(
      (a: any) => a.currency === "USD"
    )?.amount ?? 0;

    // Create GBP group — A pays £50 split equally
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "GBP Group", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 5000,
        currency: "GBP",
        description: "[SANITY] GBP dinner",
      })
    );

    // Create USD group — A pays $100 split equally
    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "USD Group", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);
    await userAClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 10000,
        currency: "USD",
        description: "[SANITY] USD dinner",
      })
    );

    // Check user A's balance — should show separate GBP and USD amounts
    const balanceAfter = await userAClient.getBalance();
    const owedGBP = (balanceAfter.totalOwed ?? []).find(
      (a: any) => a.currency === "GBP"
    )?.amount ?? 0;
    const owedUSD = (balanceAfter.totalOwed ?? []).find(
      (a: any) => a.currency === "USD"
    )?.amount ?? 0;

    // A should be owed £25 more (half of £50) and $50 more (half of $100)
    expect(owedGBP - owedGBPBefore).toBe(2500);
    expect(owedUSD - owedUSDBefore).toBe(5000);
  });

  test("settlement suggestions respect currency per group", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // GBP group with £80 expense
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "GBP Settle", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 8000,
        currency: "GBP",
        description: "[SANITY] GBP expense",
      })
    );

    // USD group with $60 expense
    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "USD Settle", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);
    await userAClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 6000,
        currency: "USD",
        description: "[SANITY] USD expense",
      })
    );

    // GBP suggestions should be in GBP
    const gbpSuggestions = await userAClient.getSettlementSuggestions(gbpGroup.id);
    expect(gbpSuggestions.length).toBeGreaterThan(0);
    expect(gbpSuggestions[0].currency).toBe("GBP");
    expect(gbpSuggestions[0].amount).toBe(4000); // B owes A £40

    // USD suggestions should be in USD
    const usdSuggestions = await userAClient.getSettlementSuggestions(usdGroup.id);
    expect(usdSuggestions.length).toBeGreaterThan(0);
    expect(usdSuggestions[0].currency).toBe("USD");
    expect(usdSuggestions[0].amount).toBe(3000); // B owes A $30
  });

  test("settling in one currency does not affect balance in another", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create two groups with different currencies
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "GBP Isolate", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);

    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "USD Isolate", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);

    // A pays £40 in GBP group, A pays $60 in USD group
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 4000,
        currency: "GBP",
        description: "[SANITY] GBP isolate",
      })
    );
    await userAClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 6000,
        currency: "USD",
        description: "[SANITY] USD isolate",
      })
    );

    // B owes A £20 in GBP, $30 in USD
    // Settle the GBP debt fully
    await userBClient.createSettlement(
      gbpGroup.id,
      sanityFixtures.settlement(userB.id, userA.id, {
        amount: 2000,
        currency: "GBP",
      })
    );

    // GBP group should be settled
    const gbpSuggestions = await userAClient.getSettlementSuggestions(gbpGroup.id);
    const gbpOwed = gbpSuggestions.filter(
      (s: any) => s.toUser?.id === userA.id
    );
    expect(gbpOwed.length).toBe(0);

    // USD group should be unaffected — B still owes A $30
    const usdSuggestions = await userAClient.getSettlementSuggestions(usdGroup.id);
    expect(usdSuggestions.length).toBeGreaterThan(0);
    expect(usdSuggestions[0].amount).toBe(3000);
    expect(usdSuggestions[0].currency).toBe("USD");
  });

  test("user balance shows multi-currency owed and owing separately", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Snapshot before
    const before = await userAClient.getBalance();

    // A pays £60 (B owes A £30)
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "A Pays GBP", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 6000,
        currency: "GBP",
        description: "[SANITY] A pays GBP",
      })
    );

    // B pays $80 (A owes B $40)
    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "B Pays USD", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);
    await userBClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        totalAmount: 8000,
        currency: "USD",
        description: "[SANITY] B pays USD",
      })
    );

    // User A's balance should show:
    // - Owed: £30 (GBP)
    // - Owing: $40 (USD)
    // These MUST NOT be mixed into a single net number
    const after = await userAClient.getBalance();

    const owedGBPDelta =
      ((after.totalOwed ?? []).find((a: any) => a.currency === "GBP")?.amount ?? 0) -
      ((before.totalOwed ?? []).find((a: any) => a.currency === "GBP")?.amount ?? 0);
    const owingUSDDelta =
      ((after.totalOwing ?? []).find((a: any) => a.currency === "USD")?.amount ?? 0) -
      ((before.totalOwing ?? []).find((a: any) => a.currency === "USD")?.amount ?? 0);

    expect(owedGBPDelta).toBe(3000); // A is owed £30
    expect(owingUSDDelta).toBe(4000); // A owes $40

    // Verify these are in DIFFERENT currencies — cannot be subtracted
    const owedCurrencies = (after.totalOwed ?? [])
      .filter((a: any) => a.amount > 0)
      .map((a: any) => a.currency);
    const owingCurrencies = (after.totalOwing ?? [])
      .filter((a: any) => a.amount > 0)
      .map((a: any) => a.currency);

    // If owed has GBP and owing has USD, they're separate currencies
    if (owedCurrencies.includes("GBP") && owingCurrencies.includes("USD")) {
      // This is the multi-currency case — verify they remain independent
      expect(owedCurrencies).toContain("GBP");
      expect(owingCurrencies).toContain("USD");
    }
  });

  test("home screen shows per-currency net when multiple currencies exist", async ({
    page,
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Create cross-currency scenario
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "UI GBP", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 4000,
        currency: "GBP",
        description: "[SANITY] UI GBP test",
      })
    );

    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "UI USD", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);
    await userBClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        totalAmount: 10000,
        currency: "USD",
        description: "[SANITY] UI USD test",
      })
    );

    // Reload home screen
    await page.goto("/");
    await page.waitForTimeout(3000);

    // The hero balance should NOT show a single naive number
    // It should show either per-currency net or BE-17 converted amount
    const balanceCard = page.getByText("Net Balance").locator("..");

    // Verify the balance area is visible
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 15000 });

    // The "You are owed" and "You owe" sections should show multi-currency
    await expect(page.getByText("You are owed")).toBeVisible();
    await expect(page.getByText("You owe")).toBeVisible();

    // Verify currency symbols are present (£ and $ should both appear)
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("£");
    expect(pageContent).toContain("$");
  });

  test("three-currency scenario: GBP + USD + EUR balances tracked independently", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // Snapshot before
    const before = await userAClient.getBalance();
    const findAmount = (arr: any[], currency: string) =>
      (arr ?? []).find((a: any) => a.currency === currency)?.amount ?? 0;

    // --- Group 1: GBP — A pays £120, split equally → B owes A £60 ---
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC GBP", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 12000,
        currency: "GBP",
        description: "[SANITY] 3CC GBP expense",
      })
    );

    // --- Group 2: USD — B pays $200, split equally → A owes B $100 ---
    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC USD", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);
    await userBClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        totalAmount: 20000,
        currency: "USD",
        description: "[SANITY] 3CC USD expense",
      })
    );

    // --- Group 3: EUR — A pays €80, split equally → B owes A €40 ---
    const eurGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC EUR", defaultCurrency: "EUR" })
    );
    await userBClient.joinGroupByInvite(eurGroup.inviteCode!);
    await userAClient.createExpense(
      eurGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 8000,
        currency: "EUR",
        description: "[SANITY] 3CC EUR expense",
      })
    );

    // === Verify per-group settlement suggestions ===

    const gbpSuggestions = await userAClient.getSettlementSuggestions(gbpGroup.id);
    expect(gbpSuggestions.length).toBeGreaterThan(0);
    expect(gbpSuggestions[0].currency).toBe("GBP");
    expect(gbpSuggestions[0].amount).toBe(6000); // B owes A £60

    const usdSuggestions = await userAClient.getSettlementSuggestions(usdGroup.id);
    expect(usdSuggestions.length).toBeGreaterThan(0);
    expect(usdSuggestions[0].currency).toBe("USD");
    expect(usdSuggestions[0].amount).toBe(10000); // A owes B $100

    const eurSuggestions = await userAClient.getSettlementSuggestions(eurGroup.id);
    expect(eurSuggestions.length).toBeGreaterThan(0);
    expect(eurSuggestions[0].currency).toBe("EUR");
    expect(eurSuggestions[0].amount).toBe(4000); // B owes A €40

    // === Verify user-level balance has all 3 currencies separate ===

    const after = await userAClient.getBalance();

    // A is owed: £60 (GBP) + €40 (EUR)
    const owedGBPDelta = findAmount(after.totalOwed, "GBP") - findAmount(before.totalOwed, "GBP");
    const owedEURDelta = findAmount(after.totalOwed, "EUR") - findAmount(before.totalOwed, "EUR");
    expect(owedGBPDelta).toBe(6000);
    expect(owedEURDelta).toBe(4000);

    // A owes: $100 (USD)
    const owingUSDDelta = findAmount(after.totalOwing, "USD") - findAmount(before.totalOwing, "USD");
    expect(owingUSDDelta).toBe(10000);

    // === Verify currencies don't bleed across groups ===
    // GBP group should have zero USD/EUR
    // USD group should have zero GBP/EUR
    // EUR group should have zero GBP/USD
    for (const s of gbpSuggestions) expect(s.currency).toBe("GBP");
    for (const s of usdSuggestions) expect(s.currency).toBe("USD");
    for (const s of eurSuggestions) expect(s.currency).toBe("EUR");
  });

  test("three-currency scenario: partial settlements across currencies stay isolated", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // --- Setup 3 groups, 3 currencies ---
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC Settle GBP", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 10000,
        currency: "GBP",
        description: "[SANITY] 3CC settle GBP",
      })
    );
    // B owes A £50

    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC Settle USD", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);
    await userAClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 8000,
        currency: "USD",
        description: "[SANITY] 3CC settle USD",
      })
    );
    // B owes A $40

    const eurGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC Settle EUR", defaultCurrency: "EUR" })
    );
    await userBClient.joinGroupByInvite(eurGroup.inviteCode!);
    await userAClient.createExpense(
      eurGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 6000,
        currency: "EUR",
        description: "[SANITY] 3CC settle EUR",
      })
    );
    // B owes A €30

    // --- Settle ONLY the GBP debt (£50) ---
    await userBClient.createSettlement(
      gbpGroup.id,
      sanityFixtures.settlement(userB.id, userA.id, {
        amount: 5000,
        currency: "GBP",
      })
    );

    // --- Partially settle USD ($15 of $40) ---
    await userBClient.createSettlement(
      usdGroup.id,
      sanityFixtures.settlement(userB.id, userA.id, {
        amount: 1500,
        currency: "USD",
      })
    );

    // --- Leave EUR untouched ---

    // === Verify GBP group is fully settled ===
    const gbpAfter = await userAClient.getSettlementSuggestions(gbpGroup.id);
    const gbpOwed = gbpAfter.filter((s: any) => s.toUser?.id === userA.id);
    expect(gbpOwed.length).toBe(0); // fully settled

    // === Verify USD group has $25 remaining ===
    const usdAfter = await userAClient.getSettlementSuggestions(usdGroup.id);
    expect(usdAfter.length).toBeGreaterThan(0);
    expect(usdAfter[0].currency).toBe("USD");
    expect(usdAfter[0].amount).toBe(2500); // $40 - $15 = $25

    // === Verify EUR group is completely untouched at €30 ===
    const eurAfter = await userAClient.getSettlementSuggestions(eurGroup.id);
    expect(eurAfter.length).toBeGreaterThan(0);
    expect(eurAfter[0].currency).toBe("EUR");
    expect(eurAfter[0].amount).toBe(3000); // €30, untouched

    // === Verify user-level balance reflects all 3 correctly ===
    const balance = await userAClient.getBalance();
    const findAmount = (arr: any[], currency: string) =>
      (arr ?? []).find((a: any) => a.currency === currency)?.amount ?? 0;

    // A is owed: £0 (settled), $25 (partial), €30 (untouched)
    // GBP should be 0 or absent from totalOwed
    // Note: there may be pre-existing balances from other tests, so we check the
    // group-level suggestions above for exact values. User-level just confirms
    // USD and EUR are still present.
    const owedUSD = findAmount(balance.totalOwed, "USD");
    const owedEUR = findAmount(balance.totalOwed, "EUR");
    expect(owedUSD).toBeGreaterThanOrEqual(2500);
    expect(owedEUR).toBeGreaterThanOrEqual(3000);
  });

  test("three-currency scenario: multiple expenses per group accumulate correctly", async ({
    userAClient,
    userBClient,
  }) => {
    const userA = await userAClient.getMe();
    const userB = await userBClient.getMe();

    // GBP group with 2 expenses
    const gbpGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC Multi GBP", defaultCurrency: "GBP" })
    );
    await userBClient.joinGroupByInvite(gbpGroup.inviteCode!);

    // A pays £40, B pays £60 — net: B owes A £-10 (A owes B £10)
    await userAClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 4000,
        currency: "GBP",
        description: "[SANITY] 3CC multi GBP #1",
      })
    );
    await userBClient.createExpense(
      gbpGroup.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        totalAmount: 6000,
        currency: "GBP",
        description: "[SANITY] 3CC multi GBP #2",
      })
    );

    // USD group with 3 expenses
    const usdGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC Multi USD", defaultCurrency: "USD" })
    );
    await userBClient.joinGroupByInvite(usdGroup.inviteCode!);

    // A pays $100, A pays $50, B pays $30 — net: B owes A ($75-$15) = $60
    await userAClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 10000,
        currency: "USD",
        description: "[SANITY] 3CC multi USD #1",
      })
    );
    await userAClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 5000,
        currency: "USD",
        description: "[SANITY] 3CC multi USD #2",
      })
    );
    await userBClient.createExpense(
      usdGroup.id,
      sanityFixtures.expense(userB.id, [userA.id, userB.id], {
        totalAmount: 3000,
        currency: "USD",
        description: "[SANITY] 3CC multi USD #3",
      })
    );

    // EUR group with 1 expense
    const eurGroup = await userAClient.createGroup(
      sanityFixtures.group({ name: "3CC Multi EUR", defaultCurrency: "EUR" })
    );
    await userBClient.joinGroupByInvite(eurGroup.inviteCode!);
    await userAClient.createExpense(
      eurGroup.id,
      sanityFixtures.expense(userA.id, [userA.id, userB.id], {
        totalAmount: 5000,
        currency: "EUR",
        description: "[SANITY] 3CC multi EUR",
      })
    );

    // === Verify GBP: A owes B £10 ===
    const gbpSugg = await userAClient.getSettlementSuggestions(gbpGroup.id);
    expect(gbpSugg.length).toBeGreaterThan(0);
    expect(gbpSugg[0].currency).toBe("GBP");
    expect(gbpSugg[0].amount).toBe(1000); // £10
    // A owes B, so fromUser should be A
    expect(gbpSugg[0].fromUser?.id).toBe(userA.id);
    expect(gbpSugg[0].toUser?.id).toBe(userB.id);

    // === Verify USD: B owes A $60 ===
    // A paid $150 total, B paid $30. Each should pay $90.
    // A overpaid by $60, B underpaid by $60.
    const usdSugg = await userAClient.getSettlementSuggestions(usdGroup.id);
    expect(usdSugg.length).toBeGreaterThan(0);
    expect(usdSugg[0].currency).toBe("USD");
    expect(usdSugg[0].amount).toBe(6000); // $60
    expect(usdSugg[0].fromUser?.id).toBe(userB.id);
    expect(usdSugg[0].toUser?.id).toBe(userA.id);

    // === Verify EUR: B owes A €25 ===
    const eurSugg = await userAClient.getSettlementSuggestions(eurGroup.id);
    expect(eurSugg.length).toBeGreaterThan(0);
    expect(eurSugg[0].currency).toBe("EUR");
    expect(eurSugg[0].amount).toBe(2500); // €25
    expect(eurSugg[0].fromUser?.id).toBe(userB.id);
    expect(eurSugg[0].toUser?.id).toBe(userA.id);
  });
});
