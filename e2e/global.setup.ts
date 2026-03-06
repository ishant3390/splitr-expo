import { clerkSetup } from "@clerk/testing/playwright";
import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  await clerkSetup();
}

export default globalSetup;
