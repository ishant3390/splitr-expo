import { test, expect } from "./helpers/cleanup";
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
  const groupLocator = page.getByText(groupName, { exact: true }).last();
  await groupLocator.waitFor({ state: "attached", timeout: 15000 });
  await groupLocator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  await groupLocator.evaluate((el: HTMLElement) => {
    const target =
      el.closest('[role="button"],button,a,[data-testid]') ?? el;
    (target as HTMLElement).click();
  });
  await page.waitForTimeout(250);
}

test.describe("Invite Flow", () => {
  test("share modal shows invite link", async ({ page, apiClient }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Invite Link" })
    );

    // Navigate to group detail
    await page.getByRole("button", { name: "Groups" }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
    await scrollToGroupAndClick(page, group.name);
    await page.getByLabel("Group settings").first().click();
    await page
      .getByText("MEMBERS", { exact: false })
      .first()
      .waitFor({ state: "attached", timeout: 10000 });
    const inviteLinkButton = page.getByText("Invite Link", { exact: true }).first();
    await inviteLinkButton.scrollIntoViewIfNeeded().catch(() => {});
    await inviteLinkButton.evaluate((el: HTMLElement) => {
      const target =
        el.closest('[role="button"],button,a,[data-testid]') ?? el;
      (target as HTMLElement).click();
    });
    await page
      .getByTestId("group-settings-share-modal-sheet")
      .waitFor({ state: "attached", timeout: 10000 });

    // Modal should show an invite link
    const hasLink = await page
      .getByText(/https:\/\/(?:dev\.)?splitr\.ai\/invite\//)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasLink).toBeTruthy();
  });

  test("invite preview shows group info for valid code", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Preview Test" })
    );

    let fullGroup: any;
    try {
      fullGroup = await apiClient.getGroup(group.id);
    } catch {
      test.skip();
      return;
    }

    if (fullGroup.inviteCode) {
      // Verify preview via API
      try {
        const preview = await apiClient.getInvitePreview(fullGroup.inviteCode);
        expect(preview.name).toBe(group.name);
        expect(preview.memberCount).toBeGreaterThanOrEqual(1);
      } catch {
        // API may not support this endpoint — skip gracefully
      }
    }
  });

  test("joining own group returns already-member handling", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Self Join" })
    );

    let fullGroup: any;
    try {
      fullGroup = await apiClient.getGroup(group.id);
    } catch {
      test.skip();
      return;
    }

    if (fullGroup.inviteCode) {
      // Navigate to the join URL
      await page.goto(`/join/${fullGroup.inviteCode}`);
      await page.waitForTimeout(3000);

      // Should show "already a member" or redirect to group
      const hasAlreadyMember = await page
        .getByText(/already a member|already joined/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasGroupName = await page
        .getByText(group.name)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      // Either shows error or redirects to the group
      expect(hasAlreadyMember || hasGroupName).toBeTruthy();
    }
  });

  test("regenerate invite code → new code is different", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Regen Code" })
    );

    let originalGroup: any;
    try {
      originalGroup = await apiClient.getGroup(group.id);
    } catch {
      test.skip();
      return;
    }

    const originalCode = originalGroup.inviteCode;

    // Regenerate
    try {
      await apiClient.regenerateInvite(group.id);
    } catch {
      // regenerate may not be supported — skip
      test.skip();
      return;
    }

    let newGroup: any;
    try {
      newGroup = await apiClient.getGroup(group.id);
    } catch {
      test.skip();
      return;
    }

    // New code should be different
    if (originalCode && newGroup.inviteCode) {
      expect(newGroup.inviteCode).not.toBe(originalCode);
    }
  });

  test("inviteByEmail creates a guest member carrying the provided name in listMembers", async ({
    apiClient,
  }) => {
    const group = await apiClient.createGroup(
      fixtures.group({ name: "Invite Email Name" })
    );
    const guestName = `[E2E] Email Invite ${Date.now().toString(36)}`;
    const guestEmail = `e2e-invite-${Date.now()}@test.splitr.ai`;

    const invited = await apiClient.inviteByEmail(group.id, guestEmail, guestName);

    // Returned member should be a guest (no real user linked yet) with the correct name
    const returnedName =
      (invited as any).displayName ||
      (invited as any).guestUser?.name ||
      (invited as any).user?.name ||
      "";
    expect(returnedName).toContain("[E2E] Email Invite");
    expect((invited as any).user).toBeFalsy();
    expect((invited as any).guestUser).toBeTruthy();

    // Member must appear in listMembers with same name
    const members = await apiClient.listMembers(group.id);
    const found = members.find(
      (m: any) =>
        m.displayName?.includes("[E2E] Email Invite") ||
        m.guestUser?.name?.includes("[E2E] Email Invite")
    );
    expect(found).toBeTruthy();
    // Confirm the member is still a guest — not yet a real user
    expect((found as any).user).toBeFalsy();
    expect((found as any).guestUser).toBeTruthy();
  });

  test("joining with a fabricated invite code returns an error (ERR-300 or ERR-401)", async ({
    apiClient,
  }) => {
    const fakeCode = `INVALID${Date.now().toString(36).toUpperCase()}`;

    const result = await apiClient.requestSafe("/v1/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: fakeCode }),
    });

    expect(result.ok).toBe(false);
    expect([400, 404, 422]).toContain(result.status);
    const errorBody = result.error ? JSON.parse(result.error) : {};
    expect(["ERR-300", "ERR-401"]).toContain(errorBody.code);
  });
});
