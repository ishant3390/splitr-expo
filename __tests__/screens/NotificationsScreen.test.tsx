import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import NotificationsScreen from "@/app/notifications";

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

describe("NotificationsScreen", () => {
  it("renders header", async () => {
    render(<NotificationsScreen />);
    expect(screen.getByText("Notifications")).toBeTruthy();
  });

  it("shows empty state when no notifications", async () => {
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeTruthy();
    });
  });

  it("renders notification items when data exists", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseUserActivity.mockReturnValue({
      data: [
        {
          id: "n1",
          activityType: "expense_created",
          actorUserName: "Alice",
          groupName: "Trip",
          createdAt: "2026-03-05T10:00:00Z",
          details: { description: "Lunch" },
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Alice added "Lunch" in Trip/)).toBeTruthy();
    });

    Date.now = realDateNow;
  });
});
