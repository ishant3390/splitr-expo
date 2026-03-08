import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import ChatScreen from "@/app/chat";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

const mockGetToken = jest.fn(() => Promise.resolve("test-token"));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock("@/lib/haptics", () => ({
  hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(),
  hapticLight: jest.fn(),
}));

jest.mock("@/lib/query", () => ({
  invalidateAfterExpenseChange: jest.fn(),
  invalidateAfterGroupChange: jest.fn(),
}));

// Mock chatStream
let mockOnEvent: ((event: any) => void) | null = null;
let mockOnDone: (() => void) | null = null;
let mockOnError: ((err: Error) => void) | null = null;
const mockAbort = jest.fn();

jest.mock("@/lib/api", () => ({
  chatStream: jest.fn(
    (
      message: string,
      conversationId: string | null,
      token: string,
      onEvent: any,
      onDone: any,
      onError: any
    ) => {
      mockOnEvent = onEvent;
      mockOnDone = onDone;
      mockOnError = onError;
      return mockAbort;
    }
  ),
  chatApi: {
    quota: jest.fn(() =>
      Promise.resolve({ dailyUsed: 3, dailyLimit: 15, resetsAt: "2026-03-07T00:00:00Z", tier: "free" })
    ),
  },
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/components/NetworkProvider", () => ({
  useNetwork: () => ({ isOnline: true, pendingCount: 0, refreshPendingCount: jest.fn() }),
}));

jest.mock("@/lib/hooks", () => ({
  useMergedContacts: () => ({
    data: [
      { userId: "u1", name: "Sarah", email: "sarah@test.com", isGuest: false },
      { userId: "u2", name: "Mike", email: "mike@test.com", isGuest: false },
    ],
    isLoading: false,
    refreshRecents: jest.fn(),
  }),
  useGroups: () => ({ data: [
    { id: "g1", name: "Beach Trip", emoji: "🏖️", memberCount: 3, isArchived: false, createdAt: "", updatedAt: "" },
    { id: "g2", name: "Roommates", emoji: "🏠", memberCount: 2, isArchived: false, createdAt: "", updatedAt: "" },
  ] }),
}));

jest.mock("@/lib/mention-recency", () => ({
  trackMention: jest.fn(() => Promise.resolve()),
}));

describe("ChatScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnEvent = null;
    mockOnDone = null;
    mockOnError = null;
    mockSearchParams = {};
  });

  it("renders welcome message and suggested prompts", () => {
    render(<ChatScreen />);
    expect(screen.getByText(/I'm your Splitr assistant/)).toBeTruthy();
    expect(screen.getByText("Split $50 for dinner with @Sarah and @Mike")).toBeTruthy();
    expect(screen.getByText("Add $120 hotel expense in #Beach Trip")).toBeTruthy();
  });

  it("renders header with back button", () => {
    render(<ChatScreen />);
    expect(screen.getByText("Split Assistant")).toBeTruthy();
  });

  it("sends user message and shows it in the list", async () => {
    const { chatStream: mockChatStream } = require("@/lib/api");
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Split $20 with Alice");
    fireEvent(input, "submitEditing");

    await waitFor(() => {
      expect(screen.getByText("Split $20 with Alice")).toBeTruthy();
    });

    expect(mockChatStream).toHaveBeenCalledWith(
      "Split $20 with Alice",
      null,
      "test-token",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      undefined
    );
  });

  it("sends suggested prompt on tap", async () => {
    const { chatStream: mockChatStream } = require("@/lib/api");
    render(<ChatScreen />);

    fireEvent.press(
      screen.getByText("Split $50 for dinner with @Sarah and @Mike")
    );

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        "Split $50 for dinner with @Sarah and @Mike",
        null,
        "test-token",
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        undefined
      );
    });
  });

  it("displays streamed text from assistant", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Hello");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnEvent).not.toBeNull());

    mockOnEvent!({
      type: "thinking",
      conversationId: "conv-1",
    });
    mockOnEvent!({
      type: "text_chunk",
      content: "I found your ",
      conversationId: "conv-1",
    });
    mockOnEvent!({
      type: "text_chunk",
      content: "group!",
      conversationId: "conv-1",
    });
    mockOnDone!();

    await waitFor(() => {
      expect(screen.getByText("I found your group!")).toBeTruthy();
    });
  });

  it("renders group selection cards on action_required", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Split $50 with Sarah");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnEvent).not.toBeNull());

    mockOnEvent!({
      type: "text",
      content: "I found Sarah in multiple groups:",
      conversationId: "conv-1",
    });
    mockOnEvent!({
      type: "action_required",
      conversationId: "conv-1",
      action: {
        action: "select_group",
        requestId: "req-1",
        options: [
          {
            groupId: "g1",
            name: "Beach Trip",
            emoji: "",
            members: ["Sarah", "You"],
            lastActivity: "2 days ago",
          },
          {
            groupId: "g2",
            name: "Roommates",
            emoji: "",
            members: ["Sarah", "Mike", "You"],
          },
        ],
      },
    });
    mockOnDone!();

    await waitFor(() => {
      expect(screen.getByText("Which group?")).toBeTruthy();
      expect(screen.getByText("Beach Trip")).toBeTruthy();
      expect(screen.getByText("Roommates")).toBeTruthy();
    });
  });

  it("renders expense confirmation card", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Split $50 dinner with Sarah");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnEvent).not.toBeNull());

    mockOnEvent!({
      type: "text",
      content: "Here's what I'll add:",
      conversationId: "conv-1",
    });
    mockOnEvent!({
      type: "action_required",
      conversationId: "conv-1",
      action: {
        action: "confirm_expense",
        requestId: "req-2",
        expensePreview: {
          description: "Dinner",
          totalAmountCents: 5000,
          currency: "USD",
          groupId: "g1",
          groupName: "Beach Trip",
          splits: [
            { name: "You", amountCents: 2500 },
            { name: "Sarah", amountCents: 2500 },
          ],
          payerName: "You",
          expenseDate: "2026-03-06",
        },
      },
    });
    mockOnDone!();

    await waitFor(() => {
      expect(screen.getByText("Confirm Expense")).toBeTruthy();
      expect(screen.getByText("Dinner")).toBeTruthy();
      expect(screen.getByText("Beach Trip")).toBeTruthy();
      expect(screen.getByText("Confirm")).toBeTruthy();
      expect(screen.getByText("Edit")).toBeTruthy();
    });
  });

  it("edit button navigates to add expense with pre-filled data including currency", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Add dinner");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnEvent).not.toBeNull());

    mockOnEvent!({
      type: "action_required",
      conversationId: "conv-1",
      action: {
        action: "confirm_expense",
        requestId: "req-3",
        expensePreview: {
          description: "Dinner",
          totalAmountCents: 5000,
          currency: "EUR",
          groupId: "g1",
          groupName: "Beach Trip",
          splits: [{ name: "You", amountCents: 5000 }],
          payerName: "You",
          expenseDate: "2026-03-06",
        },
      },
    });
    mockOnDone!();

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Edit"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/add",
      params: {
        amount: "50",
        description: "Dinner",
        date: "2026-03-06",
        groupId: "g1",
        currency: "EUR",
      },
    });
  });

  it("renders expense created success card and invalidates cache", async () => {
    const { invalidateAfterExpenseChange } = require("@/lib/query");
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "confirm");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnEvent).not.toBeNull());

    mockOnEvent!({
      type: "expense_created",
      conversationId: "conv-1",
      expense: {
        id: "exp-1",
        groupId: "g1",
        description: "Dinner",
        totalAmountCents: 5000,
        currency: "USD",
        groupName: "Beach Trip",
        perPersonCents: 2500,
        splitCount: 2,
      },
    });
    mockOnDone!();

    await waitFor(() => {
      expect(screen.getByText("Expense Added!")).toBeTruthy();
      // C3: Verify cache invalidation
      expect(invalidateAfterExpenseChange).toHaveBeenCalledWith("g1");
    });
  });

  it("shows error message on stream failure with retry", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Hello");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnError).not.toBeNull());

    mockOnError!(new Error("Network error"));

    await waitFor(() => {
      expect(
        screen.getByText("Sorry, something went wrong. Please try again.")
      ).toBeTruthy();
      // H6: Retry button
      expect(screen.getByText("Tap to retry")).toBeTruthy();
    });
  });

  it("shows error from SSE error event", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Hello");
    fireEvent(input, "submitEditing");

    await waitFor(() => expect(mockOnEvent).not.toBeNull());

    mockOnEvent!({
      type: "error",
      message: "Daily chat limit exceeded",
      code: "QUOTA_EXCEEDED",
    });

    await waitFor(() => {
      expect(screen.getByText("Daily chat limit exceeded")).toBeTruthy();
    });
  });

  // C2: Null token handling
  it("shows session expired when token is null", async () => {
    // First call is quota fetch (useEffect), second is sendMessage
    mockGetToken.mockResolvedValueOnce("test-token").mockResolvedValueOnce(null);
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Hello");
    fireEvent(input, "submitEditing");

    await waitFor(() => {
      expect(
        screen.getByText("Your session has expired. Please sign in again.")
      ).toBeTruthy();
    });
  });

  // C5: Double-send prevention
  it("prevents double-send on rapid taps", async () => {
    const { chatStream: mockChatStream } = require("@/lib/api");
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Hello");
    fireEvent(input, "submitEditing");

    // Try to send again immediately
    fireEvent.changeText(input, "Hello again");
    fireEvent(input, "submitEditing");

    await waitFor(() => {
      // Should only call chatStream once (second blocked by sendingRef)
      expect(mockChatStream).toHaveBeenCalledTimes(1);
    });
  });

  // M3: Only show "Thinking..." before streaming starts
  it("hides thinking indicator once streaming text arrives", async () => {
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "Hello");
    fireEvent(input, "submitEditing");

    // Before any events, should show "Thinking..."
    await waitFor(() => {
      expect(screen.getByText("Thinking...")).toBeTruthy();
    });

    // Once text arrives, "Thinking..." should disappear
    mockOnEvent!({
      type: "text",
      content: "Hello!",
      conversationId: "conv-1",
    });

    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeTruthy();
      expect(screen.queryByText("Thinking...")).toBeNull();
    });
  });

  // Quota events
  it("handles quota SSE event and updates header", async () => {
    const { chatApi } = require("@/lib/api");
    chatApi.quota.mockResolvedValueOnce({
      dailyUsed: 13,
      dailyLimit: 15,
      resetsAt: "2026-03-07T00:00:00Z",
      tier: "free",
    });

    render(<ChatScreen />);

    await waitFor(() => {
      expect(screen.getByText("2 messages left today")).toBeTruthy();
    });
  });

  it("shows quota exceeded card when limit reached", async () => {
    const { chatApi } = require("@/lib/api");
    chatApi.quota.mockResolvedValueOnce({
      dailyUsed: 15,
      dailyLimit: 15,
      resetsAt: "2026-03-07T00:00:00Z",
      tier: "free",
    });

    render(<ChatScreen />);

    await waitFor(() => {
      // Header + card both show limit info
      expect(screen.getAllByText("Daily limit reached").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Add Expense Manually")).toBeTruthy();
    });
  });

  // Empty input guard
  it("does not send empty input", async () => {
    const { chatStream: mockChatStream } = require("@/lib/api");
    render(<ChatScreen />);

    const input = screen.getByPlaceholderText("Type a message... (@ for people, # for groups)");
    fireEvent.changeText(input, "   ");
    fireEvent(input, "submitEditing");

    // chatStream should not be called
    expect(mockChatStream).not.toHaveBeenCalled();
  });

  // B47: Scroll-to-bottom FAB
  it("renders scroll-to-bottom button with accessibility label", () => {
    render(<ChatScreen />);
    // FAB should not be visible initially (no scroll)
    expect(screen.queryByLabelText("Scroll to bottom")).toBeNull();
  });

  // B35: Suggested prompt for balance queries
  it("renders 'Who owes me money?' suggested prompt", () => {
    render(<ChatScreen />);
    expect(screen.getByText("Who owes me money?")).toBeTruthy();
  });

  it("sends balance query suggested prompt on tap", async () => {
    const { chatStream: mockChatStream } = require("@/lib/api");
    render(<ChatScreen />);

    fireEvent.press(screen.getByText("Who owes me money?"));

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        "Who owes me money?",
        null,
        "test-token",
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        undefined
      );
    });
  });

  // B34: Receipt auto-send
  it("auto-sends receipt message when receiptMessage param is provided", async () => {
    jest.useFakeTimers();
    const { chatStream: mockChatStream } = require("@/lib/api");
    mockSearchParams = { receiptMessage: "Split $16.20 from Test Cafe on 2026-03-06" };

    render(<ChatScreen />);

    // Advance past the 300ms delay
    jest.advanceTimersByTime(350);

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        "Split $16.20 from Test Cafe on 2026-03-06",
        null,
        "test-token",
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        undefined
      );
    });

    jest.useRealTimers();
  });
});
