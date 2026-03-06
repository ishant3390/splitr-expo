import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ProfileScreen from "@/app/(tabs)/profile";

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks", () => ({
  useUserProfile: () => ({
    data: {
      id: "u1",
      name: "Test User",
      email: "test@example.com",
      defaultCurrency: "USD",
      isPremium: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe("ProfileScreen", () => {
  it("renders header", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Profile")).toBeTruthy();
  });

  it("shows user name from Clerk", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Test User")).toBeTruthy();
  });

  it("shows user email from Clerk", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("renders menu items", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Edit Profile")).toBeTruthy();
    expect(screen.getByText("Payment Methods")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("Privacy & Security")).toBeTruthy();
    expect(screen.getByText("Help & Support")).toBeTruthy();
  });

  it("renders Dark Mode toggle", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Dark Mode")).toBeTruthy();
  });

  it("renders Sign Out button", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Sign Out")).toBeTruthy();
  });

  it("shows currency from API after load", async () => {
    render(<ProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("USD")).toBeTruthy();
    });
  });
});
