import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

const mockCode = "test-invite-code";
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({ code: mockCode }),
  useSegments: () => [],
  Link: "Link",
}));

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockPreview = jest.fn(() =>
  Promise.resolve({
    groupId: "g1",
    name: "Trip to Paris",
    memberCount: 3,
    createdByName: "Alice",
  })
);
const mockJoin = jest.fn(() => Promise.resolve({}));

jest.mock("@/lib/api", () => ({
  inviteApi: {
    preview: (...args: any[]) => mockPreview(...args),
    join: (...args: any[]) => mockJoin(...args),
  },
}));

import JoinGroupScreen from "@/app/join/[code]";

beforeEach(() => {
  mockPreview.mockReset().mockResolvedValue({
    groupId: "g1",
    name: "Trip to Paris",
    memberCount: 3,
    createdByName: "Alice",
  });
  mockJoin.mockReset().mockResolvedValue({});
});

describe("JoinGroupScreen", () => {
  it("loads invite preview", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(mockPreview).toHaveBeenCalledWith(mockCode);
    });
  });

  it("renders group name from preview", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
  });

  it("renders Join Group button", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });
  });

  it("shows error state on failed preview", async () => {
    mockPreview.mockRejectedValue(new Error("Not found"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(
        screen.getByText("This invite link is invalid or has expired.")
      ).toBeTruthy();
    });
  });

  it("renders member count", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText(/3 member/)).toBeTruthy();
    });
  });
});
