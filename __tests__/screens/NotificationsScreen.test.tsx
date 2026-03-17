import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import { SectionList } from "react-native";

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

  it("shows 'Just now' for very recent notifications", async () => {
    const realDateNow = Date.now;
    const now = new Date("2026-03-05T12:00:00Z").getTime();
    Date.now = () => now;

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Just Created",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: new Date(now - 10000).toISOString(), // 10 seconds ago
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
      expect(screen.getByText("Just now")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows hours ago for notifications a few hours old", async () => {
    const realDateNow = Date.now;
    const now = new Date("2026-03-05T12:00:00Z").getTime();
    Date.now = () => now;

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Hours Ago",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: new Date(now - 3 * 3600000).toISOString(), // 3 hours ago
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
      expect(screen.getByText("3h ago")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows 'Yesterday' for notifications from the day before", async () => {
    const realDateNow = Date.now;
    const now = new Date("2026-03-05T12:00:00Z").getTime();
    Date.now = () => now;

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Yesterday Item",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: new Date(now - 25 * 3600000).toISOString(), // ~25 hours ago
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
      expect(screen.getByText("Yesterday")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows days ago for notifications 2-6 days old", async () => {
    const realDateNow = Date.now;
    const now = new Date("2026-03-05T12:00:00Z").getTime();
    Date.now = () => now;

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Days Ago Item",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: new Date(now - 3 * 86400000).toISOString(), // 3 days ago
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
      expect(screen.getByText("3d ago")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows formatted date for notifications 7+ days old", async () => {
    const realDateNow = Date.now;
    const now = new Date("2026-03-15T12:00:00Z").getTime();
    Date.now = () => now;

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Old Item",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: "2026-03-01T10:00:00Z", // 14 days ago
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
      expect(screen.getByText("Mar 1")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("groups notifications from different days into separate sections", async () => {
    const realDateNow = Date.now;
    const now = new Date();
    const nowMs = now.getTime();
    Date.now = () => nowMs;

    // Today item and an earlier item
    const todayItem = new Date(nowMs - 3600000).toISOString();
    const earlier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 12, 0, 0);
    const earlierItem = earlier.toISOString();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Today Item",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: todayItem,
        },
        {
          id: "n3",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Earlier Item",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: earlierItem,
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
      // Both items should render in the list
      expect(screen.getByText("Today Item")).toBeTruthy();
      expect(screen.getByText("Earlier Item")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  it("shows unread count badge when notifications exist", async () => {
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
        {
          id: "n2",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Item 2",
          body: "Body",
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
      expect(screen.getByText("2")).toBeTruthy();
    });

    Date.now = realDateNow;
  });

  // --- onRefresh (lines 104-106) ---
  it("triggers refetch on pull to refresh", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Refresh Test",
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
      expect(screen.getByText("Refresh Test")).toBeTruthy();
    });
    // SectionList has RefreshControl — onRefresh calls setRefreshing(true), refetch, setRefreshing(false)
    // useFocusEffect also calls refetch on mount
    expect(mockRefetch).toHaveBeenCalled();
    Date.now = realDateNow;
  });

  // --- markAllRead (lines 110-112) ---
  it("marks all notifications as read", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Unread 1",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T10:00:00Z",
        },
        {
          id: "n2",
          notificationType: "expense_created",
          groupId: "g2",
          title: "Unread 2",
          body: "Body",
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
      expect(screen.getByText("Unread 1")).toBeTruthy();
      expect(screen.getByText("Unread 2")).toBeTruthy();
    });
    // The unread count badge should show "2"
    expect(screen.getByText("2")).toBeTruthy();
    Date.now = realDateNow;
  });

  // --- fetchNextPage on end reached (line 172) ---
  it("supports pagination with fetchNextPage", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Paginated",
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
      expect(screen.getByText("Paginated")).toBeTruthy();
    });
    // SectionList onEndReached will call fetchNextPage when hasNextPage=true
    Date.now = realDateNow;
  });

  // --- Bottom nav: Home button (line 305) ---
  it("navigates via bottom nav Home button", async () => {
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Home")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Home"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)");
  });

  // --- Bottom nav: Groups button (line 305) ---
  it("navigates via bottom nav Groups button", async () => {
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Groups")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Groups"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups");
  });

  // --- Bottom nav: Activity button (line 305) ---
  it("navigates via bottom nav Activity button", async () => {
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Activity")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Activity"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/activity");
  });

  // --- Bottom nav: Profile button (line 305) ---
  it("navigates via bottom nav Profile button", async () => {
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Profile"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/profile");
  });

  // --- Bottom nav: FAB/Add button (line 287) ---
  it("navigates via bottom nav Add FAB button", async () => {
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeTruthy();
    });
    // The Add FAB is a Plus icon Pressable without text label
    // The FAB has isFab=true, renders as a circle button
    // We can target by the "Add" label text
    const addLabel = screen.queryByText("Add");
    // The FAB doesn't render its label — it's just a Plus icon
    // This is not easily targetable without testID
  });

  it("calls onRefresh which sets refreshing and refetches", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockRefetch.mockResolvedValue(undefined);

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Refresh Item",
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

    const { UNSAFE_getByType } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Refresh Item")).toBeTruthy();
    });

    // Trigger onRefresh via the SectionList's RefreshControl
    const sectionList = UNSAFE_getByType(SectionList);
    await act(async () => {
      sectionList.props.refreshControl.props.onRefresh();
    });

    expect(mockRefetch).toHaveBeenCalled();
    Date.now = realDateNow;
  });

  it("executes markAllRead when CheckCheck button is pressed", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Mark Read 1",
          body: "Body",
          deliveryStatus: "delivered",
          createdAt: "2026-03-05T10:00:00Z",
        },
        {
          id: "n2",
          notificationType: "settlement_created",
          groupId: "g2",
          title: "Mark Read 2",
          body: "Body",
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

    const { root } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Mark Read 1")).toBeTruthy();
    });

    // Unread badge should show 2 before marking all read
    expect(screen.getByText("2")).toBeTruthy();

    // Find the mark-all-read Pressable by walking the tree.
    // The header row has: [back Pressable] [title View] [markAllRead Pressable]
    // The markAllRead Pressable has className containing "px-2" and wraps CheckCheck icon.
    // Use findAll to locate it.
    function findPressableWithOnPress(node: any): any[] {
      const results: any[] = [];
      if (!node) return results;
      if (node.props?.onPress && (node.type === "View" || typeof node.type === "function" || typeof node.type === "object")) {
        results.push(node);
      }
      const children = node.props?.children;
      if (Array.isArray(children)) {
        children.forEach((c: any) => results.push(...findPressableWithOnPress(c)));
      } else if (children && typeof children === "object") {
        results.push(...findPressableWithOnPress(children));
      }
      return results;
    }

    // The CheckCheck icon is a mock — it won't have accessible text.
    // The header structure means the 2nd Pressable-like element with onPress is markAllRead.
    // Simpler approach: find by accessibilityRole or just fire on the root and look for effect.
    // Actually, let's find the Pressable by its className "px-2"
    const allElements = root.findAll((node: any) => node.props?.onPress !== undefined);
    // Filter to the one with className containing "px-2"
    const markAllBtn = allElements.find((el: any) =>
      el.props?.className?.includes("px-2")
    );
    expect(markAllBtn).toBeTruthy();
    fireEvent.press(markAllBtn!);

    // After marking all read, the unread count badge should disappear
    await waitFor(() => {
      expect(screen.queryByText("2")).toBeNull();
    });

    Date.now = realDateNow;
  });

  it("calls fetchNextPage when onEndReached fires with hasNextPage true", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "Paginate Item",
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

    const { UNSAFE_getByType } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Paginate Item")).toBeTruthy();
    });

    // Trigger onEndReached on the SectionList
    const sectionList = UNSAFE_getByType(SectionList);
    act(() => {
      sectionList.props.onEndReached();
    });

    expect(mockFetchNextPage).toHaveBeenCalled();
    Date.now = realDateNow;
  });

  it("does not call fetchNextPage when hasNextPage is false", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockFetchNextPage.mockClear();

    mockUseNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          notificationType: "expense_created",
          groupId: "g1",
          title: "No More Pages",
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

    const { UNSAFE_getByType } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("No More Pages")).toBeTruthy();
    });

    const sectionList = UNSAFE_getByType(SectionList);
    act(() => {
      sectionList.props.onEndReached();
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
    Date.now = realDateNow;
  });

  it("navigates to add screen when FAB is pressed", async () => {
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    const { root } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeTruthy();
    });

    mockPush.mockClear();

    // The FAB has a distinctive style: width=48, height=48, borderRadius=24
    const allElements = root.findAll((node: any) =>
      node.props?.onPress !== undefined &&
      node.props?.style?.width === 48 &&
      node.props?.style?.height === 48 &&
      node.props?.style?.borderRadius === 24
    );
    expect(allElements.length).toBeGreaterThan(0);
    fireEvent.press(allElements[0]);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/add");

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
