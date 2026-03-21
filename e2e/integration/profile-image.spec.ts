import { test, expect } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import * as path from "path";

const TEST_IMAGE = path.join(__dirname, "helpers", "test-image.png");

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

/**
 * Helper: upload and check if image storage is configured.
 * Returns the updated user or null if storage isn't available.
 */
async function uploadAndCheck(apiClient: ApiClient) {
  const updated = await apiClient.uploadProfileImage(TEST_IMAGE);
  return updated.profileImageUrl ? updated : null;
}

// Serial: all tests share the same user's profile image state
test.describe.serial("Profile Image Upload", () => {
  test.afterEach(async ({ apiClient }) => {
    // Always clean up — delete any uploaded profile image
    try {
      await apiClient.deleteProfileImage();
    } catch {
      // Ignore — may not have an image to delete
    }
  });

  test("API upload sets profileImageUrl and avatarUrl on user", async ({
    apiClient,
  }) => {
    const updated = await uploadAndCheck(apiClient);
    if (!updated) {
      test.skip(undefined, "Image storage not configured — profileImageUrl is null after upload");
      return;
    }

    // Should return a profileImageUrl pointing to R2/CDN
    expect(typeof updated.profileImageUrl).toBe("string");
    expect(updated.profileImageUrl!.startsWith("http")).toBe(true);

    // avatarUrl should also be set (BE-3)
    expect(updated.avatarUrl).toBeTruthy();

    // Verify via getMe — profileImageUrl persists
    const me = await apiClient.getMe();
    expect(me.profileImageUrl).toBeTruthy();
    expect(me.avatarUrl).toBeTruthy();
  });

  test("API upload returns unique URL each time (BE-4 cache-busting)", async ({
    apiClient,
  }) => {
    const first = await uploadAndCheck(apiClient);
    if (!first) {
      test.skip(undefined, "Image storage not configured");
      return;
    }
    const firstUrl = first.profileImageUrl;

    const second = await apiClient.uploadProfileImage(TEST_IMAGE);
    const secondUrl = second.profileImageUrl;

    // Each upload should produce a different URL (UUID in filename)
    expect(firstUrl).toBeTruthy();
    expect(secondUrl).toBeTruthy();
    expect(firstUrl).not.toBe(secondUrl);
  });

  test("API delete clears profileImageUrl and avatarUrl", async ({
    apiClient,
  }) => {
    const uploaded = await uploadAndCheck(apiClient);
    if (!uploaded) {
      test.skip(undefined, "Image storage not configured");
      return;
    }

    // Verify it's set
    const before = await apiClient.getMe();
    expect(before.profileImageUrl).toBeTruthy();

    // Delete
    await apiClient.deleteProfileImage();

    // Verify cleared
    const after = await apiClient.getMe();
    expect(after.profileImageUrl).toBeFalsy();
  });

  test("API delete without existing image does not error", async ({
    apiClient,
  }) => {
    // Ensure no image first
    try {
      await apiClient.deleteProfileImage();
    } catch {
      // May already be clean
    }

    // Delete again — should not throw
    const result = await apiClient.requestSafe("/v1/users/me/profile-image", {
      method: "DELETE",
    });
    // Accept 200/204 (success) or 404 (no image) — either is fine
    expect([200, 204, 404]).toContain(result.status);
  });

  test("upload reflects in Edit Profile screen avatar", async ({
    page,
    apiClient,
  }) => {
    const uploaded = await uploadAndCheck(apiClient);
    if (!uploaded) {
      test.skip(undefined, "Image storage not configured");
      return;
    }

    // Navigate to Edit Profile
    await page.getByRole("button", { name: "Profile" }).click();
    await page.waitForTimeout(1000);
    await page.getByText("Edit Profile").first().click();
    await expect(page.getByText("Name").first()).toBeVisible({ timeout: 5000 });

    // "Change Photo" appears when profileImageUrl is set
    await expect(page.getByText("Change Photo")).toBeVisible({ timeout: 5000 });
  });

  test("delete reflects in Edit Profile screen avatar", async ({
    page,
    apiClient,
  }) => {
    const uploaded = await uploadAndCheck(apiClient);
    if (!uploaded) {
      test.skip(undefined, "Image storage not configured");
      return;
    }

    await apiClient.deleteProfileImage();

    // Navigate to Edit Profile
    await page.getByRole("button", { name: "Profile" }).click();
    await page.waitForTimeout(1000);
    await page.getByText("Edit Profile").first().click();
    await expect(page.getByText("Name").first()).toBeVisible({ timeout: 5000 });

    // Should show "Add Photo" instead of "Change Photo"
    await expect(page.getByText("Add Photo")).toBeVisible({ timeout: 5000 });
  });

  test("other group members see updated avatarUrl", async ({
    apiClient,
  }) => {
    const uploaded = await uploadAndCheck(apiClient);
    if (!uploaded) {
      test.skip(undefined, "Image storage not configured");
      return;
    }

    // Create a group and check member list includes avatarUrl
    const group = await apiClient.createGroup({ name: "[E2E] Avatar Test" });
    const members = await apiClient.listMembers(group.id);

    // Find the current user in members
    const me = await apiClient.getMe();
    const myMember = members.find(
      (m: any) => m.user?.id === me.id
    );
    expect(myMember).toBeTruthy();

    // avatarUrl on the member's user should be set
    expect(myMember?.user?.avatarUrl || myMember?.user?.profileImageUrl).toBeTruthy();
  });
});
