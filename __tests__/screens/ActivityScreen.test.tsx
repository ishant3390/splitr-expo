import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ActivityScreen from "@/app/(tabs)/activity";

jest.mock("@/lib/api", () => ({
  usersApi: {
    activity: jest.fn(() => Promise.resolve([])),
  },
}));

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
    const { usersApi } = require("@/lib/api");
    usersApi.activity.mockResolvedValueOnce([
      {
        id: "a1",
        activityType: "expense_created",
        actorUserName: "Alice",
        groupName: "Trip",
        createdAt: "2026-03-05T10:00:00Z",
        details: { description: "Dinner" },
      },
    ]);

    render(<ActivityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Expense created")).toBeTruthy();
      expect(screen.getByText("Dinner")).toBeTruthy();
    });
  });
});
