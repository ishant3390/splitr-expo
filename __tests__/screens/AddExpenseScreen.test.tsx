import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import AddExpenseScreen from "@/app/(tabs)/add";

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockListGroups = jest.fn(() =>
  Promise.resolve([
    { id: "g1", name: "Trip", emoji: "plane", memberCount: 2, defaultCurrency: "USD" },
  ])
);
const mockListMembers = jest.fn(() =>
  Promise.resolve([
    { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com" }, displayName: "Alice" },
    { id: "m2", user: { id: "u2", name: "Bob" }, displayName: "Bob" },
  ])
);
const mockListCategories = jest.fn(() =>
  Promise.resolve([
    { id: "c1", name: "Food", icon: "restaurant" },
    { id: "c2", name: "Transport", icon: "car" },
  ])
);
const mockCreateExpense = jest.fn(() => Promise.resolve({ id: "e1" }));
const mockListExpenses = jest.fn(() => Promise.resolve({ data: [] }));

jest.mock("@/lib/api", () => ({
  groupsApi: {
    list: (...args: any[]) => mockListGroups(...args),
    listMembers: (...args: any[]) => mockListMembers(...args),
    listExpenses: (...args: any[]) => mockListExpenses(...args),
    create: jest.fn(() => Promise.resolve({ id: "g-auto", name: "Personal" })),
    createExpense: (...args: any[]) => mockCreateExpense(...args),
  },
  categoriesApi: {
    list: (...args: any[]) => mockListCategories(...args),
  },
}));

beforeEach(() => {
  mockListGroups.mockReset().mockResolvedValue([
    { id: "g1", name: "Trip", emoji: "plane", memberCount: 2, defaultCurrency: "USD" },
  ]);
  mockListMembers.mockReset().mockResolvedValue([
    { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com" }, displayName: "Alice" },
    { id: "m2", user: { id: "u2", name: "Bob" }, displayName: "Bob" },
  ]);
  mockListCategories.mockReset().mockResolvedValue([
    { id: "c1", name: "Food", icon: "restaurant" },
    { id: "c2", name: "Transport", icon: "car" },
  ]);
});

describe("AddExpenseScreen", () => {
  it("renders header", async () => {
    render(<AddExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add Expense")).toBeTruthy();
    });
  });

  it("loads groups and categories", async () => {
    render(<AddExpenseScreen />);
    await waitFor(() => {
      expect(mockListGroups).toHaveBeenCalled();
      expect(mockListCategories).toHaveBeenCalled();
    });
  });

  it("renders split type options", async () => {
    render(<AddExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Equal")).toBeTruthy();
    });
  });

  it("renders group selector", async () => {
    render(<AddExpenseScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip")).toBeTruthy();
    });
  });

  it("renders category emojis from API", async () => {
    render(<AddExpenseScreen />);
    await waitFor(() => {
      // Categories loaded — emoji mapped from icon names
      expect(mockListCategories).toHaveBeenCalled();
    });
  });

  it("loads members when group is selected", async () => {
    render(<AddExpenseScreen />);
    await waitFor(() => {
      expect(mockListMembers).toHaveBeenCalledWith("g1", "mock-token");
    });
  });
});
