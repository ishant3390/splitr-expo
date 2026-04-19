/**
 * Dark Mode Regression Tests
 *
 * These tests verify that the app's CSS custom properties correctly switch
 * between light and dark values based on system color scheme preference.
 *
 * Root cause this protects against:
 *   With `darkMode: "class"` in tailwind.config.js, CSS variables never
 *   switched on native (iOS/Android) because no `.dark` CSS class is ever
 *   added to the native view hierarchy. On web, `page.emulateMedia` would
 *   also have no effect since the media query block was absent from global.css.
 *
 * The fix: `darkMode: "media"` + @media (prefers-color-scheme: dark) in global.css.
 */

import { test, expect } from "@playwright/test";

async function getCssVar(page: any, varName: string): Promise<string> {
  return page.evaluate((name: string) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }, varName);
}

test.describe("Dark mode CSS variables", () => {
  test("light mode: CSS variables resolve to light values", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bg = await getCssVar(page, "--color-background");
    const card = await getCssVar(page, "--color-card");
    const fg = await getCssVar(page, "--color-foreground");

    expect(bg).toBe("#f8fafb");
    expect(card).toBe("#ffffff");
    expect(fg).toBe("#0f172a");
  });

  test("dark mode: CSS variables resolve to dark values", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bg = await getCssVar(page, "--color-background");
    const card = await getCssVar(page, "--color-card");
    const fg = await getCssVar(page, "--color-foreground");

    expect(bg).toBe("#000000");
    expect(card).toBe("#0d0d0d");
    expect(fg).toBe("#f1f5f9");
  });

  test("switching from light to dark changes CSS variables (regression: darkMode:'class' never changed)", async ({
    page,
  }) => {
    // Start in light mode
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const lightBg = await getCssVar(page, "--color-background");
    expect(lightBg).toBe("#f8fafb");

    // Switch to dark — with the old "class" config this had no effect
    await page.emulateMedia({ colorScheme: "dark" });
    // Allow any CSS recalculation
    await page.waitForTimeout(100);

    const darkBg = await getCssVar(page, "--color-background");
    expect(darkBg).toBe("#000000");

    // Values must actually differ
    expect(darkBg).not.toBe(lightBg);
  });

  test("dark mode muted and border colors resolve correctly", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const muted = await getCssVar(page, "--color-muted");
    const border = await getCssVar(page, "--color-border");
    const mutedFg = await getCssVar(page, "--color-muted-foreground");

    expect(muted).toBe("#1a1a1a");
    expect(border).toBe("#262626");
    expect(mutedFg).toBe("#a1a1aa");
  });
});
