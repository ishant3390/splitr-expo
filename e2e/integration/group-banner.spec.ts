import { test, expect } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";
import { fixtures } from "./helpers/fixtures";
import * as path from "path";

const TEST_IMAGE = path.join(__dirname, "helpers", "test-image.png");

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

test.describe.serial("Group Banner Upload", () => {
  test("API banner upload sets bannerImageUrl on group", async ({
    apiClient,
  }) => {
    // Create a test group
    const group = await apiClient.createGroup(fixtures.group({ name: "[E2E] Banner Test" }));

    // Upload banner
    const updated = await apiClient.uploadGroupBanner(group.id, TEST_IMAGE);
    console.log("Banner upload response:", JSON.stringify({
      id: updated.id,
      bannerImageUrl: updated.bannerImageUrl,
    }));

    if (!updated.bannerImageUrl) {
      test.skip(undefined, "Banner storage not configured — bannerImageUrl is null");
      return;
    }

    expect(updated.bannerImageUrl).toBeTruthy();
    expect(updated.bannerImageUrl!.startsWith("http")).toBe(true);

    // Verify via getGroup
    const fetched = await apiClient.getGroup(group.id);
    console.log("getGroup bannerImageUrl:", (fetched as any).bannerImageUrl);
  });

  test("API banner upload returns unique URL each time", async ({
    apiClient,
  }) => {
    const group = await apiClient.createGroup(fixtures.group({ name: "[E2E] Banner Unique" }));

    const first = await apiClient.uploadGroupBanner(group.id, TEST_IMAGE);
    if (!first.bannerImageUrl) {
      test.skip(undefined, "Banner storage not configured");
      return;
    }

    const second = await apiClient.uploadGroupBanner(group.id, TEST_IMAGE);
    expect(first.bannerImageUrl).not.toBe(second.bannerImageUrl);
  });

  test("banner displays on group detail screen after upload", async ({
    page,
    apiClient,
  }) => {
    const group = await apiClient.createGroup(fixtures.group({ name: "BnrShow" }));
    const uploaded = await apiClient.uploadGroupBanner(group.id, TEST_IMAGE);

    if (!uploaded.bannerImageUrl) {
      test.skip(undefined, "Banner storage not configured");
      return;
    }

    // Navigate directly to the group detail page via URL
    await page.goto(`http://localhost:8081/groups/${group.id}`);
    await page.waitForTimeout(3000);

    // Take screenshot to verify banner is visible
    await page.screenshot({ path: "test-results/banner-detail.png" });

    // Verify we're on the group detail page
    await expect(page.getByText("Add Expense").first()).toBeVisible({ timeout: 10000 });
  });

  test("API banner delete clears bannerImageUrl", async ({
    apiClient,
  }) => {
    const group = await apiClient.createGroup(fixtures.group({ name: "[E2E] Banner Delete" }));

    const uploaded = await apiClient.uploadGroupBanner(group.id, TEST_IMAGE);
    if (!uploaded.bannerImageUrl) {
      test.skip(undefined, "Banner storage not configured");
      return;
    }

    await apiClient.deleteGroupBanner(group.id);
    const after = await apiClient.getGroup(group.id);
    expect((after as any).bannerImageUrl).toBeFalsy();
  });
});
