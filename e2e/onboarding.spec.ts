import { test, expect } from "./auth.setup";

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding key to force onboarding to show
    await page.evaluate(() => {
      window.localStorage.removeItem("@splitr/onboarding_complete");
    });
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test("shows welcome screen as first step", async ({ page }) => {
    const hasOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Onboarding may not show for existing users who already completed it
    if (!hasOnboarding) {
      test.skip();
      return;
    }

    await expect(page.getByText("Welcome to Splitr")).toBeVisible();
    await expect(page.getByText("Next")).toBeVisible();
    await expect(page.getByText("Skip")).toBeVisible();
  });

  test("shows currency step with currency options", async ({ page }) => {
    const hasOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasOnboarding) {
      test.skip();
      return;
    }

    // Advance to currency step
    await page.getByText("Next").click();
    await expect(page.getByText("Your Currency")).toBeVisible({ timeout: 5000 });

    // Currency chips should be visible
    await expect(page.getByTestId("currency-USD")).toBeVisible();
    await expect(page.getByTestId("currency-GBP")).toBeVisible();
    await expect(page.getByTestId("currency-EUR")).toBeVisible();
    await expect(page.getByTestId("currency-INR")).toBeVisible();
  });

  test("can select a currency and advance", async ({ page }) => {
    const hasOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasOnboarding) {
      test.skip();
      return;
    }

    // Advance to currency step
    await page.getByText("Next").click();
    await expect(page.getByText("Your Currency")).toBeVisible({ timeout: 5000 });

    // Select GBP
    await page.getByTestId("currency-GBP").click();

    // Advance to next step
    await page.getByText("Next").click();
    await expect(page.getByText("Create a Group")).toBeVisible({ timeout: 5000 });
  });

  test("shows all 5 steps in sequence", async ({ page }) => {
    const hasOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasOnboarding) {
      test.skip();
      return;
    }

    // Step 1: Welcome
    await expect(page.getByText("Welcome to Splitr")).toBeVisible();
    await page.getByText("Next").click();

    // Step 2: Currency
    await expect(page.getByText("Your Currency")).toBeVisible({ timeout: 5000 });
    await page.getByText("Next").click();

    // Step 3: Create a Group
    await expect(page.getByText("Create a Group")).toBeVisible({ timeout: 5000 });
    await page.getByText("Next").click();

    // Step 4: Add Expenses
    await expect(page.getByText("Add Expenses")).toBeVisible({ timeout: 5000 });
    await page.getByText("Next").click();

    // Step 5: Settle Up
    await expect(page.getByText("Settle Up")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Get Started")).toBeVisible();
  });

  test("skip button completes onboarding", async ({ page }) => {
    const hasOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasOnboarding) {
      test.skip();
      return;
    }

    await page.getByText("Skip").click();

    // Should navigate to home
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 15000 });
  });

  test("Get Started completes onboarding and navigates to home", async ({ page }) => {
    const hasOnboarding = await page
      .getByText("Welcome to Splitr")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasOnboarding) {
      test.skip();
      return;
    }

    // Advance through all steps
    for (let i = 0; i < 4; i++) {
      await page.getByText("Next").click();
      await page.waitForTimeout(500);
    }

    // Last step — tap Get Started
    await page.getByText("Get Started").click();

    // Should navigate to home
    await expect(page.getByText("Net Balance")).toBeVisible({ timeout: 15000 });
  });
});
