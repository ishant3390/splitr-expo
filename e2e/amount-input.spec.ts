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

  test("3rd decimal digit is rejected — input stays at 2 decimal places (flicker prevention)", async ({ page }) => {
    const amountInput = page.getByTestId("amount-input");
    await expect(amountInput).toBeVisible({ timeout: 5000 });

    // Type exactly 2 decimal digits
    await amountInput.fill("42.50");
    await expect(amountInput).toHaveValue("42.50");

    // Attempt to type a 3rd decimal digit — maxLength should block it
    await amountInput.press("3");
    const valueAfter = await amountInput.inputValue();
    expect(valueAfter).toBe("42.50");
    expect(valueAfter).not.toContain("42.503");
  });

  test("font size shrinks as the number gets longer", async ({ page }) => {
    const amountInput = page.getByTestId("amount-input");
    await expect(amountInput).toBeVisible({ timeout: 5000 });

    // Short number → large font
    await amountInput.fill("42");
    const shortFontSize = await amountInput.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    expect(shortFontSize).toBe(48);

    // Long number → smaller font
    await amountInput.fill("123456789");
    const longFontSize = await amountInput.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    expect(longFontSize).toBeLessThan(48);
  });
});
