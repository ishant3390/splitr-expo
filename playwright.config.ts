import { defineConfig, devices } from "@playwright/test";

const isDevSanity = process.env.PLAYWRIGHT_PROJECT === "dev-sanity";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:8081",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testDir: "./e2e",
      testIgnore: ["**/integration/**", "**/dev-sanity/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "integration",
      testDir: "./e2e/integration",
      use: {
        ...devices["Desktop Chrome"],
        actionTimeout: 15000,
      },
      timeout: 60000,
      retries: 1,
    },
    {
      name: "dev-sanity",
      testDir: "./e2e/dev-sanity",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://dev.splitr.ai",
        actionTimeout: 20000,
        trace: "on",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
      timeout: 90000,
      retries: 2,
    },
  ],

  webServer: isDevSanity
    ? undefined
    : {
        command: "npx expo start --web --port 8081",
        port: 8081,
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
