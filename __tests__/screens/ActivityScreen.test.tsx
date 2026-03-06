import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ActivityScreen from "@/app/(tabs)/activity";

const mockRefetch = jest.fn();
const mockUseUserActivity = jest.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

jest.mock("@/lib/hooks", () => ({
  useUserActivity: (...args: any[]) => mockUseUserActivity(...args),
}));

beforeEach(() => {
  mockUseUserActivity.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  });
});

describe("ActivityScreen", () => {
  it("renders header", () => {
    render(<ActivityScreen />);
    expect(screen.getByText("Activity")).toBeTruthy();
  });

  it("shows empty state when no activity", async () => {
    render(<ActivityScreen />);
    await waitFor(() => {
      expect(screen.getByText("No activity yet")).toBeTruthy();
    });
  });

  it("renders activity items when data exists", async () => {
    mockUseUserActivity.mockReturnValue({
      data: [
        {
          id: "a1",
          activityType: "expense_created",
          actorUserName: "Alice",
          groupName: "Trip",
          createdAt: "2026-03-05T10:00:00Z",
          details: { description: "Dinner" },
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ActivityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Expense created")).toBeTruthy();
      expect(screen.getByText("Dinner")).toBeTruthy();
    });
  });
});
