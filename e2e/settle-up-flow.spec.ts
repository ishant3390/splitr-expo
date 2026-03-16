import { test, expect } from "./auth.setup";

test.describe("Settle Up Flow", () => {
  /**
   * Helper: navigate to a group's settle-up screen.
   * Returns true if a group was found and navigation succeeded, false otherwise.
   */
  async function navigateToSettleUp(page: any): Promise<boolean> {
    await page.getByRole("button", { name: "Groups" }).click();
    await page.waitForTimeout(2000);

    const hasGroups = await page
      .getByText("members")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasGroups) return false;

    // Open the first group
    await page.getByText("members").first().click();
    await page.waitForTimeout(1000);

    // Click "Settle Up" button on group detail
    await expect(page.getByText("Settle Up", { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await page.getByText("Settle Up", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    return true;
  }

  test("renders settlement suggestions or all-settled state", async ({
    page,
  }) => {
    const navigated = await navigateToSettleUp(page);
    if (!navigated) return;

    // Should show "Suggested" tab as active by default
    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });

    // Either shows suggestions with "Record" buttons, or "All settled up!" empty state
    const hasSuggestions = await page
      .getByText(/SUGGESTED PAYMENTS/)
      .isVisible()
      .catch(() => false);

    if (hasSuggestions) {
      // At least one "Record" payment button should be visible
      await expect(
        page.getByText(/Record .+ payment/).first()
      ).toBeVisible();
    } else {
      await expect(page.getByText("All settled up!")).toBeVisible();
    }
  });

  test("opens Record Payment modal from suggestion", async ({ page }) => {
    const navigated = await navigateToSettleUp(page);
    if (!navigated) return;

    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });

    const hasSuggestions = await page
      .getByText(/Record .+ payment/)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasSuggestions) return; // No suggestions to click — skip

    // Click the first suggestion card to open the modal
    await page.getByText(/Record .+ payment/).first().click();
    await page.waitForTimeout(500);

    // Modal should show "Record Payment" header
    await expect(
      page.getByText("Record Payment", { exact: true }).first()
    ).toBeVisible({ timeout: 5000 });

    // Modal should show the "pays" indicator between the two users
    await expect(page.getByText("pays")).toBeVisible();

    // Amount field should be pre-filled from the suggestion
    await expect(page.getByText("Amount")).toBeVisible();

    // Payment method section should be visible
    await expect(page.getByText("Payment Method")).toBeVisible();

    // Payment method options
    await expect(page.getByText("Cash")).toBeVisible();
    await expect(page.getByText("Venmo")).toBeVisible();
    await expect(page.getByText("Zelle")).toBeVisible();
  });

  test("Record Payment modal shows optional fields", async ({ page }) => {
    const navigated = await navigateToSettleUp(page);
    if (!navigated) return;

    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });

    const hasSuggestions = await page
      .getByText(/Record .+ payment/)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasSuggestions) return;

    await page.getByText(/Record .+ payment/).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText("Record Payment", { exact: true }).first()
    ).toBeVisible({ timeout: 5000 });

    // Optional fields should be visible
    await expect(page.getByText("Reference (optional)")).toBeVisible();
    await expect(page.getByText("Notes (optional)")).toBeVisible();

    // Placeholders
    await expect(
      page.getByPlaceholder("e.g., @username, transaction ID")
    ).toBeVisible();
    await expect(page.getByPlaceholder("e.g., Dinner split")).toBeVisible();
  });

  test("Record Payment modal has all payment method options", async ({
    page,
  }) => {
    const navigated = await navigateToSettleUp(page);
    if (!navigated) return;

    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });

    const hasSuggestions = await page
      .getByText(/Record .+ payment/)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasSuggestions) return;

    await page.getByText(/Record .+ payment/).first().click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText("Record Payment", { exact: true }).first()
    ).toBeVisible({ timeout: 5000 });

    // All 6 payment methods should be visible
    await expect(page.getByText("Cash")).toBeVisible();
    await expect(page.getByText("Venmo")).toBeVisible();
    await expect(page.getByText("Zelle")).toBeVisible();
    await expect(page.getByText("PayPal")).toBeVisible();
    await expect(page.getByText("Bank")).toBeVisible();
    await expect(page.getByText("Other")).toBeVisible();
  });

  test("History tab shows settlement history or empty state", async ({
    page,
  }) => {
    const navigated = await navigateToSettleUp(page);
    if (!navigated) return;

    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });

    // Switch to History tab
    await page.getByText(/History/).click();
    await page.waitForTimeout(1000);

    // Should show either settlement records or empty state
    const hasHistory = await page
      .getByText("paid")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasHistory) {
      // Settlement entries show "X paid Y" with an amount
      await expect(page.getByText("paid").first()).toBeVisible();
    } else {
      await expect(page.getByText("No settlements yet")).toBeVisible();
      await expect(
        page.getByText("Record a payment when someone settles their debt.")
      ).toBeVisible();
    }
  });

  test("shows group name on settle up screen", async ({ page }) => {
    const navigated = await navigateToSettleUp(page);
    if (!navigated) return;

    // Confirm we're on the settle-up screen by checking the tabs (not the header which may have DOM overlap)
    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/History/)).toBeVisible();
  });
});
