/**
 * Dev Sanity — Group lifecycle (archive, unarchive, filtering)
 * Verifies group management features work on dev.
 */

import { test, expect, checkBackendHealth } from "./helpers/sanity-auth";
import { sanityFixtures } from "./helpers/sanity-fixtures";

test.describe("Dev Sanity — Group Lifecycle", () => {
  test.beforeEach(async ({}, testInfo) => {
    const healthy = await checkBackendHealth();
    if (!healthy) testInfo.skip();
  });

  test("archive and unarchive group", async ({ userAClient }) => {
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Archive Test" })
    );

    // Archive
    await userAClient.updateGroup(group.id, { isArchived: true });
    const archived = await userAClient.getGroup(group.id);
    expect(archived.isArchived).toBe(true);

    // Verify it appears in archived list
    const archivedList = await userAClient.listGroups("archived");
    expect(archivedList.some((g: any) => g.id === group.id)).toBe(true);

    // Unarchive
    await userAClient.updateGroup(group.id, { isArchived: false });
    const restored = await userAClient.getGroup(group.id);
    expect(restored.isArchived).toBe(false);

    // Verify it's back in active list
    const activeList = await userAClient.listGroups("active");
    expect(activeList.some((g: any) => g.id === group.id)).toBe(true);
  });

  test("group invite code works and can be regenerated", async ({
    userAClient,
  }) => {
    const group = await userAClient.createGroup(
      sanityFixtures.group({ name: "Invite Regen" })
    );

    const detail = await userAClient.getGroup(group.id);
    const originalCode = detail.inviteCode;
    expect(originalCode).toBeTruthy();

    // Preview works (no auth needed)
    const preview = await userAClient.getInvitePreview(originalCode!);
    expect(preview.name).toContain("Invite Regen");

    // Regenerate invite code
    const regen = await userAClient.regenerateInvite(group.id);
    const newDetail = await userAClient.getGroup(group.id);
    expect(newDetail.inviteCode).not.toBe(originalCode);
  });

  test("categories endpoint returns data", async ({ userAClient }) => {
    const categories = await userAClient.listCategories();
    expect(categories.length).toBeGreaterThan(0);
    // Each category should have id and name
    expect(categories[0].id).toBeTruthy();
    expect(categories[0].name).toBeTruthy();
  });
});
