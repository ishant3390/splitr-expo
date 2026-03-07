import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import NotificationsScreen from "@/app/notifications";

const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
const mockUseNotifications = jest.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: mockRefetch,
  fetchNextPage: mockFetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
}));

jest.mock("@/lib/hooks", () => ({
  useNotifications: (...args: any[]) => mockUseNotifications(...args),
}));

beforeEach(() => {
  mockUseNotifications.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
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

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Trip to Paris",
          body: "Alice added $50.00 for Lunch",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T10:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
      expect(screen.getByText("Alice added $50.00 for Lunch")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows loading skeleton", () => {
    mockUseNotifications.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<NotificationsScreen />);
    // Skeleton renders, no "No notifications" message
    expect(screen.queryByText("No notifications yet")).toBeNull();
  });
});
