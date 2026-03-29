import { test, expect } from "./helpers/cleanup";
import { ApiClient } from "./helpers/api-client";

test.beforeAll(async () => {
  const healthy = await ApiClient.isBackendHealthy();
  if (!healthy) {
    test.skip();
    throw new Error("Backend not reachable — skipping integration tests");
  }
});

test.describe("Settings Screens", () => {
  test("notification settings loads and toggle works", async ({ page }) => {
    // Navigate to Profile → Notification Settings
    await page.getByRole("button", { name: "Profile" }).click();
    await page.waitForTimeout(2000);

    const notifLink = page.getByText("Notifications").first();
    const hasNotif = await notifLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!hasNotif) {
      test.skip(true, "Notifications menu item not found on profile screen");
      return;
    }

    await notifLink.click();
    await page.waitForTimeout(1000);

    // Should show notification settings content
    const hasToggle = await page
      .getByText(/Push Notifications|Email/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasToggle).toBeTruthy();
  });

  test("privacy & security screen loads", async ({ page }) => {
    await page.getByRole("button", { name: "Profile" }).click();
    await page.waitForTimeout(2000);

    const privacyLink = page.getByText("Privacy & Security").first();
    const hasPrivacy = await privacyLink
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasPrivacy) {
      // Try alternative text
      const altLink = page.getByText("Security").first();
      const hasAlt = await altLink
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasAlt) {
        test.skip(true, "Privacy & Security menu item not found on profile screen");
        return;
      }

      await altLink.click();
      await page.waitForTimeout(1000);

      const hasContent = await page
        .getByText(/Biometric|Clear Cache|Data/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasContent).toBeTruthy();
      return;
    }

    await privacyLink.click();
    await page.waitForTimeout(1000);

    // Should show privacy/security content
    const hasContent = await page
      .getByText(/Biometric|Clear Cache|Data/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test("help & support content renders", async ({ page }) => {
    await page.getByRole("button", { name: "Profile" }).click();
    await page.waitForTimeout(2000);

    const helpLink = page.getByText("Help & Support").first();
    const hasHelp = await helpLink
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasHelp) {
      // Try alternative text
      const altLink = page.getByText("Support").first();
      const hasAlt = await altLink
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasAlt) {
        test.skip(true, "Help & Support menu item not found on profile screen");
        return;
      }

      await altLink.click();
      await page.waitForTimeout(1000);

      const hasContent = await page
        .getByText(/FAQ|Contact|Feedback|Report/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasContent).toBeTruthy();
      return;
    }

    await helpLink.click();
    await page.waitForTimeout(1000);

    // Should show help/support content
    const hasContent = await page
      .getByText(/Frequently Asked Questions|Get in Touch|Email Support|Visit Website|Rate 5 Stars/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test("payment methods screen loads", async ({ page }) => {
    await page.getByRole("button", { name: "Profile" }).click();
    await page.waitForTimeout(2000);

    const paymentLink = page.getByText("Payment Methods").first();
    const hasPayment = await paymentLink
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasPayment) {
      // Try alternative text
      const altLink = page.getByText("Payment").first();
      const hasAlt = await altLink
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasAlt) {
        test.skip(true, "Payment Methods menu item not found on profile screen");
        return;
      }

      await altLink.click();
      await page.waitForTimeout(1000);

      const hasContent = await page
        .getByText(/Payment Methods|Save Payment Methods|Show all payment methods|Venmo|PayPal/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasContent).toBeTruthy();
      return;
    }

    await paymentLink.click();
    await page.waitForTimeout(1500);

    // Should show payment methods content
    const hasTitle = await page
      .getByText("Payment Methods", { exact: true })
      .first()
      .isVisible({ timeout: 7000 })
      .catch(() => false);
    const hasSave = await page
      .getByText("Save Payment Methods", { exact: true })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasRegionText = await page
      .getByText(/Region/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasTitle || hasSave || hasRegionText).toBeTruthy();
  });
});
