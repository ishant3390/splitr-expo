import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import GroupsScreen from "@/app/(tabs)/groups";

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockList = jest.fn(() => Promise.resolve([]));

jest.mock("@/lib/api", () => ({
  groupsApi: {
    list: (...args: any[]) => mockList(...args),
    update: jest.fn(() => Promise.resolve({})),
    delete: jest.fn(() => Promise.resolve()),
  },
}));

beforeEach(() => {
  mockList.mockReset().mockResolvedValue([]);
});

describe("GroupsScreen", () => {
  it("renders header", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Groups")).toBeTruthy();
    });
  });

  it("renders Active/Archived filter tabs", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeTruthy();
      expect(screen.getByText("Archived")).toBeTruthy();
    });
  });

  it("renders New button", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("New")).toBeTruthy();
    });
  });

  it("shows empty state when no groups", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("No groups yet")).toBeTruthy();
    });
  });

  it("renders groups when API returns data", async () => {
    mockList.mockResolvedValue([
      {
        id: "g1",
        name: "Trip to Paris",
        emoji: "plane",
        memberCount: 4,
        defaultCurrency: "EUR",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ]);

    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
  });
});
