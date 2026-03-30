import { test, expect } from "./auth.setup";
import { openAddMemberModal } from "./helpers/modal-regression";

/**
 * Smoke tests for member self-add prevention.
 * When a user enters their own email in the Add Member modal,
 * an info toast should appear: "You're already a member of this group."
 */
test.describe("Member Self-Add Prevention", () => {
  test("shows info toast when user tries to add themselves", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Fill in name
    await page.getByPlaceholder("e.g., Alex", { exact: true }).fill("Test Self");

    // Fill in the test user's own email (from env var used for Clerk auth)
    const selfEmail = process.env.E2E_CLERK_USER_EMAIL;
    if (!selfEmail) {
      test.skip();
      return;
    }
    await page.getByPlaceholder("e.g., alex@example.com").fill(selfEmail);

    // Click the Add to Group button
    await page.getByTestId("add-member-submit-button").click();

    // Assert info toast with self-add message appears
    await expect(
      page.getByText("You're already a member of this group.")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Add Member modal accepts name and email input", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Verify both inputs are functional
    const nameInput = page.getByPlaceholder("e.g., Alex", { exact: true });
    const emailInput = page.getByPlaceholder("e.g., alex@example.com");

    await nameInput.fill("Some Name");
    await expect(nameInput).toHaveValue("Some Name");

    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
  });
});
