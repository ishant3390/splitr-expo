import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import NotificationsScreen from "@/app/notifications";

const mockActivity = jest.fn(() => Promise.resolve([]));

jest.mock("@/lib/api", () => ({
  usersApi: {
    activity: (...args: any[]) => mockActivity(...args),
  },
}));

beforeEach(() => {
  mockActivity.mockReset().mockResolvedValue([]);
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
    // Use real timers so async/await works, but mock Date.now for groupByDay
    const realDateNow = Date.now;
    Date.now = () => new Date("2026-03-05T12:00:00Z").getTime();

    mockActivity.mockResolvedValue([
      {
        id: "n1",
        activityType: "expense_created",
        actorUserName: "Alice",
        groupName: "Trip",
        createdAt: "2026-03-05T10:00:00Z",
        details: { description: "Lunch" },
      },
    ]);

    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Alice added "Lunch" in Trip/)).toBeTruthy();
    });

    Date.now = realDateNow;
  });
});
