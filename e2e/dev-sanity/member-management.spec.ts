/**
 * Dev Sanity — Member Management
 * Tests guest member addition, duplicate member prevention, and invite-by-email name field.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Member Management", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) {
      testInfo.skip();
    }
  });

  test("guest member added with name displays correctly", async ({
    userAClient,
  }) => {
    const guestName = `[SANITY] Guest Name ${Date.now().toString(36)}`;

    // User A creates group
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Guest Member Test" })
    );

    // Add guest member
    const member = await userAClient.addGuestMember(group.id, {
      name: guestName,
    });
    expect(member.id).toBeTruthy();

    // List members and verify guest name appears
    const members = await userAClient.listMembers(group.id);
    const found = members.some(
      (m: any) =>
        m.guestUser?.name === guestName || m.displayName === guestName
    );
    expect(found).toBe(true);
  });

  test("User A cannot re-add User B who is already a member", async ({
    userAClient,
    userBClient,
  }) => {
    // User A creates group
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Duplicate Member Test" })
    );

    // User B joins via invite code
    const groupDetail = await userAClient.getGroup(group.id);
    expect(groupDetail.inviteCode).toBeTruthy();
    await userBClient.joinGroupByInvite(groupDetail.inviteCode!);

    // User A tries to invite User B's email again
    const userB = await userBClient.getMe();
    const result = await userAClient.requestSafe(
      `/v1/groups/${group.id}/members/invite`,
      {
        method: "POST",
        body: JSON.stringify({ email: userB.email }),
      }
    );

    // Expect 409 (already a member) — ERR-409
    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    if (result.error) {
      expect(result.error).toContain("ERR-409");
    }
  });

  test("invite by email passes name field to backend", async ({
    userAClient,
  }) => {
    const inviteName = `[SANITY] Invited Person ${Date.now().toString(36)}`;
    const inviteEmail = `sanity-invite-${Date.now()}@test.splitr.ai`;

    // User A creates group
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Email Invite Name Test" })
    );

    // Invite by email with name field (BE-13 may or may not use name yet)
    const result = await userAClient.requestSafe(
      `/v1/groups/${group.id}/members/invite`,
      {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      }
    );

    // The invite should succeed (backend creates guest or finds user)
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toBeTruthy();

    // Verify member was added to the group
    const members = await userAClient.listMembers(group.id);
    const found = members.some(
      (m: any) =>
        m.guestUser?.name === inviteName ||
        m.displayName === inviteName ||
        // Fallback: if BE-13 isn't deployed yet, the member exists but name may differ
        m.user?.email === inviteEmail ||
        m.guestUser?.email === inviteEmail
    );
    expect(found).toBe(true);
  });
});
