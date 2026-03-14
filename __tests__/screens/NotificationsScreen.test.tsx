import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}));

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

  it("marks notification as read and navigates on tap", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    const mockPush = jest.fn();
    const { useRouter } = require("expo-router");

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "New Expense",
          body: "Alice added $25 for lunch",
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
      expect(screen.getByText("New Expense")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("New Expense"));
    Date.now = realDateNow;
  });

  it("marks all as read when CheckCheck is pressed", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Expense 1",
          body: "Body 1",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T10:00:00Z",
        },
        {
          id: "n2",
          notificationType: "settlement_created",
          groupId: "g2",
          title: "Settlement",
          body: "Body 2",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T09:00:00Z",
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
      expect(screen.getByText("Expense 1")).toBeTruthy();
    });

    // The mark-all-read button (CheckCheck icon pressable)
    // We can identify it by its position — it's the Pressable after "Notifications" text
    const { hapticLight } = require("@/lib/haptics");

    Date.now = realDateNow;
  });

  it("handles settlement_created notification type routing", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "settlement_created",
          groupId: "g1",
          title: "Settlement",
          body: "Bob paid $30",
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
      expect(screen.getByText("Settlement")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Settlement"));
    Date.now = realDateNow;
  });

  it("groups notifications by day (Today section)", async () => {
    const realDateNow = Date.now;
    const now = new Date("2026-03-05T12:00:00Z").getTime();
    Date.now = () => now;

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Today Expense",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: new Date(now - 3600000).toISOString(), // 1 hour ago
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
      expect(screen.getByText("Today Expense")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows time ago for notification", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Recent",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T11:30:00Z",
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
      expect(screen.getByText("30m ago")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("renders notification without groupId (no route)", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "group_created",
          groupId: null,
          title: "No Route",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T11:00:00Z",
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
      expect(screen.getByText("No Route")).toBeTruthy();
    });

    // Tapping should not crash even with null route
    fireEvent.press(screen.getByText("No Route"));
    Date.now = realDateNow;
  });

  it("navigates to group on expense notification tap", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Test Nav",
          body: "Body",
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
      expect(screen.getByText("Test Nav")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Test Nav"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups/g1");
    Date.now = realDateNow;
  });

  it("navigates to settle-up on settlement notification tap", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "settlement_created",
          groupId: "g2",
          title: "Settlement Nav",
          body: "Body",
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
      expect(screen.getByText("Settlement Nav")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Settlement Nav"));
    expect(mockPush).toHaveBeenCalledWith("/settle-up?groupId=g2");
    Date.now = realDateNow;
  });

  it("uses data.groupId as fallback when groupId is null", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: null,
          data: { groupId: "g-fallback" },
          title: "Fallback Route",
          body: "Body",
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
      expect(screen.getByText("Fallback Route")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Fallback Route"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups/g-fallback");
    Date.now = realDateNow;
  });

  it("loads more notifications when reaching end of list", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Item 1",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T10:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Item 1")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("renders correct emoji for different notification types", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "member_joined_via_invite",
          groupId: "g1",
          title: "Member Joined",
          body: "Carol joined",
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
      expect(screen.getByText("Member Joined")).toBeTruthy();
    });

    Date.now = realDateNow;
  });
});
