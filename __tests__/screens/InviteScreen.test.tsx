import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

const mockCode = "invite-test-code";

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
    name: "Beach Trip",
    memberCount: 5,
    createdByName: "Bob",
  })
);
const mockJoin = jest.fn(() => Promise.resolve({}));

jest.mock("@/lib/api", () => ({
  inviteApi: {
    preview: (...args: any[]) => mockPreview(...args),
    join: (...args: any[]) => mockJoin(...args),
  },
}));

// Import the invite re-export which maps to join/[code]
import InviteScreen from "@/app/invite/[code]";

beforeEach(() => {
  jest.clearAllMocks();
  mockPreview.mockResolvedValue({
    groupId: "g1",
    name: "Beach Trip",
    memberCount: 5,
    createdByName: "Bob",
  });
});

describe("InviteScreen (re-export of JoinGroupScreen)", () => {
  it("renders and loads invite preview", async () => {
    render(<InviteScreen />);
    await waitFor(() => {
      expect(mockPreview).toHaveBeenCalledWith(mockCode);
    });
  });

  it("renders group name from preview", async () => {
    render(<InviteScreen />);
    await waitFor(() => {
      expect(screen.getByText("Beach Trip")).toBeTruthy();
    });
  });

  it("renders Join Group button", async () => {
    render(<InviteScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });
  });

  it("shows member count", async () => {
    render(<InviteScreen />);
    await waitFor(() => {
      expect(screen.getByText(/5 member/)).toBeTruthy();
    });
  });

  it("shows error state when preview fails", async () => {
    mockPreview.mockRejectedValue(new Error("Not found"));
    render(<InviteScreen />);
    await waitFor(() => {
      expect(
        screen.getByText("This invite link is invalid or has expired.")
      ).toBeTruthy();
    });
  });
});
