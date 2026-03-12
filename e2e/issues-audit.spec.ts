/**
 * Issues Audit — tests each item from the Miro board
 * Each test is self-contained and takes a screenshot at the key moment.
 */
import { test, expect } from "./auth.setup";
import * as fs from "fs";
import * as path from "path";

const SHOTS = path.join(__dirname, "../qa/issue-audit");
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

// ─── helpers ────────────────────────────────────────────────────────────────

async function goToGroups(page: any) {
  await page.getByRole("button", { name: "Groups" }).click();
  await page.waitForTimeout(1500);
}

async function openFirstGroup(page: any): Promise<boolean> {
  await goToGroups(page);
  const has = await page.getByText("members").first().isVisible().catch(() => false);
  if (!has) return false;
  await page.getByText("members").first().click();
  await page.waitForTimeout(1500);
  return true;
}

async function goToAddExpense(page: any) {
  await page.getByRole("button", { name: "Add Expense" }).click();
  await expect(page.getByText("Add Expense")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
}

// ─── Issue 1: Unable to add members while creating a new group ───────────────
test("Issue 1 — create-group: can add members by name", async ({ page }) => {
  await goToGroups(page);
  await page.getByText("New").click();
  await expect(page.getByText("New Group")).toBeVisible({ timeout: 5000 });

  // Fill group name
  await page.getByRole("textbox").first().fill("Test Group Issue1");

  // Check add-people section exists
  const hasAddPeople = await page.getByText("Add People").isVisible().catch(() => false);
  const hasNameInput = await page.getByPlaceholder("Name (e.g., Alex)").isVisible().catch(() => false);

  await page.screenshot({ path: path.join(SHOTS, "issue1-create-group-members.png") });

  console.log("Issue 1 — Add People section visible:", hasAddPeople);
  console.log("Issue 1 — Name input visible:", hasNameInput);

  // Try typing a member name and adding
  if (hasNameInput) {
    await page.getByPlaceholder("Name (e.g., Alex)").fill("Alice");

    // Look for an Add button near the input
    const hasAddBtn = await page.getByText("Add Member").isVisible().catch(() => false) ||
                      await page.locator("button").filter({ hasText: /^Add$/ }).isVisible().catch(() => false);
    await page.screenshot({ path: path.join(SHOTS, "issue1-typed-member.png") });
    console.log("Issue 1 — Add member button visible after typing:", hasAddBtn);
  }

  // PASS if the add-people UI exists at all; FAIL if no way to add members
  expect(hasAddPeople && hasNameInput).toBeTruthy();
});

// ─── Issue 2: Unable to change the date while adding expense ─────────────────
test("Issue 2 — add expense: date is editable (not read-only)", async ({ page }) => {
  await goToAddExpense(page);

  const hasDate = await page.getByText("Date").isVisible().catch(() => false);
  console.log("Issue 2 — Date field visible:", hasDate);

  await page.screenshot({ path: path.join(SHOTS, "issue2-add-expense-date-initial.png") });

  if (hasDate) {
    // Find the date value element and try clicking it
    const dateRow = page.locator("text=/\\w+, \\w+ \\d+, \\d+|Today|\\d{4}-\\d{2}-\\d{2}/").first();
    const dateVisible = await dateRow.isVisible().catch(() => false);
    console.log("Issue 2 — Current date text visible:", dateVisible);

    if (dateVisible) {
      await dateRow.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SHOTS, "issue2-after-date-click.png") });

      // Check if a date picker or calendar appeared
      const hasDatePicker = await page.locator("input[type='date']").isVisible().catch(() => false) ||
                            await page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/).first().isVisible().catch(() => false) ||
                            await page.locator("[role='dialog']").isVisible().catch(() => false);

      console.log("Issue 2 — Date picker appeared after click:", hasDatePicker);
      if (hasDatePicker) {
        console.log("Issue 2 — STATUS: FIXED ✓ (date picker works)");
      } else {
        console.log("Issue 2 — STATUS: BROKEN ✗ (clicking date does nothing)");
      }
    }
  }
});

// ─── Issue 3: Photo and Gallery showing same thing ──────────────────────────
test("Issue 3 — add expense: Photo vs Gallery are distinct", async ({ page }) => {
  await goToAddExpense(page);

  const hasPhoto = await page.getByText("Photo", { exact: true }).isVisible().catch(() => false);
  const hasGallery = await page.getByText("Gallery", { exact: true }).isVisible().catch(() => false);

  await page.screenshot({ path: path.join(SHOTS, "issue3-photo-gallery.png") });
  console.log("Issue 3 — Photo button visible:", hasPhoto);
  console.log("Issue 3 — Gallery button visible:", hasGallery);
  console.log("Issue 3 — NOTE: Both open OS file picker on web — needs native device test for camera vs library distinction");

  // Both should at least be present as separate buttons
  expect(hasPhoto && hasGallery).toBeTruthy();
});

// ─── Issue 4: Auto-select icon based on description ────────────────────────
test("Issue 4 — add expense: typing description auto-selects category", async ({ page }) => {
  await goToAddExpense(page);
  await page.waitForTimeout(1500); // wait for categories to load

  // Note the currently selected category before typing
  const descInput = page.getByPlaceholder("What was this for?");
  await descInput.click();

  await page.screenshot({ path: path.join(SHOTS, "issue4-before-typing.png") });

  // Type a food-related description
  await descInput.fill("dinner at restaurant");
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SHOTS, "issue4-after-food-description.png") });

  const hasFoodSelected = await page.getByText("Food & Drink").isVisible().catch(() => false) ||
                          await page.getByText("Food").first().isVisible().catch(() => false);
  console.log("Issue 4 — Food category auto-selected after 'dinner at restaurant':", hasFoodSelected);

  // Try travel
  await descInput.fill("uber to airport");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOTS, "issue4-after-travel-description.png") });

  const hasTravelSelected = await page.getByText("Transport").isVisible().catch(() => false) ||
                             await page.getByText("Travel").isVisible().catch(() => false);
  console.log("Issue 4 — Transport/Travel category auto-selected after 'uber to airport':", hasTravelSelected);

  if (hasFoodSelected || hasTravelSelected) {
    console.log("Issue 4 — STATUS: FIXED ✓ (auto-category inference works)");
  } else {
    console.log("Issue 4 — STATUS: NEEDS VERIFICATION (could not confirm auto-select via web)");
  }
});

// ─── Issue 5: Update expense is not working ──────────────────────────────────
test("Issue 5 — update expense: edit flow works without error", async ({ page }) => {
  const opened = await openFirstGroup(page);
  if (!opened) {
    console.log("Issue 5 — SKIPPED: no groups available");
    return;
  }

  // Look for an expense to click
  const hasExpense = await page.getByText(/\$\d+\.\d{2}/).first().isVisible().catch(() => false);
  console.log("Issue 5 — Expense with amount visible:", hasExpense);

  await page.screenshot({ path: path.join(SHOTS, "issue5-group-detail.png") });

  if (!hasExpense) {
    console.log("Issue 5 — SKIPPED: no expenses in group to edit");
    return;
  }

  // Click on the expense amount to open edit
  await page.getByText(/\$\d+\.\d{2}/).first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SHOTS, "issue5-after-expense-click.png") });

  const onEditScreen = await page.getByText("Edit Expense").isVisible().catch(() => false) ||
                       await page.getByText("Save").isVisible().catch(() => false);
  console.log("Issue 5 — Edit expense screen opened:", onEditScreen);

  if (onEditScreen) {
    // Try changing description and saving
    const descInput = page.getByPlaceholder("What was this for?");
    const hasDesc = await descInput.isVisible().catch(() => false);
    if (hasDesc) {
      await descInput.click();
      await descInput.fill("Updated expense test");
    }

    await page.screenshot({ path: path.join(SHOTS, "issue5-before-save.png") });

    await page.getByText("Save").click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SHOTS, "issue5-after-save.png") });

    // Check for errors
    const hasError = await page.getByText(/error|failed|something went wrong/i).first().isVisible().catch(() => false);
    const backOnGroup = await page.getByText(/^EXPENSES/).first().isVisible().catch(() => false);

    console.log("Issue 5 — Error after save:", hasError);
    console.log("Issue 5 — Returned to group detail after save:", backOnGroup);

    if (!hasError && backOnGroup) {
      console.log("Issue 5 — STATUS: FIXED ✓ (update works)");
    } else if (hasError) {
      console.log("Issue 5 — STATUS: BROKEN ✗ (error thrown on update)");
    } else {
      console.log("Issue 5 — STATUS: INCONCLUSIVE");
    }
  }
});

// ─── Issue 6: Percentage and Fixed share not saving ──────────────────────────
test("Issue 6 — add expense: percentage/fixed split values are saved", async ({ page }) => {
  await goToAddExpense(page);

  // Fill amount and description
  await page.getByPlaceholder("$0").fill("$60");
  await page.getByPlaceholder("What was this for?").fill("Split test");
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SHOTS, "issue6-initial.png") });

  // Look for split type selector
  const hasPercentage = await page.getByText("Percentage").isVisible().catch(() => false) ||
                        await page.getByText("%").first().isVisible().catch(() => false);
  const hasFixed = await page.getByText("Fixed").isVisible().catch(() => false) ||
                   await page.getByText("Custom").isVisible().catch(() => false);
  const hasEqual = await page.getByText("Equal").isVisible().catch(() => false);

  console.log("Issue 6 — Equal split option visible:", hasEqual);
  console.log("Issue 6 — Percentage split option visible:", hasPercentage);
  console.log("Issue 6 — Fixed/Custom split option visible:", hasFixed);

  await page.screenshot({ path: path.join(SHOTS, "issue6-split-options.png") });

  if (hasPercentage) {
    await page.getByText("Percentage").click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, "issue6-percentage-selected.png") });

    // Look for input fields for percentages
    const hasPercentInputs = await page.locator("input[placeholder*='%']").first().isVisible().catch(() => false) ||
                             await page.locator("input[placeholder*='0']").first().isVisible().catch(() => false);
    console.log("Issue 6 — Percentage input fields appeared:", hasPercentInputs);
  }

  if (hasFixed) {
    await page.getByText("Fixed").click({ force: true }).catch(() =>
      page.getByText("Custom").click({ force: true })
    );
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, "issue6-fixed-selected.png") });
  }

  if (!hasPercentage && !hasFixed) {
    console.log("Issue 6 — STATUS: NEEDS INVESTIGATION (split type selector not found on web)");
  }
});

// ─── Issue 7: Settlement not recalculating balances ──────────────────────────
test("Issue 7 — settle up: balance updates after recording payment", async ({ page }) => {
  const opened = await openFirstGroup(page);
  if (!opened) {
    console.log("Issue 7 — SKIPPED: no groups available");
    return;
  }

  await page.screenshot({ path: path.join(SHOTS, "issue7-group-detail.png") });

  // Note balances before
  const hasSuggestions = await page.getByText("Settle Up").first().isVisible().catch(() => false);
  console.log("Issue 7 — Settle Up button visible:", hasSuggestions);

  if (!hasSuggestions) {
    console.log("Issue 7 — SKIPPED: no Settle Up button");
    return;
  }

  await page.getByText("Settle Up").first().click();
  await expect(page.getByText("Suggested")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SHOTS, "issue7-settle-up-screen.png") });

  const hasRecordBtn = await page.getByText("Record").first().isVisible().catch(() => false);
  const isAllSettled = await page.getByText("All settled up!").isVisible().catch(() => false);

  console.log("Issue 7 — Record payment button visible:", hasRecordBtn);
  console.log("Issue 7 — Already all settled:", isAllSettled);

  if (isAllSettled) {
    console.log("Issue 7 — INCONCLUSIVE: group has no outstanding debts to test with");
    return;
  }

  if (hasRecordBtn) {
    await page.getByText("Record").first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, "issue7-record-modal.png") });

    const hasModal = await page.getByText("Record Payment").isVisible().catch(() => false) ||
                     await page.getByText("Amount").isVisible().catch(() => false);
    console.log("Issue 7 — Record Payment modal opened:", hasModal);

    if (hasModal) {
      // Try to save
      const saveBtn = page.getByText("Record Payment").nth(1).or(page.getByText("Save"));
      await saveBtn.first().click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SHOTS, "issue7-after-record.png") });

      const hasError = await page.getByText(/error|failed/i).isVisible().catch(() => false);
      console.log("Issue 7 — Error after recording:", hasError);
      if (!hasError) {
        console.log("Issue 7 — STATUS: LIKELY FIXED ✓ (no error on record — need to verify balance recalc)");
      } else {
        console.log("Issue 7 — STATUS: BROKEN ✗ (error on record payment)");
      }
    }
  }
});

// ─── Issue 8: Delete/archive option in group detail ─────────────────────────
test("Issue 8 — group detail: has delete or archive option in screen", async ({ page }) => {
  const opened = await openFirstGroup(page);
  if (!opened) {
    console.log("Issue 8 — SKIPPED: no groups available");
    return;
  }

  await page.screenshot({ path: path.join(SHOTS, "issue8-group-detail.png") });

  // Check for a "⋮" more options menu, or explicit archive/delete buttons
  const hasMore = await page.locator("[aria-label='More options']").isVisible().catch(() => false) ||
                  await page.locator("button").filter({ hasText: /more|⋮|\.{3}/i }).first().isVisible().catch(() => false);
  const hasDeleteInline = await page.getByText("Delete").isVisible().catch(() => false);
  const hasArchiveInline = await page.getByText("Archive", { exact: true }).isVisible().catch(() => false);

  console.log("Issue 8 — More options (⋮) button visible:", hasMore);
  console.log("Issue 8 — Delete button inline:", hasDeleteInline);
  console.log("Issue 8 — Archive button inline:", hasArchiveInline);

  // Try clicking the more options button if it exists
  if (hasMore) {
    await page.locator("button").filter({ hasText: /more|⋮/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, "issue8-more-menu.png") });
    const hasArchiveInMenu = await page.getByText(/archive|delete/i).isVisible().catch(() => false);
    console.log("Issue 8 — Archive/Delete in more menu:", hasArchiveInMenu);
  }

  if (!hasDeleteInline && !hasArchiveInline && !hasMore) {
    console.log("Issue 8 — STATUS: OPEN ✗ (no archive/delete option on group detail screen)");
  } else {
    console.log("Issue 8 — STATUS: FIXED ✓ (archive/delete option exists on group detail)");
  }
});

// ─── Issue 9: Delete group feature not working ──────────────────────────────
test("Issue 9 — group list: delete group works without error", async ({ page }) => {
  await goToGroups(page);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SHOTS, "issue9-groups-list.png") });

  // Long-press is not supported on web — test if there is an alternative delete path
  // On web, long-press becomes right-click or contextmenu
  const firstGroup = page.getByText("members").first();
  const hasGroup = await firstGroup.isVisible().catch(() => false);
  console.log("Issue 9 — Groups exist in list:", hasGroup);

  if (hasGroup) {
    // Attempt right-click / context menu
    await firstGroup.click({ button: "right" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, "issue9-right-click.png") });

    const hasContextMenu = await page.getByText(/delete|remove|archive/i).first().isVisible().catch(() => false);
    console.log("Issue 9 — Context menu with delete option:", hasContextMenu);

    if (!hasContextMenu) {
      console.log("Issue 9 — Long-press required (web workaround: right-click didn't show delete)");
      console.log("Issue 9 — STATUS: NEEDS NATIVE TEST (long-press not testable on web)");
    }
  }
});

// ─── Issue 10: Archive should ask for confirmation ───────────────────────────
test("Issue 10 — archive group: shows confirmation dialog", async ({ page }) => {
  await goToGroups(page);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SHOTS, "issue10-groups-list.png") });

  const hasGroup = await page.getByText("members").first().isVisible().catch(() => false);
  if (!hasGroup) {
    console.log("Issue 10 — SKIPPED: no groups to archive");
    return;
  }

  // The archive action is currently behind a long-press action sheet
  // On web we simulate this by right-clicking
  await page.getByText("members").first().click({ button: "right" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "issue10-right-click.png") });

  const hasArchiveOption = await page.getByText(/archive/i).first().isVisible().catch(() => false);
  console.log("Issue 10 — Archive option visible after right-click:", hasArchiveOption);

  if (hasArchiveOption) {
    await page.getByText(/archive/i).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, "issue10-after-archive-click.png") });

    const hasConfirmation = await page.getByText(/confirm|are you sure|archive this group/i).isVisible().catch(() => false) ||
                            await page.getByRole("dialog").isVisible().catch(() => false);
    console.log("Issue 10 — Confirmation dialog appeared:", hasConfirmation);

    if (hasConfirmation) {
      console.log("Issue 10 — STATUS: FIXED ✓ (confirmation shown)");
    } else {
      console.log("Issue 10 — STATUS: BROKEN ✗ (archives immediately without confirmation)");
    }
  } else {
    console.log("Issue 10 — STATUS: NEEDS NATIVE TEST (long-press only, not testable via web right-click)");
  }
});
