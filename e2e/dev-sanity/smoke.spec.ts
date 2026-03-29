/**
 * Dev Sanity — Smoke tests
 * Quick health check: backend reachable, both users can auth, home screen loads.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";

test.describe("Dev Sanity — Smoke", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("backend API health check", async ({ userAClient }) => {
    const categories = await userAClient.listCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  test("User A — home screen loads with Net Balance", async ({ page }) => {
    // Home screen already verified by fixture, but let's assert key elements
    await expect(page.getByText("Net Balance")).toBeVisible();
  });

  test("User A — can fetch profile via API", async ({ userAClient }) => {
    const me = await userAClient.getMe();
    expect(me.id).toBeTruthy();
    expect(me.email).toBeTruthy();
  });

  test("User B — can fetch profile via API", async ({ userBClient }) => {
    const me = await userBClient.getMe();
    expect(me.id).toBeTruthy();
    expect(me.email).toBeTruthy();
  });
});
