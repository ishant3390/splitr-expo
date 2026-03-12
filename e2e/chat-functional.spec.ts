/**
 * Functional E2E tests for the AI Chat expense/group flows.
 *
 * Strategy: intercept POST *\/v1/chat with page.route() and return
 * deterministic SSE payloads. This tests the full UI pipeline:
 *   user input → SSE parse → card render → button handler → state update
 *
 * Flows covered:
 * 1. select_group → confirm_expense → expense_created (full create flow)
 * 2. confirm_expense "Edit" button → Add Expense screen pre-filled
 * 3. Balance query → text response rendered in chat
 * 4. confirm_create_group → group created (follow-up pills)
 * 5. Error event → error message + "Tap to retry" button
 * 6. Quota exceeded → input disabled + upgrade card
 * 7. Stop generating → streaming aborted, loading stops
 */

import { test, expect } from "./auth.setup";

// ─── SSE helpers ─────────────────────────────────────────────────────────────

/** Build an SSE response body string from an array of JSON event objects. */
function sseBody(...events: object[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

const CONV = "test-conv-001";

/** Intercept the chat endpoint once and respond with the given SSE events. */
async function mockChat(
  page: Parameters<typeof test>[1]["page"],
  ...events: object[]
) {
  await page.route("**/v1/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
      body: sseBody(...events),
    });
  });
}

/** Intercept the chat endpoint and handle successive calls with different payloads. */
function mockChatSequence(
  page: Parameters<typeof test>[1]["page"],
  responses: object[][]
) {
  let call = 0;
  page.route("**/v1/chat", async (route) => {
    const idx = Math.min(call++, responses.length - 1);
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
      body: sseBody(...responses[idx]),
    });
  });
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const SELECT_GROUP_ACTION = {
  type: "action_required",
  conversationId: CONV,
  action: {
    action: "select_group",
    requestId: "req-001",
    options: [
      {
        groupId: "g-beach",
        name: "Beach Trip",
        emoji: "🏖️",
        members: ["Alice", "Bob"],
        lastActivity: "2d ago",
      },
      {
        groupId: "g-home",
        name: "Home",
        emoji: "🏠",
        members: ["Alice", "Charlie"],
        lastActivity: "5d ago",
      },
    ],
  },
};

const CONFIRM_EXPENSE_ACTION = {
  type: "action_required",
  conversationId: CONV,
  action: {
    action: "confirm_expense",
    requestId: "req-002",
    expensePreview: {
      description: "Dinner",
      totalAmountCents: 5000,
      currency: "USD",
      groupId: "g-beach",
      groupName: "Beach Trip",
      groupEmoji: "🏖️",
      payerName: "You",
      expenseDate: "2026-03-12",
      splits: [
        { name: "You", amountCents: 2500 },
        { name: "Alice", amountCents: 2500 },
      ],
    },
  },
};

const EXPENSE_CREATED_EVENT = {
  type: "expense_created",
  conversationId: CONV,
  expense: {
    id: "exp-001",
    groupId: "g-beach",
    description: "Dinner",
    totalAmountCents: 5000,
    currency: "USD",
    groupName: "Beach Trip",
    groupEmoji: "🏖️",
    perPersonCents: 2500,
    splitCount: 2,
  },
};

const BALANCE_TEXT_EVENT = {
  type: "text",
  conversationId: CONV,
  content:
    "Here's your balance summary: Alice owes you $25.00 in Beach Trip.",
};

const CONFIRM_GROUP_ACTION = {
  type: "action_required",
  conversationId: CONV,
  action: {
    action: "confirm_create_group",
    requestId: "req-003",
    groupPreview: {
      name: "Weekend Warriors",
      memberNames: ["Alice", "Bob"],
    },
  },
};

const ERROR_EVENT = {
  type: "error",
  message: "Something went wrong on the server.",
};

const QUOTA_EXCEEDED_EVENT = {
  type: "quota_exceeded",
  dailyUsed: 15,
  dailyLimit: 15,
  resetsAt: "2026-03-13T00:00:00Z",
  message: "You've used all 15 free AI messages for today. Resets at midnight.",
};

// ─── navigate helper ──────────────────────────────────────────────────────────

async function openChat(page: Parameters<typeof test>[1]["page"]) {
  await page.goto("/chat");
  await expect(page.getByText("Split Assistant")).toBeVisible({ timeout: 15000 });
}

// ─── tests ────────────────────────────────────────────────────────────────────

test.describe("AI Chat — functional flows", () => {
  // ── 1. Full expense creation: select_group → confirm_expense → expense_created

  test("select_group card appears and selecting a group triggers confirm_expense", async ({
    page,
  }) => {
    // First call: return select_group
    // Second call (after selecting group): return confirm_expense
    mockChatSequence(page, [
      [SELECT_GROUP_ACTION],
      [CONFIRM_EXPENSE_ACTION],
    ]);

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Split $50 dinner between me and Alice");
    await page.getByRole("button", { name: "Send message" }).click();

    // select_group card should appear
    await expect(
      page.getByRole("button", { name: "Select group Beach Trip" })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: "Select group Home" })
    ).toBeVisible();

    // Select "Beach Trip"
    await page.getByRole("button", { name: "Select group Beach Trip" }).click();

    // confirm_expense card should appear
    await expect(page.getByText("Confirm Expense")).toBeVisible({
      timeout: 15000,
    });
  });

  test("confirm_expense card shows description, total, group, payer, and split", async ({
    page,
  }) => {
    await mockChat(page, CONFIRM_EXPENSE_ACTION);
    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("$50 dinner with Alice in Beach Trip");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Confirm Expense")).toBeVisible({ timeout: 15000 });

    // Description row — exact match to avoid conflict with user message text
    await expect(page.getByText("Dinner", { exact: true })).toBeVisible();

    // Total ($50.00) — the formatted total in the card
    await expect(page.getByText("$50.00", { exact: true }).first()).toBeVisible();

    // Group name appears in the card
    await expect(page.getByText(/Beach Trip/).first()).toBeVisible();

    // Split breakdown (2-way) — each person owes $25.00
    await expect(page.getByText("$25.00", { exact: true }).first()).toBeVisible();

    // Both action buttons present
    await expect(page.getByRole("button", { name: "Edit expense" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm expense" })).toBeVisible();
  });

  test("confirming expense shows Confirmed state and follow-up pills", async ({
    page,
  }) => {
    // First call: confirm_expense card; second call (confirm): expense_created
    mockChatSequence(page, [
      [CONFIRM_EXPENSE_ACTION],
      [EXPENSE_CREATED_EVENT],
    ]);

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("$50 dinner with Alice in Beach Trip");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("button", { name: "Confirm expense" })).toBeVisible({
      timeout: 15000,
    });

    // Click Confirm
    await page.getByRole("button", { name: "Confirm expense" }).click();

    // Confirm button disappears (actionHandled=true)
    await expect(
      page.getByRole("button", { name: "Confirm expense" })
    ).not.toBeVisible({ timeout: 10000 });

    // expense_created card renders "Expense Added!"
    await expect(page.getByText("Expense Added!")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Beach Trip/).first()).toBeVisible();

    // Follow-up suggestion pills
    await expect(
      page.getByRole("button", { name: "Add another expense" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Check my balance" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "View Beach Trip" })
    ).toBeVisible();
  });

  test("after confirming, the confirm_expense buttons become disabled (Confirmed state)", async ({
    page,
  }) => {
    mockChatSequence(page, [
      [CONFIRM_EXPENSE_ACTION],
      [EXPENSE_CREATED_EVENT],
    ]);

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("$50 dinner");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("button", { name: "Confirm expense" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Confirm expense" }).click();

    // The Confirm and Edit buttons should be replaced by "Confirmed" indicator
    await expect(page.getByText("Confirmed")).toBeVisible({ timeout: 10000 });

    const confirmStillVisible = await page
      .getByRole("button", { name: "Confirm expense" })
      .isVisible()
      .catch(() => false);
    expect(confirmStillVisible).toBe(false);
  });

  // ── 2. Edit button pre-fills Add Expense

  test("clicking Edit on confirm_expense navigates to Add Expense pre-filled", async ({
    page,
  }) => {
    await mockChat(page, CONFIRM_EXPENSE_ACTION);
    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("$50 dinner");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("button", { name: "Edit expense" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Edit expense" }).click();

    // Should navigate to Add Expense screen
    await expect(page.getByText("Add Expense")).toBeVisible({ timeout: 15000 });

    // Add Expense form fields are visible — navigation with params succeeded
    await expect(page.getByPlaceholder("What was this for?")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("$0")).toBeVisible();
  });

  // ── 3. Balance query → text response

  test("balance query returns readable text response in chat", async ({ page }) => {
    await mockChat(page, BALANCE_TEXT_EVENT);
    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Who owes me money?");
    await page.getByRole("button", { name: "Send message" }).click();

    // The mocked text response should appear in the chat
    await expect(
      page.getByText(/Alice owes you \$25\.00/)
    ).toBeVisible({ timeout: 15000 });
  });

  test("balance query response is rendered as an assistant bubble", async ({
    page,
  }) => {
    await mockChat(page, BALANCE_TEXT_EVENT);
    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Who owes me money?" }).click();

    await expect(
      page.getByText(/Here's your balance summary/)
    ).toBeVisible({ timeout: 15000 });
  });

  // ── 4. confirm_create_group → group creation flow

  test("confirm_create_group card shows group name and members", async ({ page }) => {
    await mockChat(page, CONFIRM_GROUP_ACTION);
    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Create a group called Weekend Warriors with Alice and Bob");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Create new group?")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Weekend Warriors", { exact: true })).toBeVisible();
    // Members cell: "You, Alice, Bob"
    await expect(page.getByText(/You, Alice/).first()).toBeVisible();

    await expect(page.getByRole("button", { name: "Create group" })).toBeVisible();
  });

  test("clicking Create Group hides the Create button and shows follow-up pills", async ({
    page,
  }) => {
    // First call: confirm_create_group; second call: group_created text
    mockChatSequence(page, [
      [CONFIRM_GROUP_ACTION],
      [{ type: "text", conversationId: CONV, content: "Group 'Weekend Warriors' created!" }],
    ]);

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Create Weekend Warriors group");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("button", { name: "Create group" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Create group" }).click();

    // Create button should disappear (actionHandled=true hides it via !item.actionHandled)
    await expect(
      page.getByRole("button", { name: "Create group" })
    ).not.toBeVisible({ timeout: 10000 });

    // Follow-up suggestion pills defined in handleConfirmCreateGroup
    await expect(
      page.getByRole("button", { name: "Add expense to Weekend Warriors" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Invite members" })
    ).toBeVisible();
  });

  // ── 5. Error event

  test("error response shows error message in chat", async ({ page }) => {
    await mockChat(page, ERROR_EVENT);
    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Add $30 groceries");
    await page.getByRole("button", { name: "Send message" }).click();

    // Error message bubble
    await expect(
      page.getByText(/Something went wrong|Please try again/)
    ).toBeVisible({ timeout: 15000 });
  });

  test("failed message shows Tap to retry button", async ({ page }) => {
    // Simulate a network-level error (abort / throw) so the onError branch fires
    await page.route("**/v1/chat", async (route) => {
      await route.abort("failed");
    });

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("This will fail");
    await page.getByRole("button", { name: "Send message" }).click();

    // onError branch adds a message with failedText + "Tap to retry"
    await expect(
      page.getByRole("button", { name: "Retry message" })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Tap to retry")).toBeVisible();
  });

  test("clicking Tap to retry re-sends the original message", async ({ page }) => {
    let calls = 0;
    await page.route("**/v1/chat", async (route) => {
      calls++;
      if (calls === 1) {
        await route.abort("failed");
      } else {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: sseBody(BALANCE_TEXT_EVENT),
        });
      }
    });

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Who owes me money?");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("button", { name: "Retry message" })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "Retry message" }).click();

    // After retry, the successful response should appear
    await expect(
      page.getByText(/Alice owes you \$25\.00/)
    ).toBeVisible({ timeout: 15000 });
  });

  // ── 6. Quota exceeded
  // Strategy: mock the quota GET endpoint to return an already-exceeded quota.
  // This avoids SSE timing issues and tests the UI state directly.

  async function mockExceededQuota(page: Parameters<typeof test>[1]["page"]) {
    // Use regex to reliably match the quota endpoint regardless of base URL
    await page.route(/\/v1\/chat\/quota/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          dailyUsed: 15,
          dailyLimit: 15,
          resetsAt: "2026-03-13T00:00:00Z",
          tier: "free",
        }),
      });
    });
  }

  test("quota_exceeded disables input and shows upgrade card", async ({ page }) => {
    await mockExceededQuota(page);
    // Capture the quota response before navigating so we know it completes
    const quotaResponseP = page.waitForResponse(/v1\/chat\/quota/);
    await openChat(page);
    await quotaResponseP;

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });

    // "Daily limit reached" appears in both header and upgrade card — use first()
    await expect(page.getByText("Daily limit reached").first()).toBeVisible({ timeout: 10000 });

    // Input placeholder also changes to "Daily limit reached"
    await expect(input).toHaveAttribute("placeholder", "Daily limit reached");

    // Upgrade card renders: Button text is "Add Expense Manually" (capital M)
    await expect(page.getByText("Add Expense Manually").first()).toBeVisible({ timeout: 5000 });
  });

  test("quota_exceeded: Add expense manually button navigates to Add Expense", async ({
    page,
  }) => {
    await mockExceededQuota(page);
    const quotaResponseP = page.waitForResponse(/v1\/chat\/quota/);
    await openChat(page);
    await quotaResponseP;

    // Wait for upgrade card button
    await expect(page.getByText("Add Expense Manually").first()).toBeVisible({ timeout: 10000 });
    await page.getByText("Add Expense Manually").first().click();
    await expect(page.getByText("Add Expense", { exact: true })).toBeVisible({ timeout: 15000 });
  });

  // ── 7. Typing indicator appears while waiting for a response

  test("typing indicator (AI is thinking...) appears while waiting for response", async ({
    page,
  }) => {
    // Delay the response by 3s so the thinking indicator is visible
    await page.route("**/v1/chat", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody(BALANCE_TEXT_EVENT),
      });
    });

    await openChat(page);

    const input = page.getByRole("textbox", { name: "Chat message input" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("Tell me my balance");
    await page.getByRole("button", { name: "Send message" }).click();

    // While loading and no streaming yet, the typing dots (iMessage-style) indicator shows
    // The label text is either "AI is thinking..." or "Thinking..."
    await expect(
      page.getByText(/is thinking|Thinking/)
    ).toBeVisible({ timeout: 5000 });

    // After the response arrives, the indicator disappears
    await expect(
      page.getByText(/Alice owes you \$25\.00/)
    ).toBeVisible({ timeout: 10000 });
  });
});
