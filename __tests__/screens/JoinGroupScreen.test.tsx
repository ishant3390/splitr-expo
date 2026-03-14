import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

const mockCode = "test-invite-code";
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({ code: mockCode }),
  useSegments: () => [],
  Link: "Link",
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/components/ui/group-avatar", () => {
  const MockReact = require("react");
  const { Text } = require("react-native");
  return {
    GroupAvatar: ({ name }: { name: string }) => MockReact.createElement(Text, null, `GroupAvatar:${name}`),
  };
});

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

  it("joins group on button press", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith({ inviteCode: mockCode }, "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith('Joined "Trip to Paris"!');
    });
  });

  it("shows Joined! state after successful join", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(screen.getByText("Joined!")).toBeTruthy();
    });
  });

  it("handles ALREADY_MEMBER error on join", async () => {
    mockJoin.mockRejectedValueOnce(new Error("ERR-301: Already a member"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith("You're already in this group.");
      expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)/groups/g1");
    });
  });

  it("handles NOT_FOUND error on join", async () => {
    mockJoin.mockRejectedValueOnce(new Error("ERR-300: Not found"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This invite link is invalid.");
    });
  });

  it("handles EXPIRED error on join", async () => {
    mockJoin.mockRejectedValueOnce(new Error("ERR-401: Expired"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This invite link has expired.");
    });
  });

  it("handles ARCHIVED error on join", async () => {
    mockJoin.mockRejectedValueOnce(new Error("ERR-402: Archived"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This group has been archived.");
    });
  });

  it("handles generic error on join", async () => {
    mockJoin.mockRejectedValueOnce(new Error("Unknown error"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join Group")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to join group. Try again.");
    });
  });

  it("shows archived group warning", async () => {
    mockPreview.mockResolvedValue({
      groupId: "g1",
      name: "Old Trip",
      memberCount: 2,
      createdByName: "Alice",
      isArchived: true,
    });
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("This group is no longer active")).toBeTruthy();
      expect(screen.getByText("Group Archived")).toBeTruthy();
    });
  });

  it("shows Go Home button on error state", async () => {
    mockPreview.mockRejectedValue(new Error("Not found"));
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Go Home")).toBeTruthy();
      expect(screen.getByText("Invalid Invite")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Go Home"));
    expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("redirects to auth when not signed in", async () => {
    // Override isSignedIn to false
    const clerkMock = require("@clerk/clerk-expo");
    const origUseAuth = clerkMock.useAuth;
    clerkMock.useAuth = () => ({
      getToken: jest.fn(() => Promise.resolve("mock-token")),
      signOut: jest.fn(),
      isSignedIn: false,
    });

    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Sign in to Join")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Sign in to Join"));
    expect(mockRouterPush).toHaveBeenCalledWith("/(auth)");

    clerkMock.useAuth = origUseAuth;
  });

  it("renders invite text", async () => {
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("You've been invited to join")).toBeTruthy();
    });
  });

  it("shows group type when available", async () => {
    mockPreview.mockResolvedValue({
      groupId: "g1",
      name: "Trip to Paris",
      memberCount: 3,
      createdByName: "Alice",
      groupType: "trip",
    });
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("trip")).toBeTruthy();
    });
  });

  it("shows singular member text for 1 member", async () => {
    mockPreview.mockResolvedValue({
      groupId: "g1",
      name: "Solo Group",
      memberCount: 1,
      createdByName: "Alice",
    });
    render(<JoinGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("1 member")).toBeTruthy();
    });
  });
});
