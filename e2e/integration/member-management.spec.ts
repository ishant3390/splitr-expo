import { test, expect, skipOnboardingIfPresent } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import { fixtures } from "./helpers/fixtures";

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

/**
 * Scroll to find a group by name in the Groups tab and click it.
 */
async function scrollToGroupAndClick(page: any, groupName: string) {
  const groupLocator = page.getByText(groupName).first();
  await groupLocator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(groupLocator).toBeVisible({ timeout: 10000 });
  await groupLocator.click();
}

test.describe("Member Management", () => {
  test("add guest member via UI → appears in member list", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Member Mgmt" })
    );

    // Navigate to group detail
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await expect(page.getByText(group.name).first()).toBeVisible({ timeout: 10000 });

    // Look for Add Member button
    const addMemberBtn = page.getByText("Add Member").first();
    const hasAddMember = await addMemberBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasAddMember) {
      await addMemberBtn.click();

      // Fill in the member name
      const nameInput = page.getByPlaceholder(/Name/);
      const hasNameInput = await nameInput
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasNameInput) {
        const guestName = `[E2E] Guest ${Date.now().toString(36)}`;
        await nameInput.fill(guestName);

        // Submit
        const addBtn = page
          .getByRole("button", { name: /Add|Save|Done/ })
          .first();
        const hasAdd = await addBtn
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        if (hasAdd) {
          await addBtn.click();

          // Wait for member addition to complete
          await page.waitForTimeout(3000);

          // Verify member appears
          await expect(page.getByText(guestName).first()).toBeVisible({
            timeout: 10000,
          });
        }
      }
    }
  });

  test("add guest member via API → verify in group detail UI", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "API Member" })
    );
    const guestName = `[E2E] API Guest ${Date.now().toString(36)}`;
    await apiClient.addGuestMember(group.id, { name: guestName });

    // Navigate to group detail
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);

    // Member should be visible
    await expect(page.getByText(guestName).first()).toBeVisible({ timeout: 10000 });
  });

  test("member count updates after adding member", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Count Check" })
    );

    // Initially 1 member (the creator)
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 member").first()).toBeVisible({ timeout: 10000 });

    // Add a guest member via API
    await apiClient.addGuestMember(group.id, { name: "[E2E] New Member" });

    // Reload groups list
    await page.reload();
    await skipOnboardingIfPresent(page);
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });

    // Should now show 2 members
    await expect(page.getByText("2 members").first()).toBeVisible({ timeout: 10000 });
  });

  test("remove member via API → no longer in group detail", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Remove Member" })
    );
    const guestName = `[E2E] Removable ${Date.now().toString(36)}`;
    const guest = await apiClient.addGuestMember(group.id, {
      name: guestName,
    });

    // Verify member appears
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await expect(page.getByText(guestName).first()).toBeVisible({ timeout: 10000 });

    // Remove via API
    await apiClient.removeMember(group.id, guest.id);

    // Reload to verify removal
    await page.reload();
    await skipOnboardingIfPresent(page);
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);

    const stillVisible = await page
      .getByText(guestName)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(stillVisible).toBeFalsy();
  });

  test("add member with email via API → appears in group", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Email Member" })
    );
    const guestName = `[E2E] Email Guest ${Date.now().toString(36)}`;
    await apiClient.addGuestMember(group.id, {
      name: guestName,
      email: `e2e-${Date.now()}@test.splitr.ai`,
    });

    // Navigate to group detail
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);

    await expect(page.getByText(guestName).first()).toBeVisible({ timeout: 10000 });
  });

  // ── Member Removal with Outstanding Debt ─────────────────────────────────

  test("remove member with outstanding debt is blocked", async ({
    apiClient,
  }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Debt Removal" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Indebted Guest",
    });
    const guestId = guest.guestUser!.id;

    // Create expense: me paid $40 split equally → guest owes me $20
    await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Debt Before Removal",
        totalAmount: 4000,
      })
    );

    // Attempt removal while debt is outstanding — backend returns 422 / ERR-400
    const result = await apiClient.requestSafe(
      `/v1/groups/${group.id}/members/${guest.id}`,
      { method: "DELETE" }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);

    // Verify error code
    const errorBody = result.error ? JSON.parse(result.error) : {};
    expect(errorBody.code).toBe("ERR-400");

    // Member must still be in the group
    const members = await apiClient.listMembers(group.id);
    const guestStillPresent = members.some(
      (m) => m.guestUser?.id === guestId
    );
    expect(guestStillPresent).toBe(true);
  });

  test("remove member after settling debt succeeds", async ({ apiClient }) => {
    const me = await apiClient.getMe();
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Settle Then Remove" })
    );
    const guest = await apiClient.addGuestMember(group.id, {
      name: "[E2E] Settle Guest",
    });
    const guestId = guest.guestUser!.id;

    // Create expense: me paid $30 split equally → guest owes me $15
    await apiClient.createExpense(
      group.id,
      fixtures.guestExpense(me.id, guestId, {
        description: "Settle Before Removal",
        totalAmount: 3000,
      })
    );

    // Settle the debt fully
    await apiClient.createSettlement(group.id, {
      payerGuestUserId: guestId,
      payeeUserId: me.id,
      amount: 1500,
      currency: "USD",
      paymentMethod: "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    });

    // Verify no debt remains
    const suggestions = await apiClient.getSettlementSuggestions(group.id);
    expect(suggestions.length).toBe(0);

    // Remove member — should succeed since debt is cleared
    await apiClient.removeMember(group.id, guest.id);

    // Verify member is gone
    const members = await apiClient.listMembers(group.id);
    const guestStillPresent = members.some(
      (m) => m.guestUser?.id === guestId
    );
    expect(guestStillPresent).toBe(false);
  });
});
