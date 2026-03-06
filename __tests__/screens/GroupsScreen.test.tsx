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

const mockRefetch = jest.fn();
const mockUseGroups = jest.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

jest.mock("@/lib/hooks", () => ({
  useGroups: (...args: any[]) => mockUseGroups(...args),
  useArchiveGroup: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteGroup: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  mockUseGroups.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  });
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

  it("renders groups when data exists", async () => {
    mockUseGroups.mockReturnValue({
      data: [
        {
          id: "g1",
          name: "Trip to Paris",
          emoji: "plane",
          memberCount: 4,
          defaultCurrency: "EUR",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
  });
});
