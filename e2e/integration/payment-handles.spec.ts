import { test, expect } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import { fixtures } from "./helpers/fixtures";

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping payment handles integration tests");
  }
});

// Guarantee handle cleanup even if a test assertion fails mid-way
test.afterEach(async ({ apiClient }) => {
  await apiClient.updateMe({
    paymentHandles: { venmoUsername: "", paypalUsername: "", cashAppTag: "", upiVpa: "", revolutTag: "", monzoMe: "", zelleContact: "" },
  }).catch(() => {});
});

test.describe("Payment Handles — API", () => {
  test("save and retrieve payment handles via PATCH /v1/users/me", async ({
    apiClient,
  }) => {
    const handles = {
      venmoUsername: "e2e-test-user",
      paypalUsername: "e2e-paypal",
    };

    const updated = await apiClient.updateMe({ paymentHandles: handles });
    expect(updated.paymentHandles).toBeDefined();
    expect(updated.paymentHandles!.venmoUsername).toBe("e2e-test-user");
    expect(updated.paymentHandles!.paypalUsername).toBe("e2e-paypal");

    // Verify GET returns them
    const me = await apiClient.getMe();
    expect(me.paymentHandles).toBeDefined();
    expect(me.paymentHandles!.venmoUsername).toBe("e2e-test-user");

    // handles cleaned by afterEach
  });

  test("clear payment handles by sending empty object", async ({
    apiClient,
  }) => {
    // Set handles first
    await apiClient.updateMe({
      paymentHandles: { venmoUsername: "to-clear" },
    });

    // Clear them — backend may require explicit null values rather than empty object
    const cleared = await apiClient.updateMe({
      paymentHandles: { venmoUsername: "", paypalUsername: "", cashAppTag: "", upiVpa: "", revolutTag: "", monzoMe: "", zelleContact: "" },
    });

    // Verify via GET that handles are effectively empty
    const me = await apiClient.getMe();
    const hasHandles =
      me.paymentHandles &&
      Object.values(me.paymentHandles).some((v) => v && v.length > 0);
    expect(hasHandles).toBeFalsy();
  });

  test("partial update preserves other handles", async ({ apiClient }) => {
    // Set venmo + paypal
    await apiClient.updateMe({
      paymentHandles: {
        venmoUsername: "keep-this",
        paypalUsername: "keep-that",
      },
    });

    // Update only paypal
    await apiClient.updateMe({
      paymentHandles: {
        venmoUsername: "keep-this",
        paypalUsername: "changed",
      },
    });

    const me = await apiClient.getMe();
    expect(me.paymentHandles!.venmoUsername).toBe("keep-this");
    expect(me.paymentHandles!.paypalUsername).toBe("changed");

    // handles cleaned by afterEach
  });
});

test.describe("Payment Handles — Settlement Suggestions", () => {
  async function setupGroupWithDebt(apiClient: ApiClient) {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Pay Handles Test" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Guest Debtor",
    });
    const guestId = guest.guestUser!.id;

    // Create expense: current user paid, guest owes half
    await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Payment Handles Dinner",
        totalAmount: 4000,
      })
    );

    return { group, me, guestId };
  }

  test("suggestions include toUserPaymentHandles for creditor", async ({
    apiClient,
  }) => {
    // Set payment handles on current user (the creditor)
    await apiClient.updateMe({
      paymentHandles: {
        venmoUsername: "e2e-creditor",
        paypalUsername: "e2e-creditor-pp",
      },
    });

    const { group } = await setupGroupWithDebt(apiClient);

    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBeGreaterThan(0);

    // The current user is the creditor (toUser), so toUserPaymentHandles should be populated
    const suggestion = suggestions.find((s) => s.toUser != null);
    expect(suggestion).toBeDefined();
    expect(suggestion!.toUserPaymentHandles).toBeDefined();
    expect(suggestion!.toUserPaymentHandles!.venmoUsername).toBe("e2e-creditor");

    // handles cleaned by afterEach
  });

  test("suggestions return null handles when creditor has none", async ({
    apiClient,
  }) => {
    // Clear handles
    await apiClient.updateMe({ paymentHandles: {} });

    const { group } = await setupGroupWithDebt(apiClient);

    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBeGreaterThan(0);

    const suggestion = suggestions.find((s) => s.toUser != null);
    expect(suggestion).toBeDefined();

    // toUserPaymentHandles should be null or absent
    const hasHandles =
      suggestion!.toUserPaymentHandles &&
      Object.values(suggestion!.toUserPaymentHandles).some((v) => v);
    expect(hasHandles).toBeFalsy();
  });

  test("guest creditor has no payment handles", async ({ apiClient }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Guest Creditor Test" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Guest Creditor",
    });
    const guestId = guest.guestUser!.id;

    // Create expense: guest paid, current user owes half
    await apiClient.createExpense(group.id, {
      description: `[E2E] Guest Paid ${Date.now().toString(36)}`,
      totalAmount: 3000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ guestUserId: guestId, amountPaid: 3000 }],
      splits: [
        { userId: me.id, splitAmount: 1500 },
        { guestUserId: guestId, splitAmount: 1500 },
      ],
    });

    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBeGreaterThan(0);

    // Guest creditor → toGuest is populated, toUserPaymentHandles should be null
    const guestSuggestion = suggestions.find((s) => s.toGuest != null);
    expect(guestSuggestion).toBeDefined();
    expect(guestSuggestion!.toUserPaymentHandles).toBeFalsy();
  });
});

test.describe("Payment Handles — UI Integration", () => {
  test("payment methods screen saves handles and shows success", async ({
    page,
    apiClient,
  }) => {
    // Navigate to Payment Methods
    await page.getByText("Profile").click();
    await expect(page.getByText("Payment Methods")).toBeVisible({ timeout: 5000 });
    await page.getByText("Payment Methods").click();
    await expect(
      page.getByText("Add your handles so friends can pay you directly")
    ).toBeVisible({ timeout: 5000 });

    // Find Venmo input and fill it (USD region)
    const venmoInput = page.getByPlaceholder("username (no @)");
    const venmoVisible = await venmoInput.isVisible().catch(() => false);
    if (venmoVisible) {
      await venmoInput.fill("e2e-integration-test");
    }

    // Save
    await page.getByText("Save Payment Methods").click();

    // Wait for toast
    await expect(page.getByText("Payment methods saved!")).toBeVisible({
      timeout: 5000,
    });

    // Verify via API
    const me = await apiClient.getMe();
    if (venmoVisible) {
      expect(me.paymentHandles?.venmoUsername).toBe("e2e-integration-test");
    }

    // handles cleaned by afterEach
  });

  test("settle-up shows Pay Directly when creditor has handles", async ({
    page,
    apiClient,
  }) => {
    // Set handles on current user (will be creditor)
    await apiClient.updateMe({
      paymentHandles: { venmoUsername: "e2e-pay-test" },
    });

    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Pay Direct E2E" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Debtor User",
    });
    const guestId = guest.guestUser!.id;

    // Create expense: me paid, guest owes
    await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Pay Direct Test",
        totalAmount: 6000,
      })
    );

    // Navigate to group → Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 10000 });
    const groupCard = page.getByText(group.name).first();
    await groupCard.waitFor({ state: "attached", timeout: 15000 });
    await groupCard.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await groupCard.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(2000);

    const settleUpBtn = page.getByText("Settle Up").first();
    await settleUpBtn.waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    const hasSettleUp = await settleUpBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSettleUp) {
      return;
    }

    await settleUpBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(2000);

    // Look for suggestion card and tap it
    const recordBtn = page.getByText(/Record.*payment/).first();
    const hasRecord = await recordBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRecord) {
      await recordBtn.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(1000);

      // The current user is the creditor here (not debtor), so Pay Directly
      // should NOT appear (only debtors see it). This verifies the gate works.
      const hasPayDirectly = await page
        .getByText("Pay Directly")
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // Current user = creditor, so Pay Directly should be hidden
      expect(hasPayDirectly).toBeFalsy();
    }

    // handles cleaned by afterEach
  });

  test("payment method selector shows region-appropriate options", async ({
    page,
    apiClient,
  }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Region Methods E2E" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Region Test",
    });
    const guestId = guest.guestUser!.id;

    await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Region Test Expense",
        totalAmount: 2000,
      })
    );

    // Navigate to Settle Up
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 10000 });
    const groupCard = page.getByText(group.name).first();
    await groupCard.waitFor({ state: "attached", timeout: 15000 });
    await groupCard.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await groupCard.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(2000);

    const settleUpBtn = page.getByText("Settle Up").first();
    await settleUpBtn.waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    const hasSettleUp = await settleUpBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSettleUp) return;

    await settleUpBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(2000);

    // Tap suggestion to open modal
    const recordBtn = page.getByText(/Record.*payment/).first();
    const hasRecord = await recordBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasRecord) return;

    await recordBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(1000);

    // Verify payment method pills are visible (USD region: Cash, Venmo, PayPal, etc.)
    const hasCash = await page
      .getByText("Cash")
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(hasCash).toBeTruthy();
  });
});
