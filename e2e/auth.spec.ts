import { test as base, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

// These tests run WITHOUT signing in to verify the auth screen renders correctly.
// We still need setupClerkTestingToken to bypass bot protection.

base.describe("Auth Screen (unauthenticated)", () => {
  base.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  base("shows login page with branding", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Split expenses effortlessly")).toBeVisible();
  });

  base("auth screen shows social login buttons", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sign up with Google")).toBeVisible();
    await expect(page.getByText("Sign up with Apple")).toBeVisible();
    await expect(page.getByText("Sign up with Facebook")).toBeVisible();
    await expect(page.getByText("Sign up with Instagram")).toBeVisible();
  });

  base("shows Sign Up and Sign In tabs", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sign Up", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sign In", { exact: true }).first()).toBeVisible();
  });

  base("shows email/phone signup button on Sign Up tab", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("Sign up with email or phone")
    ).toBeVisible();
  });

  base("can switch to Sign In tab", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 15000 });

    // Click Sign In tab (exact match to avoid matching "Sign in with Google" etc.)
    await page.getByText("Sign In", { exact: true }).first().click();

    // Sign In tab shows email input and send code button
    await expect(
      page.getByText("Send verification code")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Email address or phone number")
    ).toBeVisible();
  });

  base("social buttons change text on Sign In tab", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Splitr")).toBeVisible({ timeout: 15000 });

    // Switch to Sign In
    await page.getByText("Sign In", { exact: true }).first().click();

    // Buttons should now say "Sign in with..."
    await expect(page.getByText("Sign in with Google")).toBeVisible();
    await expect(page.getByText("Sign in with Apple")).toBeVisible();
  });
});
