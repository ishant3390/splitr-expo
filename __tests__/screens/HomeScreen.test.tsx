import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import HomeScreen from "@/app/(tabs)/index";

jest.mock("@/lib/hooks", () => ({
  useUserActivity: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUserBalance: () => ({
    data: { totalOwedCents: 0, totalOwesCents: 0, netBalanceCents: 0 },
    refetch: jest.fn(),
  }),
}));

describe("HomeScreen", () => {
  it("renders header with app name", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("Splitr")).toBeTruthy();
    });
  });

  it("shows welcome message", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
  });

  it("shows quick action buttons", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("Scan")).toBeTruthy();
      expect(screen.getByText("Chat")).toBeTruthy();
      expect(screen.getByText("Add")).toBeTruthy();
    });
  });

  it("shows balance card", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("Net Balance")).toBeTruthy();
      expect(screen.getByText("You are owed")).toBeTruthy();
      expect(screen.getByText("You owe")).toBeTruthy();
    });
  });

  it("shows Recent Activity section", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeTruthy();
    });
  });

  it("shows empty state when no activity", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("No activity yet")).toBeTruthy();
    });
  });

  it("shows category bar", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("All")).toBeTruthy();
      expect(screen.getByText("Food")).toBeTruthy();
      expect(screen.getByText("Transport")).toBeTruthy();
    });
  });
});
