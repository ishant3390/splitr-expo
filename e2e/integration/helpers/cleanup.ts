/**
 * Extended Playwright test fixture that provides an ApiClient
 * and auto-cleans up created resources after each test.
 */

import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import { test as base, expect } from "@playwright/test";
import { ApiClient } from "./api-client";

/**
 * Helper to get a Clerk session token from the browser context.
 */
async function getClerkToken(page: any): Promise<string> {
  const token = await page.evaluate(async () => {
    const clerkInstance = (window as any).Clerk;
    if (!clerkInstance?.session) {
      throw new Error("Clerk session not available");
    }
    return clerkInstance.session.getToken();
  });
  if (!token) throw new Error("Failed to get Clerk token");
  return token;
}

/**
 * Mark onboarding as complete via localStorage.
 * AsyncStorage on web uses window.localStorage directly with no prefix.
 */
async function markOnboardingComplete(page: any) {
  await page.evaluate(() => {
    window.localStorage.setItem("@splitr/onboarding_complete", "true");
  });
}

/**
 * Skip past onboarding if it appears after navigation/reload.
 * Sets the localStorage key and reloads to get past it.
 */
async function skipOnboardingIfPresent(page: any) {
  const hasOnboarding = await page
    .getByText("Welcome to Splitr")
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (hasOnboarding) {
    await markOnboardingComplete(page);
    await page.reload();
    await page.waitForTimeout(3000);
    // If STILL showing, recursively try once more
    const stillOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (stillOnboarding) {
      // Force click Skip as last resort
      const skipBtn = page.getByText("Skip").first();
      await skipBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
    }
  }
}

export const test = base.extend<{ apiClient: ApiClient }>({
  page: async ({ page }, use) => {
    // Inject Clerk testing token
    await setupClerkTestingToken({ page });

    // Navigate to a blank page first to set up localStorage
    await page.goto("about:blank");
    // We can't set localStorage on about:blank, so go to the app origin
    await page.goto("/", { waitUntil: "commit" });
    // Set onboarding complete BEFORE the app fully loads and checks it
    await markOnboardingComplete(page);

    // Now let the app fully load
    await page.goto("/");

    // Wait for Clerk to load
    await clerk.loaded({ page });

    // Sign in
    const email = process.env.E2E_CLERK_USER_EMAIL;
    if (!email) {
      throw new Error(
        "E2E_CLERK_USER_EMAIL is required in .env.local for integration tests"
      );
    }
    await clerk.signIn({ page, emailAddress: email });

    // Wait for navigation to complete
    await page.waitForURL("**/", { timeout: 15000 });

    // Wait for the app to fully load
    await page.waitForTimeout(3000);

    // Handle onboarding if it still appears (sign-in may re-trigger the check)
    await skipOnboardingIfPresent(page);

    // Wait for the actual Home screen
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 15000 });

    await use(page);
  },

  apiClient: async ({ page }, use) => {
    const token = await getClerkToken(page);
    const client = new ApiClient(token);
    await use(client);
    await client.cleanup();
  },
});

export { expect, skipOnboardingIfPresent };
