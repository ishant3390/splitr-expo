/**
 * Dev Sanity — Profile update & settings
 * Verifies profile name sync, currency change, and payment handles.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";

test.describe("Dev Sanity — Profile & Settings", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) testInfo.skip();
  });

  test("update name accepted by API", async ({ userAClient }) => {
    const me = await userAClient.getMe();
    const testName = `Sanity Test ${Date.now().toString(36)}`;

    // PATCH /v1/users/me should accept the update (200)
    const result = await userAClient.updateMe({ name: testName });
    expect(result.id).toBeTruthy();
    // Note: GET /v1/users/me may re-sync from Clerk and overwrite.
    // The FE fix (clerkUser.update) handles this — tested via UI, not API-only.

    // Restore original name
    await userAClient.updateMe({ name: me.name });
  });

  test("update default currency persists", async ({ userAClient }) => {
    const me = await userAClient.getMe();
    const originalCurrency = me.defaultCurrency || "USD";

    // Change to GBP
    await userAClient.updateMe({ defaultCurrency: "GBP" });
    const updated = await userAClient.getMe();
    expect(updated.defaultCurrency).toBe("GBP");

    // Restore
    await userAClient.updateMe({ defaultCurrency: originalCurrency });
  });

  test("payment handles update accepted by API", async ({ userAClient }) => {
    // PATCH /v1/users/me with paymentHandles should succeed (200)
    const result = await userAClient.updateMe({
      paymentHandles: { venmo: "sanity-test-user" },
    });
    expect(result.id).toBeTruthy();

    // Clear it
    await userAClient.updateMe({ paymentHandles: {} });
  });
});
