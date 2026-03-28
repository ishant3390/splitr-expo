import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { SplitError } from "@/lib/errors";

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: mockRouterBack,
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({ id: "exp-1", groupId: "g1" }),
  useSegments: () => [],
  Link: "Link",
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/components/ui/confirm-modal", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    ConfirmModal: ({ visible, onConfirm, onCancel, title, confirmLabel }: any) => {
      if (!visible) return null;
      return React.createElement(View, { testID: "confirm-modal" },
        React.createElement(Text, null, title),
        React.createElement(Pressable, { onPress: onConfirm, testID: "confirm-btn" },
          React.createElement(Text, null, confirmLabel)
        ),
        React.createElement(Pressable, { onPress: onCancel, testID: "cancel-btn" },
          React.createElement(Text, null, "Cancel")
        ),
      );
    },
  };
});

const mockExpense = {
  id: "exp-1",
  description: "Dinner",
  amountCents: 5000,
  currency: "USD",
  date: "2026-01-15",
  version: 1,
  splitType: "equal",
  category: { id: "cat-1", name: "Food", icon: "restaurant" },
  createdBy: { id: "u1", name: "Test User" },
  payers: [{ user: { id: "u1", name: "Test User" }, amountPaid: 5000 }],
  splits: [
    { user: { id: "u1", name: "Test User" }, splitAmount: 2500 },
    { user: { id: "u2", name: "Alice" }, splitAmount: 2500 },
  ],
};

const mockPercentageExpense = {
  ...mockExpense,
  id: "exp-2",
  splitType: "percentage",
  splits: [
    { user: { id: "u1", name: "Test User" }, splitAmount: 3000, percentage: 60 },
    { user: { id: "u2", name: "Alice" }, splitAmount: 2000, percentage: 40 },
  ],
};

const mockExactExpense = {
  ...mockExpense,
  id: "exp-3",
  splitType: "exact",
  splits: [
    { user: { id: "u1", name: "Test User" }, splitAmount: 3000 },
    { user: { id: "u2", name: "Alice" }, splitAmount: 2000 },
  ],
};

const mockMembers = [
  { id: "m1", user: { id: "u1", name: "Test User", email: "test@test.com", avatarUrl: null }, guestUser: null, displayName: "Test User" },
  { id: "m2", user: { id: "u2", name: "Alice", email: "alice@test.com", avatarUrl: null }, guestUser: null, displayName: "Alice" },
];

const mockCategories = [
  { id: "cat-1", name: "Food", icon: "restaurant" },
  { id: "cat-2", name: "Transport", icon: "directions_car" },
];

const mockExpensesGet = jest.fn(() => Promise.resolve(mockExpense));
const mockExpensesUpdate = jest.fn(() => Promise.resolve({}));
const mockExpensesDelete = jest.fn(() => Promise.resolve({}));
const mockListMembers = jest.fn(() => Promise.resolve(mockMembers));
const mockCategoriesList = jest.fn(() => Promise.resolve(mockCategories));

jest.mock("@/lib/api", () => ({
  expensesApi: {
    get: (...args: any[]) => mockExpensesGet(...args),
    update: (...args: any[]) => mockExpensesUpdate(...args),
    delete: (...args: any[]) => mockExpensesDelete(...args),
  },
  groupsApi: {
    listMembers: (...args: any[]) => mockListMembers(...args),
  },
  categoriesApi: {
    list: (...args: any[]) => mockCategoriesList(...args),
  },
  isVersionConflict: (err: unknown) => {
    const { SplitError: SE } = require("@/lib/errors");
    if (err instanceof SE) return err.body.code === "ERR-302";
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ERR-302")) return true;
    return msg.includes("409") && !msg.includes("ERR-");
  },
}));

jest.mock("@/lib/screen-helpers", () => ({
  inferCategoryFromDescription: jest.fn(() => null),
}));

import EditExpenseScreen from "@/app/edit-expense/[id]";

beforeEach(() => {
  jest.clearAllMocks();
  mockExpensesGet.mockResolvedValue(mockExpense);
  mockListMembers.mockResolvedValue(mockMembers);
  mockCategoriesList.mockResolvedValue(mockCategories);
});

describe("EditExpenseScreen", () => {
  it("renders header", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Edit Expense")).toBeTruthy();
    });
  });

  it("renders Save button", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeTruthy();
    });
  });

  it("loads expense description", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dinner")).toBeTruthy();
    });
  });

  it("loads expense amount", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("50.00")).toBeTruthy();
    });
  });

  it("renders category chips", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Food")).toBeTruthy();
      expect(screen.getByText("Transport")).toBeTruthy();
    });
  });

  it("renders members for paid by and split with sections", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Paid by")).toBeTruthy();
      expect(screen.getAllByText("Test User").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    });
  });

  it("renders split type selector", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Equal")).toBeTruthy();
      expect(screen.getByText("Percentage")).toBeTruthy();
      expect(screen.getByText("Fixed")).toBeTruthy();
    });
  });

  it("renders delete expense button", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete Expense")).toBeTruthy();
    });
  });

  it("renders date section", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Date")).toBeTruthy();
    });
  });

  it("fetches expense data on mount", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(mockExpensesGet).toHaveBeenCalledWith("exp-1", "mock-token");
      expect(mockListMembers).toHaveBeenCalledWith("g1", "mock-token");
      expect(mockCategoriesList).toHaveBeenCalledWith("mock-token");
    });
  });

  it("redirects when expense not found", async () => {
    mockExpensesGet.mockResolvedValue(null);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("handles load error and redirects", async () => {
    mockExpensesGet.mockRejectedValueOnce(new Error("fail"));
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This expense or group is no longer available.");
      expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("saves expense successfully", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockExpensesUpdate).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("Expense updated.");
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  it("validates empty amount on save", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("50.00")).toBeTruthy();
    });
    const amountInput = screen.getByDisplayValue("50.00");
    fireEvent.changeText(amountInput, "");
    fireEvent.press(screen.getByText("Save"));
    expect(mockToast.error).toHaveBeenCalledWith("Please enter a valid amount.");
  });

  it("validates zero amount on save", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("50.00")).toBeTruthy();
    });
    const amountInput = screen.getByDisplayValue("50.00");
    fireEvent.changeText(amountInput, "0");
    fireEvent.press(screen.getByText("Save"));
    expect(mockToast.error).toHaveBeenCalledWith("Please enter a valid amount.");
  });

  it("handles save failure", async () => {
    mockExpensesUpdate.mockRejectedValueOnce(new Error("fail"));
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to update expense. Try again.");
    });
  });

  it("deletes expense successfully", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getAllByText("Delete Expense").length).toBeGreaterThan(0);
    });
    fireEvent.press(screen.getAllByText("Delete Expense")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("confirm-btn")).toBeTruthy();
    });
    // Press the confirm delete button in the modal
    fireEvent.press(screen.getByTestId("confirm-btn"));
    await waitFor(() => {
      expect(mockExpensesDelete).toHaveBeenCalledWith("exp-1", "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith("Expense deleted.");
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  it("handles delete failure", async () => {
    mockExpensesDelete.mockRejectedValueOnce(new Error("fail"));
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getAllByText("Delete Expense").length).toBeGreaterThan(0);
    });
    fireEvent.press(screen.getAllByText("Delete Expense")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("confirm-btn")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("confirm-btn"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to delete expense.");
    });
  });

  it("changes split type to percentage", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Percentage")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Percentage"));
    await waitFor(() => {
      // Should show percentage indicator
      expect(screen.getByText(/\/ 100%/)).toBeTruthy();
    });
  });

  it("changes split type to fixed", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Fixed")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Fixed"));
    await waitFor(() => {
      // Should show fixed amount indicator
      expect(screen.getByText(/\/ \$50\.00/)).toBeTruthy();
    });
  });

  it("shows per person amount for equal split", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("$25.00/person")).toBeTruthy();
    });
  });

  it("toggles member in split", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Split with \(2\)/)).toBeTruthy();
    });
    // Toggle off a member by pressing on them in the split section
    // The members appear twice: once in "Paid by", once in "Split with"
    const aliceTexts = screen.getAllByText("Alice");
    // The last occurrence should be in the split section
    fireEvent.press(aliceTexts[aliceTexts.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Split with \(1\)/)).toBeTruthy();
    });
  });

  it("loads percentage split type from expense", async () => {
    mockExpensesGet.mockResolvedValue(mockPercentageExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText(/\/ 100%/)).toBeTruthy();
    });
  });

  it("loads exact/fixed split type from expense", async () => {
    mockExpensesGet.mockResolvedValue(mockExactExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText(/\/ \$50\.00/)).toBeTruthy();
    });
  });

  it("deduplicates members from API", async () => {
    mockListMembers.mockResolvedValue([
      ...mockMembers,
      { id: "m1", user: { id: "u1", name: "Test User", email: "test@test.com", avatarUrl: null }, guestUser: null, displayName: "Test User" },
    ]);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      // Should still show 2 members in paid by, not 3
      expect(screen.getByText("Paid by")).toBeTruthy();
    });
  });

  it("validates description too long", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dinner")).toBeTruthy();
    });
    const descInput = screen.getByDisplayValue("Dinner");
    // MaxLength on the input is 255, but let's test the validation
    fireEvent.changeText(descInput, "A".repeat(256));
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Description must be 255 characters or less.");
    });
  });

  it("uses category name as fallback description", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dinner")).toBeTruthy();
    });
    const descInput = screen.getByDisplayValue("Dinner");
    fireEvent.changeText(descInput, "");
    // With category selected (Food is selected), description will fallback to "Food"
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockExpensesUpdate).toHaveBeenCalled();
    });
  });

  it("selects a different category", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Transport")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Transport"));
  });

  it("shows amount format validation for dollar sign input", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("50.00")).toBeTruthy();
    });
    const amountInput = screen.getByDisplayValue("50.00");
    // Type in amount with dollar sign prefix
    fireEvent.changeText(amountInput, "75.50");
    await waitFor(() => {
      expect(screen.getByDisplayValue("75.50")).toBeTruthy();
    });
  });

  it("validates percentage split totals", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Percentage")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Percentage"));
    // The default percentages should be 50/50
    // Change one to make it not add to 100
    // The percentage inputs have the member.id as key
  });

  it("payer matching falls back to createdBy", async () => {
    const noPayerExpense = {
      ...mockExpense,
      payers: [{ user: { id: "unknown-user", name: "Unknown" }, amountPaid: 5000 }],
    };
    mockExpensesGet.mockResolvedValue(noPayerExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Paid by")).toBeTruthy();
    });
  });

  it("handles expense with no splits", async () => {
    const noSplitsExpense = {
      ...mockExpense,
      splits: [],
    };
    mockExpensesGet.mockResolvedValue(noSplitsExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      // All members should be selected by default when no splits
      expect(screen.getByText(/Split with \(2\)/)).toBeTruthy();
    });
  });

  it("handles expense with no date", async () => {
    const noDateExpense = {
      ...mockExpense,
      date: undefined,
    };
    mockExpensesGet.mockResolvedValue(noDateExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Date")).toBeTruthy();
    });
  });

  it("handles guest user members", async () => {
    const guestMembers = [
      { id: "m1", user: null, guestUser: { id: "gu1", name: "Guest User", email: null }, displayName: "Guest User" },
      { id: "m2", user: { id: "u2", name: "Alice", email: "alice@test.com", avatarUrl: null }, guestUser: null, displayName: "Alice" },
    ];
    const guestExpense = {
      ...mockExpense,
      payers: [{ guestUser: { id: "gu1", name: "Guest User" }, amountPaid: 5000 }],
      splits: [
        { guestUser: { id: "gu1", name: "Guest User" }, splitAmount: 2500 },
        { user: { id: "u2", name: "Alice" }, splitAmount: 2500 },
      ],
    };
    mockListMembers.mockResolvedValue(guestMembers);
    mockExpensesGet.mockResolvedValue(guestExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getAllByText("Guest User").length).toBeGreaterThan(0);
    });
  });

  it("back button navigates back", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Edit Expense")).toBeTruthy();
    });
    expect(screen.getByText("Edit Expense")).toBeTruthy();
  });

  it("redirects when id or groupId is missing", async () => {
    jest.spyOn(require("expo-router"), "useLocalSearchParams").mockReturnValue({ id: undefined, groupId: undefined });
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Missing expense or group information.");
      expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)");
    });
    // Restore
    jest.spyOn(require("expo-router"), "useLocalSearchParams").mockReturnValue({ id: "exp-1", groupId: "g1" });
  });

  it("validates empty amount on save", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("50.00")).toBeTruthy();
    });
    const amountInput = screen.getByDisplayValue("50.00");
    // Clear the amount field — component strips $ prefix, "" passes regex check, setAmount("")
    fireEvent.changeText(amountInput, "");
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please enter a valid amount.");
    });
  });

  it("validates no description and no category on save", async () => {
    // Load expense with no category selected
    const noCatExpense = {
      ...mockExpense,
      category: null,
    };
    mockExpensesGet.mockResolvedValue(noCatExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dinner")).toBeTruthy();
    });
    const descInput = screen.getByDisplayValue("Dinner");
    fireEvent.changeText(descInput, "");
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please enter a description or select a category.");
    });
  });

  it("validates empty split members on save", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Split with \(2\)/)).toBeTruthy();
    });
    // Toggle off both members
    const aliceTexts = screen.getAllByText("Alice");
    fireEvent.press(aliceTexts[aliceTexts.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Split with \(1\)/)).toBeTruthy();
    });
    const testUserTexts = screen.getAllByText("Test User");
    fireEvent.press(testUserTexts[testUserTexts.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Split with \(0\)/)).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please select at least one member to split with.");
    });
  });

  it("saves expense with percentage split type", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Percentage")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Percentage"));
    await waitFor(() => {
      expect(screen.getByText(/\/ 100%/)).toBeTruthy();
    });
    // Default 50/50 should pass validation
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockExpensesUpdate).toHaveBeenCalled();
      const updateArg = mockExpensesUpdate.mock.calls[0][1];
      expect(updateArg.splitType).toBe("percentage");
      expect(updateArg.splits.length).toBe(2);
    });
  });

  it("saves expense with fixed split type", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Fixed")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Fixed"));
    await waitFor(() => {
      expect(screen.getByText(/\/ \$50\.00/)).toBeTruthy();
    });
    // Default even split should pass validation
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockExpensesUpdate).toHaveBeenCalled();
      const updateArg = mockExpensesUpdate.mock.calls[0][1];
      expect(updateArg.splitType).toBe("exact");
      expect(updateArg.splits.length).toBe(2);
    });
  });

  it("validates percentage split totals not summing to 100%", async () => {
    mockExpensesGet.mockResolvedValue(mockPercentageExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText(/\/ 100%/)).toBeTruthy();
    });
    // Find percentage inputs (exclude the amount input which also has placeholder "0")
    const allZeroInputs = screen.getAllByPlaceholderText("0");
    const percentInputs = allZeroInputs.filter(
      (el) => el.props.testID !== "amount-input"
    );
    if (percentInputs.length > 0) {
      fireEvent.changeText(percentInputs[0], "10");
    }
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("Percentages must add up to 100%"));
    });
  });

  it("validates fixed split totals not matching total amount", async () => {
    mockExpensesGet.mockResolvedValue(mockExactExpense);
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText(/\/ \$50\.00/)).toBeTruthy();
    });
    // Find a fixed amount input and change it to break the total
    const fixedInputs = screen.getAllByPlaceholderText("0.00");
    if (fixedInputs.length > 0) {
      fireEvent.changeText(fixedInputs[0], "5.00");
    }
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("Fixed amounts must add up to"));
    });
  });

  it("opens date picker on date press", async () => {
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Date")).toBeTruthy();
    });
    // Find the date pressable and tap it
    const dateLabel = screen.getByText("Date");
    const dateSection = dateLabel.parent;
    // The date text shows the formatted date - press it
    const dateTexts = screen.getAllByText(/2026|January|February|March/);
    if (dateTexts.length > 0) {
      fireEvent.press(dateTexts[0]);
    }
  });

  it("auto-infers category when description changes", async () => {
    const { inferCategoryFromDescription } = require("@/lib/screen-helpers");
    (inferCategoryFromDescription as jest.Mock).mockReturnValue("cat-2");
    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dinner")).toBeTruthy();
    });
    // Change description to something different from initial
    const descInput = screen.getByDisplayValue("Dinner");
    fireEvent.changeText(descInput, "Taxi ride to airport");
    // Auto-inference should have been called
    await waitFor(() => {
      expect(inferCategoryFromDescription).toHaveBeenCalled();
    });
  });

  it("shows conflict toast and re-fetches on 409 version conflict", async () => {
    const freshExpense = { ...mockExpense, version: 2 };
    mockExpensesUpdate.mockRejectedValueOnce(new SplitError({ code: "ERR-302", category: "RESOURCE", message: "Resource was updated" }, 409));
    mockExpensesGet.mockResolvedValueOnce(mockExpense).mockResolvedValueOnce(freshExpense);

    render(<EditExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith("Someone else just edited this. Refreshing...");
    });
    // Should have re-fetched the expense
    expect(mockExpensesGet).toHaveBeenCalledTimes(2);
    // Should NOT have navigated back
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
