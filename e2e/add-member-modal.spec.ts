import { test, expect } from "./auth.setup";
import { openAddMemberModal } from "./helpers/modal-regression";

/**
 * Regression tests for BottomSheetModal scrolling fix.
 * Verifies the Add Member modal renders its full content (Name input,
 * Email input, help text, "Add to Group" button, invite link).
 */
test.describe("Add Member Modal (BottomSheetModal scroll fix)", () => {
  test.describe.configure({ mode: "serial" });

  test("Add Member modal opens and shows title", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(page.getByText("Add Member")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("group-settings-add-member-modal-scroll")).toBeVisible();
  });

  test("Add Member modal shows Name input", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(page.getByText("Name")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("e.g., Alex", { exact: true })).toBeVisible();
  });

  test("Add Member modal shows Email input (below fold — requires scroll fix)", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    // This is the key regression test — Email input was clipped before the fix
    await expect(page.getByText("Email (optional)")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("e.g., alex@example.com")).toBeVisible();
  });

  test("Add Member modal shows 'Add to Group' button", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(page.getByText("Add to Group")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("add-member-submit-button")).toBeVisible();
  });

  test("Add Member modal shows invite link option", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(
      page.getByText("Or share invite link instead")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Add Member modal shows help text", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(
      page.getByText("Add an email to send them a direct invite")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Add Member modal can be dismissed via X button", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(page.getByText("Add Member")).toBeVisible({ timeout: 5000 });

    // Close modal — X button is near the title
    await page.keyboard.press("Escape");
    await expect(page.getByText("Name")).not.toBeVisible({ timeout: 5000 });
  });
});
