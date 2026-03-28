import { expect, type Page } from "@playwright/test";

function uniqueGroupName() {
  return `[E2E][Modal] ${Date.now().toString(36)}`;
}

async function isOnGroupDetail(page: Page): Promise<boolean> {
  const hasSettleUpAction = await page
    .getByText("Settle Up", { exact: true })
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  return hasSettleUpAction;
}

async function hasGroupCards(page: Page): Promise<boolean> {
  return page
    .locator("[aria-label='Group actions']")
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);
}

export async function openGroupsTab(page: Page) {
  await page.getByRole("button", { name: "Groups" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible({ timeout: 10000 });
}

async function createGroupFromGroups(page: Page): Promise<boolean> {
  await page.getByRole("button", { name: "New" }).click();
  await expect(page.getByText("New Group", { exact: true })).toBeVisible({ timeout: 10000 });

  await page.getByRole("textbox").first().fill(uniqueGroupName());
  await page.getByText("Create Group", { exact: true }).click();

  const created = await page
    .getByText("Group Created!", { exact: true })
    .isVisible({ timeout: 12000 })
    .catch(() => false);

  if (!created) {
    await page.goBack().catch(() => {});
    return false;
  }

  const goToGroupButton = page.getByText("Go to Group", { exact: true });
  const hasGoToGroup = await goToGroupButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (hasGoToGroup) {
    await goToGroupButton.click();
  } else {
    await page.keyboard.press("Escape").catch(() => {});
  }

  return isOnGroupDetail(page);
}

export async function ensureGroupContext(page: Page): Promise<boolean> {
  await openGroupsTab(page);

  // Prefer deterministic state for modal tests.
  const created = await createGroupFromGroups(page);
  if (created) return true;

  if (await hasGroupCards(page)) return true;

  await openGroupsTab(page);
  return hasGroupCards(page);
}

export async function openFirstGroup(page: Page): Promise<boolean> {
  const hasContext = await ensureGroupContext(page);
  if (!hasContext) return false;

  if (await isOnGroupDetail(page)) return true;

  const groupEntry = page.getByText("members").first();
  const hasGroupEntry = await groupEntry.isVisible({ timeout: 5000 }).catch(() => false);
  if (!hasGroupEntry) return false;

  await groupEntry.click();
  await expect(page.getByText("Settle Up", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  return true;
}

export async function openAddMemberModal(page: Page): Promise<boolean> {
  const openedGroup = await openFirstGroup(page);
  if (!openedGroup) return false;

  await page.locator("[aria-label='Group settings']").first().click();
  const openAddMember = page.locator("[aria-label='Open add member modal']").first();
  const hasOpenAddMember = await openAddMember.isVisible({ timeout: 10000 }).catch(() => false);
  if (!hasOpenAddMember) return false;

  await openAddMember.click();
  await expect(page.getByText("Add Member")).toBeVisible({ timeout: 10000 });
  return true;
}

export async function openSettleUp(page: Page): Promise<boolean> {
  const openedGroup = await openFirstGroup(page);
  if (!openedGroup) return false;

  await page.getByText("Settle Up", { exact: true }).first().click();
  await expect(page.getByText("Suggested")).toBeVisible({ timeout: 10000 });
  return true;
}
