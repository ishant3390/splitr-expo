import { defineConfig, devices } from "@playwright/test";

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
      testIgnore: "**/integration/**",
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
  ],

  webServer: {
    command: "npx expo start --web --port 8081",
    port: 8081,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
