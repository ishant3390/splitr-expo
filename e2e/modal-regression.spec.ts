import { test, expect } from "./auth.setup";
import {
  openAddMemberModal,
  openGroupsTab,
  openSettleUp,
} from "./helpers/modal-regression";

test.describe("Modal Regression Suite", () => {
  test.describe.configure({ mode: "serial" });

  test("join modal opens with required controls", async ({ page }) => {
    await openGroupsTab(page);
    const hasJoin = await page.getByRole("button", { name: "Join" }).isVisible().catch(() => false);
    if (!hasJoin) {
      test.skip();
      return;
    }
    await page.getByRole("button", { name: "Join" }).click();

    await expect(page.getByText("Join a Group")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("Invite code or link")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Continue")).toBeVisible();
    await expect(page.getByTestId("groups-join-modal-backdrop")).toBeVisible();
    await expect(page.getByTestId("groups-join-modal-scroll")).toBeVisible();
  });

  test("join modal validation error is visible", async ({ page }) => {
    await openGroupsTab(page);
    const hasJoin = await page.getByRole("button", { name: "Join" }).isVisible().catch(() => false);
    if (!hasJoin) {
      test.skip();
      return;
    }
    await page.getByRole("button", { name: "Join" }).click();
    await expect(page.getByText("Join a Group")).toBeVisible({ timeout: 5000 });

    await page.getByText("Continue").click();
    await expect(page.getByText("Please enter an invite code")).toBeVisible({ timeout: 5000 });
  });

  test("add member modal has full content and closes", async ({ page }) => {
    const openedAddMember = await openAddMemberModal(page);
    if (!openedAddMember) {
      test.skip();
      return;
    }

    await expect(page.getByText("Add Member")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.getByText("Email (optional)")).toBeVisible();
    await expect(page.getByText("Add to Group")).toBeVisible();
    await expect(page.getByTestId("group-settings-add-member-modal-backdrop")).toBeVisible();
    await expect(page.getByTestId("group-settings-add-member-modal-scroll")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Name")).not.toBeVisible({ timeout: 5000 });
  });

  test("settle up screen renders stably after navigation", async ({ page }) => {
    const openedSettleUp = await openSettleUp(page);
    if (!openedSettleUp) {
      test.skip();
      return;
    }

    await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("History")).toBeVisible();
    await expect(page.getByText("Settle Up").nth(1)).toBeVisible();
  });

  test("record payment modal opens from suggestion when available", async ({ page }) => {
    const openedSettleUp = await openSettleUp(page);
    if (!openedSettleUp) {
      test.skip();
      return;
    }

    const hasRecordAction = await page
      .getByText(/Record .+ payment/)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasRecordAction) {
      test.skip();
      return;
    }

    await page.getByText(/Record .+ payment/).first().click();
    await expect(page.getByText("Record Payment", { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Amount")).toBeVisible();
    await expect(page.getByText("Payment Method")).toBeVisible();
    await expect(page.getByTestId("settle-up-record-payment-modal-backdrop")).toBeVisible();
    await expect(page.getByTestId("settle-up-record-payment-modal-scroll")).toBeVisible();
  });
});
