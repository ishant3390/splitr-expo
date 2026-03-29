/**
 * Multi-user Playwright fixture for dev sanity tests.
 *
 * User A: authenticates in browser (UI + API)
 * User B: authenticates via temporary browser context → API-only
 *
 * Both users get auto-cleanup via ApiClient.cleanup().
 */

import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import { test as base, expect, Browser, Page } from "@playwright/test";
import { ApiClient } from "../../integration/helpers/api-client";

// ---- Helpers (reused from integration cleanup.ts) ----

async function getClerkToken(page: Page): Promise<string> {
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

async function markOnboardingComplete(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem("@splitr/onboarding_complete", "true");
  });
}

async function skipOnboardingIfPresent(page: Page) {
  const hasOnboarding = await page
    .getByText("Welcome to Splitr")
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (hasOnboarding) {
    await markOnboardingComplete(page);
    await page.reload();
    await page.waitForTimeout(3000);
    const stillOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (stillOnboarding) {
      const skipBtn = page.getByText("Skip").first();
      await skipBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Authenticate a user in a temporary browser context and extract a Clerk session token.
 * The browser context is closed after token extraction — the token is used for API-only calls.
 */
async function getApiTokenForUser(
  browser: Browser,
  email: string,
  baseURL: string
): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await setupClerkTestingToken({ page });
    await page.goto(baseURL, { waitUntil: "commit" });
    await markOnboardingComplete(page);
    await page.goto(baseURL);
    await clerk.loaded({ page });
    await clerk.signIn({ page, emailAddress: email });
    await page.waitForURL("**/", { timeout: 20000 });
    await page.waitForTimeout(3000);
    await skipOnboardingIfPresent(page);

    const token = await getClerkToken(page);
    return token;
  } finally {
    await context.close();
  }
}

// ---- Helpers ----

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in .env.local for dev sanity tests`);
  }
  return value;
}

/** Check if the dev backend is reachable. Call in beforeEach to skip gracefully. */
let _backendHealthy: boolean | null = null;
export async function checkBackendHealth(): Promise<boolean> {
  if (_backendHealthy !== null) return _backendHealthy;
  _backendHealthy = await ApiClient.isBackendHealthy();
  return _backendHealthy;
}

// ---- Fixture ----

export const test = base.extend<{
  userAClient: ApiClient;
  userBClient: ApiClient;
}>({
  page: async ({ page }, use) => {
    const email = requireEnv("E2E_SANITY_USER_A_EMAIL");

    await setupClerkTestingToken({ page });
    await page.goto("/", { waitUntil: "commit" });
    await markOnboardingComplete(page);
    await page.goto("/");
    await clerk.loaded({ page });
    await clerk.signIn({ page, emailAddress: email });
    await page.waitForURL("**/", { timeout: 20000 });
    await page.waitForTimeout(3000);
    await skipOnboardingIfPresent(page);
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 20000 });

    await use(page);
  },

  userAClient: async ({ page }, use) => {
    const token = await getClerkToken(page);
    const client = new ApiClient(token);
    await use(client);
    await client.cleanup();
  },

  userBClient: async ({ browser, baseURL }, use) => {
    const email = requireEnv("E2E_SANITY_USER_B_EMAIL");
    const url = baseURL || "https://dev.splitr.ai";
    const token = await getApiTokenForUser(browser, email, url);
    const client = new ApiClient(token);
    await use(client);
    await client.cleanup();
  },
});

export { expect };
