import { test, expect } from "./auth.setup";

/**
 * Smoke tests for amount input improvements.
 * Verifies that amount TextInputs render with inputmode="decimal"
 * on web for proper numeric keyboard behavior.
 */
test.describe("Amount Input (decimal inputMode)", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "Add Expense" }).click();
    await expect(page.getByText("Add Expense")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("header-group-context")).toBeVisible({ timeout: 5000 });
  });

  test("amount input has decimal inputMode on web", async ({ page }) => {
    // The amount input should have inputmode="decimal" for proper mobile keyboard
    const amountInput = page.getByTestId("amount-input");
    await expect(amountInput).toBeVisible({ timeout: 5000 });

    // React Native Web renders inputMode as the HTML inputmode attribute
    const inputmode = await amountInput.getAttribute("inputmode");
    expect(inputmode).toBe("decimal");
  });

  test("amount input accepts decimal values", async ({ page }) => {
    const amountInput = page.getByTestId("amount-input");
    await expect(amountInput).toBeVisible({ timeout: 5000 });

    await amountInput.fill("42.50");
    await expect(amountInput).toHaveValue("42.50");
  });

  test("currency symbol remains visible while typing amount", async ({ page }) => {
    const symbol = page.getByTestId("amount-currency-symbol");
    const amountInput = page.getByTestId("amount-input");

    await expect(symbol).toBeVisible({ timeout: 5000 });
    await amountInput.fill("31");
    await expect(amountInput).toHaveValue("31");
    await expect(symbol).toBeVisible();

    const symbolText = (await symbol.textContent())?.trim();
    expect(symbolText?.length).toBeGreaterThan(0);
  });
});
