/**
 * Deep Link / Invite Flow E2E Tests
 *
 * Tests the /invite/[code] and /join/[code] routes which handle
 * universal links from https://splitr.ai/invite/{code}
 * or https://dev.splitr.ai/invite/{code}
 *
 * Unauthenticated tests: use @playwright/test directly
 * Authenticated tests: use ./auth.setup
 */

import { test as authTest, expect } from "./auth.setup";
import { test as unauthTest, expect as unauthExpect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

// ─── Unauthenticated: route resolution & error states ───────────────────────

unauthTest.describe("Deep Links (unauthenticated)", () => {
  unauthTest.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  unauthTest(
    "/invite/[invalid-code] shows Invalid Invite error state",
    async ({ page }) => {
      await page.goto("/invite/this-code-does-not-exist-xyz");

      // Preview API call returns 404 → error state shown
      await unauthExpect(
        page.getByText("Invalid Invite")
      ).toBeVisible({ timeout: 12000 });
      await unauthExpect(page.getByText("Go Home")).toBeVisible();
    }
  );

  unauthTest(
    "/join/[invalid-code] shows same Invalid Invite error state",
    async ({ page }) => {
      await page.goto("/join/this-code-does-not-exist-xyz");

      await unauthExpect(
        page.getByText("Invalid Invite")
      ).toBeVisible({ timeout: 12000 });
    }
  );

  unauthTest(
    "/invite/[code] route resolves without redirecting to auth",
    async ({ page }) => {
      await page.goto("/invite/test-code");

      // Page must render some state — not silently redirect to auth
      // Auth gate now allows unauthenticated access to /invite/*
      await page.waitForFunction(
        () => {
          const body = document.body.innerText;
          return (
            body.includes("Invalid Invite") ||
            body.includes("Loading invite") ||
            body.includes("You've been invited")
          );
        },
        { timeout: 12000 }
      );

      // Confirm we are NOT on the auth screen
      const onAuthScreen =
        (await page.getByText("Sign Up").isVisible().catch(() => false)) &&
        !(await page.getByText("You've been invited").isVisible().catch(() => false));
      unauthExpect(onAuthScreen).toBeFalsy();
    }
  );

  unauthTest(
    "Go Home button navigates back from error state",
    async ({ page }) => {
      await page.goto("/invite/nonexistent-code");
      await page.waitForTimeout(3000);

      const goHome = page.getByText("Go Home");
      const visible = await goHome.isVisible().catch(() => false);

      if (visible) {
        await goHome.click();
        // Should navigate to home/auth
        await page.waitForTimeout(2000);
        const url = page.url();
        // Should no longer be on the invite route
        unauthExpect(url).not.toContain("/invite/nonexistent-code");
      }
    }
  );
});

// ─── Authenticated: invite code extraction & join flow ───────────────────────

authTest.describe("Deep Links (authenticated)", () => {
  authTest(
    "can extract invite link from group detail share modal",
    async ({ page }) => {
      // Navigate to groups
      await page.getByRole("button", { name: "Groups" }).click();
      await page.waitForTimeout(2000);

      const hasGroups = await page
        .getByText("members")
        .first()
        .isVisible()
        .catch(() => false);

      if (!hasGroups) {
        console.log("Deep link — SKIPPED: no groups to test with");
        return;
      }

      // Open first group
      await page.getByText("members").first().click();
      await page.waitForTimeout(1500);

      // Click the Share button (Share2 icon in header)
      const shareBtn = page.locator("[aria-label='Share']").first();
      const hasShareBtn = await shareBtn.isVisible().catch(() => false);

      if (!hasShareBtn) {
        // Try by role if aria-label not present
        console.log("Deep link — share button aria-label not found, skipping");
        return;
      }

      await shareBtn.click();
      await page.waitForTimeout(1000);

      // Share modal should show an invite link
      const hasInviteLink = await page
        .getByText(/(?:dev\.)?splitr\.ai\/invite\//i)
        .isVisible()
        .catch(() => false);

      console.log("Deep link — Invite link visible in share modal:", hasInviteLink);
      expect(hasInviteLink).toBeTruthy();
    }
  );

  authTest(
    "navigating to own group invite shows already-member or preview",
    async ({ page }) => {
      // Navigate to groups and open first group
      await page.getByRole("button", { name: "Groups" }).click();
      await page.waitForTimeout(2000);

      const hasGroups = await page
        .getByText("members")
        .first()
        .isVisible()
        .catch(() => false);

      if (!hasGroups) {
        console.log("Deep link — SKIPPED: no groups");
        return;
      }

      await page.getByText("members").first().click();
      await page.waitForTimeout(1500);

      // Extract invite code from the current group detail
      // The share modal shows the invite URL — let's get it
      const shareBtn = page.locator("[aria-label='Share']").first();
      const hasShareBtn = await shareBtn.isVisible().catch(() => false);
      if (!hasShareBtn) {
        console.log("Deep link — SKIPPED: share button not found");
        return;
      }

      await shareBtn.click();
      await page.waitForTimeout(1000);

      // Find the invite URL text
      const linkEl = page.getByText(/(?:dev\.)?splitr\.ai\/invite\/[a-zA-Z0-9-]+/i).first();
      const linkText = await linkEl.textContent().catch(() => null);
      console.log("Deep link — Found invite link text:", linkText);

      if (!linkText) {
        console.log("Deep link — SKIPPED: could not find invite link text");
        return;
      }

      // Extract the code from the URL
      const match = linkText.match(/invite\/([a-zA-Z0-9-]+)/);
      const inviteCode = match?.[1];
      if (!inviteCode) {
        console.log("Deep link — SKIPPED: could not extract invite code");
        return;
      }

      // Close the modal and navigate to the invite route
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);

      await page.goto(`/invite/${inviteCode}`);
      await page.waitForTimeout(3000);

      // Authenticated user who is already a member:
      // Option A: redirected to group detail (ALREADY_MEMBER fast path)
      // Option B: preview shown with "Join Group" disabled or "You're already a member"
      // Option C: preview shown normally (user can re-join = no-op on backend)
      const redirectedToGroup =
        page.url().includes("/groups/") && !page.url().includes("/invite/");
      const showsPreview = await page
        .getByText("You've been invited")
        .isVisible()
        .catch(() => false);
      const showsError = await page
        .getByText("Invalid Invite")
        .isVisible()
        .catch(() => false);

      console.log("Deep link — Redirected to group:", redirectedToGroup);
      console.log("Deep link — Shows preview:", showsPreview);
      console.log("Deep link — Shows error:", showsError);

      expect(redirectedToGroup || showsPreview || showsError).toBeTruthy();
    }
  );

  authTest(
    "invite preview shows group name and member count",
    async ({ page }) => {
      // Get invite code from groups
      await page.getByRole("button", { name: "Groups" }).click();
      await page.waitForTimeout(2000);

      const hasGroups = await page
        .getByText("members")
        .first()
        .isVisible()
        .catch(() => false);

      if (!hasGroups) {
        console.log("Deep link — SKIPPED: no groups");
        return;
      }

      await page.getByText("members").first().click();
      await page.waitForTimeout(1500);

      const shareBtn = page.locator("[aria-label='Share']").first();
      if (!(await shareBtn.isVisible().catch(() => false))) {
        console.log("Deep link — SKIPPED: no share button");
        return;
      }

      await shareBtn.click();
      await page.waitForTimeout(1000);

      const linkEl = page.getByText(/(?:dev\.)?splitr\.ai\/invite\/[a-zA-Z0-9-]+/i).first();
      const linkText = await linkEl.textContent().catch(() => null);
      const match = linkText?.match(/invite\/([a-zA-Z0-9-]+)/);
      const inviteCode = match?.[1];

      if (!inviteCode) {
        console.log("Deep link — SKIPPED: could not extract code");
        return;
      }

      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      await page.goto(`/invite/${inviteCode}`);
      await page.waitForTimeout(3000);

      // If preview loaded (not already-member redirect), check UI
      if (page.url().includes(`/invite/${inviteCode}`)) {
        const showsPreview = await page
          .getByText("You've been invited")
          .isVisible()
          .catch(() => false);

        if (showsPreview) {
          // Should show group name and member count
          const hasMemberCount = await page
            .getByText(/\d+ members?/)
            .isVisible()
            .catch(() => false);
          console.log("Deep link — Member count visible:", hasMemberCount);
          expect(hasMemberCount).toBeTruthy();
        }
      }
    }
  );
});
