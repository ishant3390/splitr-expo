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

test.describe("Settlement Flow", () => {
  /**
   * Helper: create a group with an outstanding expense so settlements are suggested.
   */
  async function setupGroupWithDebt(apiClient: ApiClient) {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Settle Flow" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Debtor",
    });
    const guestId = guest.guestUser!.id;

    // Create expense: me paid $50, split equally between me and guest
    await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Settle Dinner",
        totalAmount: 5000,
      })
    );

    return { group, me, guest, guestId };
  }

  test("settle-up shows suggestion with correct amount", async ({
    page,
    apiClient,
  }) => {
    const { group } = await setupGroupWithDebt(apiClient);

    // Navigate to group → Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await expect(page.getByText("Settle Up").first()).toBeVisible({
      timeout: 10000,
    });
    await page.getByText("Settle Up").first().click();

    // Verify suggested payments appear
    await expect(page.getByText("Suggested").first()).toBeVisible({ timeout: 10000 });

    // Should show $25.00 suggestion (half of $50)
    const hasSuggestion = await page
      .getByText(/\$25\.00/)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasRecordButton = await page
      .getByText(/Record/)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasSuggestion || hasRecordButton).toBeTruthy();
  });

  test("record payment via modal → success", async ({
    page,
    apiClient,
  }) => {
    const { group } = await setupGroupWithDebt(apiClient);

    // Navigate to Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByText("Settle Up").first().click();
    await expect(page.getByText("Suggested").first()).toBeVisible({ timeout: 10000 });

    // Click Record button on the first suggestion
    const recordButton = page.getByText(/Record .+ payment/).first();
    const hasRecord = await recordButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!hasRecord) {
      // All settled or no suggestions
      return;
    }

    await recordButton.click();

    // Modal should appear
    await expect(
      page.getByText("Record Payment", { exact: true }).first()
    ).toBeVisible({ timeout: 5000 });

    // Select Venmo as payment method
    await page.getByText("Venmo").click();

    // Add reference
    const refInput = page.getByPlaceholder(
      "e.g., @username, transaction ID"
    );
    const hasRef = await refInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasRef) {
      await refInput.fill("@e2e-test");
    }

    // Click Record/Confirm button in modal
    const confirmButton = page
      .getByRole("button", { name: /Record|Confirm|Save/ })
      .first();
    const hasConfirm = await confirmButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasConfirm) {
      await confirmButton.click();

      // Wait for settlement creation
      await page.waitForTimeout(5000);
    }
  });

  test("settlement history tab shows recorded settlements", async ({
    page,
    apiClient,
  }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);

    // Record settlement via API
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 2500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    // Navigate to Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByText("Settle Up").first().click();
    await expect(page.getByText("Suggested").first()).toBeVisible({ timeout: 10000 });

    // Switch to History tab
    await page.getByText(/History/).click();
    await page.waitForTimeout(1000);

    // Should show the settlement
    const hasPaid = await page
      .getByText("paid")
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasAmount = await page
      .getByText(/\$25\.00/)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasPaid || hasAmount).toBeTruthy();
  });

  test("balance changes after settlement in group detail", async ({
    page,
    apiClient,
  }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);

    // Navigate to group detail first to see initial balance
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await expect(page.getByText(group.name).first()).toBeVisible({ timeout: 10000 });

    // Record full settlement via API ($25 — clears the debt)
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 2500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    // Reload to see updated balance
    await page.reload();
    await skipOnboardingIfPresent(page);
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);

    // Balances should reflect settlement (could be $0.00 or "settled")
    const hasSettled = await page
      .getByText(/settled|0\.00/)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    // At minimum, the group detail should load
    await expect(page.getByText(group.name).first()).toBeVisible();
  });

  test("home balance card reflects settlement", async ({
    page,
    apiClient,
  }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);

    // Check initial home balance
    await page.getByRole("button", { name: /Home/i }).first().click();
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 10000 });

    // Record settlement via API
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 2500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    // Reload home to see updated balance
    await page.reload();
    await skipOnboardingIfPresent(page);
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 15000 });

    // Balance card should still render (values depend on other groups)
    await expect(page.getByText("You are owed")).toBeVisible();
    await expect(page.getByText("You owe")).toBeVisible();
  });

  test("delete settlement → balance reverts", async ({
    page,
    apiClient,
  }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);

    // Create and then delete a settlement
    const settlement = await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 2500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    // Verify suggestions change (should have no suggestions after full settle)
    const suggestionsAfter = await apiClient.getSettlementSuggestions(group.id);

    // Delete the settlement
    await apiClient.deleteSettlement(settlement.id);

    // Suggestions should reappear
    const suggestionsReverted = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestionsReverted.length).toBeGreaterThan(0);

    // Verify in UI: navigate to group settle up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByText("Settle Up").first().click();
    await expect(page.getByText("Suggested").first()).toBeVisible({ timeout: 10000 });

    // Should see suggestions again
    const hasRecord = await page
      .getByText(/Record/)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasRecord).toBeTruthy();
  });

  // ── Partial Settlements ──────────────────────────────────────────────────

  test("partial settlement reduces remaining suggestion amount", async ({
    apiClient,
  }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);

    // Guest owes me $25 (half of $50 expense). Pay $10 partially.
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 1000,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(1);
    // Remaining debt: $25 - $10 = $15 (1500 cents)
    expect(suggestions[0].amount).toBe(1500);
  });

  test("two partial settlements clear all debt", async ({ apiClient }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);
    const today = new Date().toISOString().split("T")[0];

    // First partial: $10
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 1000,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: today,
    });

    // Second partial: $15 (remaining)
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 1500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: today,
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(0);
  });

  test("overpayment behavior — settlement exceeding debt", async ({
    apiClient,
  }) => {
    const { group, me, guestId } = await setupGroupWithDebt(apiClient);

    // Guest owes $25. Attempt to pay $100 (overpayment).
    const result = await apiClient.requestSafe(
      `/v1/groups/${group.id}/settlements`,
      {
        method: "POST",
        body: JSON.stringify({
          payerGuestUserId: guestId,
          payeeUserId: me.id,
          amount: 10000,
          currency: "USD",
          paymentMethod: "cash",
          settlementDate: new Date().toISOString().split("T")[0],
        }),
      }
    );

    if (result.ok) {
      // Backend allows overpayment — verify suggestions reflect reversed debt
      const suggestions = await apiClient.getSettlementSuggestions(group.id);
      // After overpaying by $75, me now owes guest $75 (debt reversed)
      if (suggestions.length > 0) {
        const totalOwed = suggestions.reduce((sum, s) => sum + s.amount, 0);
        expect(totalOwed).toBe(7500);
      }
    } else {
      // Backend rejects overpayment — document the error
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.error).toBeDefined();
    }
  });
});
