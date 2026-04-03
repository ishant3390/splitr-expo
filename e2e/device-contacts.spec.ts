import { test, expect } from "./auth.setup";
import { openAddMemberModal, openFirstGroup } from "./helpers/modal-regression";

/**
 * Device Contacts (FE-10) — E2E smoke tests.
 *
 * expo-contacts is native-only, so on web:
 * - "Add from Contacts" button must NOT be visible in the Add Member modal
 * - The /device-contacts route should handle missing groupId gracefully
 * - Existing Add Member modal functionality must not regress
 */
test.describe("Device Contacts", () => {
  test.describe.configure({ mode: "serial" });

  test("Add Member modal does NOT show 'Add from Contacts' on web but shows phone field", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Modal should be visible with standard fields including phone
    await expect(page.getByText("Add Member")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.getByText("Email (optional)")).toBeVisible();
    await expect(page.getByText("Phone (optional)")).toBeVisible();
    await expect(page.getByPlaceholder("e.g., +1 555 123 4567")).toBeVisible();
    await expect(page.getByText("Add to Group")).toBeVisible();

    // "Add from Contacts" button must NOT be visible on web (Platform.OS guard)
    const contactsButton = page.getByTestId("add-from-contacts-button");
    await expect(contactsButton).not.toBeVisible({ timeout: 2000 });
  });

  test("Add Member modal still shows invite link option after contacts feature", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    await expect(
      page.getByText("Or share invite link instead")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Add Member modal Name + Email form still functional", async ({ page }) => {
    const opened = await openAddMemberModal(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Fill in name — submit button should become enabled
    const nameInput = page.getByPlaceholder("e.g., Alex", { exact: true });
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("Test Contact");

    const submitButton = page.getByTestId("add-member-submit-button");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test("/device-contacts route handles missing groupId gracefully", async ({ page }) => {
    // Navigate directly to device-contacts without groupId param
    await page.goto("/device-contacts");

    // On web, the screen should either redirect back or show nothing
    // (the groupId guard returns null + router.back())
    // We just verify it doesn't crash with an unhandled error
    await page.waitForTimeout(2000);

    // Page should not show an unhandled error
    const errorText = page.getByText("Unhandled");
    const hasError = await errorText.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
  });

  test("group detail page still has settings gear icon", async ({ page }) => {
    const opened = await openFirstGroup(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Settings gear should still be accessible
    const settingsIcon = page.locator("[aria-label='Group settings']").first();
    await expect(settingsIcon).toBeVisible({ timeout: 5000 });
  });
});
