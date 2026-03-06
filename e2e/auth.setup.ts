/**
 * Clerk Auth Setup for Playwright E2E Tests
 *
 * SETUP STEPS (one-time):
 * 1. Go to Clerk Dashboard > API Keys
 * 2. Copy your "Secret key" (starts with sk_test_...)
 * 3. Add to .env.local:
 *      CLERK_SECRET_KEY=sk_test_...
 *      E2E_CLERK_USER_EMAIL=your-test-user@example.com
 * 4. The test user must already exist in your Clerk instance
 *
 * HOW IT WORKS:
 * - clerkSetup() runs in globalSetup — fetches a testing token from Clerk API
 * - setupClerkTestingToken() injects the token to bypass bot protection
 * - clerk.signIn() uses the backend API to create a sign-in token and
 *   authenticates via window.Clerk (ticket strategy) — no password needed
 */

import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    // Inject Clerk testing token to bypass bot/captcha protection
    await setupClerkTestingToken({ page });

    // Navigate to app so Clerk SDK loads
    await page.goto("/");

    // Wait for Clerk to be loaded in the browser
    await clerk.loaded({ page });

    // Sign in using sign-in token (ticket strategy via backend API)
    // No password needed — uses CLERK_SECRET_KEY to generate a token
    const email = process.env.E2E_CLERK_USER_EMAIL;
    if (!email) {
      throw new Error(
        "E2E_CLERK_USER_EMAIL is required in .env.local for authenticated tests"
      );
    }
    await clerk.signIn({ page, emailAddress: email });

    // Wait for navigation to complete after sign-in
    await page.waitForURL("**/", { timeout: 10000 });

    await use(page);
  },
});

export { expect };
