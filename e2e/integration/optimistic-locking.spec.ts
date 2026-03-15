/**
 * Integration tests for optimistic locking / concurrency control.
 *
 * The backend uses a `version` field on expenses (and settlements) to prevent
 * lost updates. These tests verify that concurrent updates with the same version
 * result in exactly one winner, and that stale versions are rejected.
 */

import { test, expect } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import { fixtures } from "./helpers/fixtures";

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

test.describe("Optimistic Locking", () => {
  /**
   * Helper: create a group with a single expense for concurrency testing.
   */
  async function setupExpenseForLocking(apiClient: ApiClient) {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Locking Test" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Lock Guest",
    });
    const guestId = guest.guestUser!.id;

    const expense = await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Original Expense",
        totalAmount: 5000,
      })
    );

    return { group, me, guestId, expense };
  }

  test("concurrent expense updates with same version — one succeeds, one fails", async ({
    apiClient,
  }) => {
    const { group, me, guestId, expense } =
      await setupExpenseForLocking(apiClient);

    // Get the current version
    const current = await apiClient.getExpense(expense.id);
    const version = current.version!;

    const updatePayload = (desc: string) =>
      JSON.stringify({
        description: `[E2E] ${desc}`,
        totalAmount: 5000,
        currency: "USD",
        expenseDate: new Date().toISOString().split("T")[0],
        splitType: "EQUAL",
        payers: [{ userId: me.id, amountPaid: 5000 }],
        splits: [
          { userId: me.id, splitAmount: 2500 },
          { guestUserId: guestId, splitAmount: 2500 },
        ],
        version,
      });

    // Fire both updates concurrently with the SAME version
    const [result1, result2] = await Promise.all([
      apiClient.requestSafe(`/v1/expenses/${expense.id}`, {
        method: "PUT",
        body: updatePayload("Concurrent A"),
      }),
      apiClient.requestSafe(`/v1/expenses/${expense.id}`, {
        method: "PUT",
        body: updatePayload("Concurrent B"),
      }),
    ]);

    const successes = [result1, result2].filter((r) => r.ok);
    const failures = [result1, result2].filter((r) => !r.ok);

    // Exactly one should succeed, one should fail
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // The failing one should be 400 or 409 (conflict / stale version)
    expect(failures[0].status).toBeGreaterThanOrEqual(400);

    // Verify the winning update persisted
    const final = await apiClient.getExpense(expense.id);
    const winnerDesc = successes[0].data
      ? (successes[0].data as any).description
      : undefined;
    if (winnerDesc) {
      expect(final.description).toBe(winnerDesc);
    }
  });

  test("sequential updates with correct version succeed", async ({
    apiClient,
  }) => {
    const { group, me, guestId, expense } =
      await setupExpenseForLocking(apiClient);

    // First update: v1 → v2
    const v1 = await apiClient.getExpense(expense.id);
    const updated1 = await apiClient.updateExpense(expense.id, {
      description: "[E2E] Sequential V2",
      totalAmount: 5000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: me.id, amountPaid: 5000 }],
      splits: [
        { userId: me.id, splitAmount: 2500 },
        { guestUserId: guestId, splitAmount: 2500 },
      ],
      version: v1.version!,
    });
    expect(updated1.description).toBe("[E2E] Sequential V2");

    // Second update: v2 → v3
    const v2 = await apiClient.getExpense(expense.id);
    expect(v2.version).toBeGreaterThan(v1.version!);

    const updated2 = await apiClient.updateExpense(expense.id, {
      description: "[E2E] Sequential V3",
      totalAmount: 5000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: me.id, amountPaid: 5000 }],
      splits: [
        { userId: me.id, splitAmount: 2500 },
        { guestUserId: guestId, splitAmount: 2500 },
      ],
      version: v2.version!,
    });
    expect(updated2.description).toBe("[E2E] Sequential V3");
  });

  test("update with stale version fails", async ({ apiClient }) => {
    const { group, me, guestId, expense } =
      await setupExpenseForLocking(apiClient);

    const original = await apiClient.getExpense(expense.id);
    const staleVersion = original.version!;

    // Advance the version: v1 → v2
    await apiClient.updateExpense(expense.id, {
      description: "[E2E] Advanced Version",
      totalAmount: 5000,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: me.id, amountPaid: 5000 }],
      splits: [
        { userId: me.id, splitAmount: 2500 },
        { guestUserId: guestId, splitAmount: 2500 },
      ],
      version: staleVersion,
    });

    // Attempt update with the now-stale version → should fail
    const staleResult = await apiClient.requestSafe(
      `/v1/expenses/${expense.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          description: "[E2E] Stale Update",
          totalAmount: 5000,
          currency: "USD",
          expenseDate: new Date().toISOString().split("T")[0],
          splitType: "EQUAL",
          payers: [{ userId: me.id, amountPaid: 5000 }],
          splits: [
            { userId: me.id, splitAmount: 2500 },
            { guestUserId: guestId, splitAmount: 2500 },
          ],
          version: staleVersion,
        }),
      }
    );

    expect(staleResult.ok).toBe(false);
    expect(staleResult.status).toBeGreaterThanOrEqual(400);

    // Data should be unchanged from the successful update
    const final = await apiClient.getExpense(expense.id);
    expect(final.description).toBe("[E2E] Advanced Version");
  });
});
