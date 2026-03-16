import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
      canGoBack: mockCanGoBack,
    }),
    useLocalSearchParams: () => ({ groupId: "g1" }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => { cb(); }, []);
    },
    useSegments: () => [],
    Link: "Link",
  };
});

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn(), show: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("react-native-qrcode-svg", () => "QRCode");

jest.mock("@/components/ui/group-avatar", () => ({
  GroupAvatar: () => null,
}));

const mockGetGroup = jest.fn(() =>
  Promise.resolve({
    id: "g1",
    name: "Trip to Paris",
    emoji: "✈️",
    inviteCode: "abc123",
    defaultCurrency: "USD",
    memberCount: 2,
    isArchived: false,
    version: 1,
    groupType: "trip",
  })
);
const mockListMembers = jest.fn(() =>
  Promise.resolve([
    { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com", avatarUrl: null }, guestUser: null, displayName: "Alice", notificationsEnabled: true, balance: 2500 },
    { id: "m2", user: { id: "u2", name: "Bob", email: "bob@test.com", avatarUrl: null }, guestUser: null, displayName: "Bob", notificationsEnabled: true, balance: -2500 },
  ])
);
const mockListExpenses = jest.fn(() =>
  Promise.resolve({ data: [], pagination: { hasMore: false } })
);
const mockAddGuestMember = jest.fn(() => Promise.resolve({}));
const mockRemoveMember = jest.fn(() => Promise.resolve());
const mockUpdateMember = jest.fn(() => Promise.resolve());
const mockInviteByEmail = jest.fn(() => Promise.resolve());
const mockUpdateGroup = jest.fn(() => Promise.resolve({ id: "g1", name: "Trip to Paris", simplifyDebts: true, version: 2 }));
const mockListContacts = jest.fn(() => Promise.resolve([]));
const mockRegenerate = jest.fn(() => Promise.resolve({ inviteCode: "new-code", id: "g1", name: "Trip to Paris" }));
const mockArchiveMutateAsync = jest.fn(() => Promise.resolve());
const mockDeleteMutateAsync = jest.fn(() => Promise.resolve());

jest.mock("@/lib/api", () => ({
  groupsApi: {
    get: (...args: any[]) => mockGetGroup(...args),
    listMembers: (...args: any[]) => mockListMembers(...args),
    listExpenses: (...args: any[]) => mockListExpenses(...args),
    addGuestMember: (...args: any[]) => mockAddGuestMember(...args),
    removeMember: (...args: any[]) => mockRemoveMember(...args),
    update: (...args: any[]) => mockUpdateGroup(...args),
    updateMember: (...args: any[]) => mockUpdateMember(...args),
    inviteByEmail: (...args: any[]) => mockInviteByEmail(...args),
  },
  contactsApi: {
    list: (...args: any[]) => mockListContacts(...args),
  },
  inviteApi: {
    regenerate: (...args: any[]) => mockRegenerate(...args),
  },
}));

jest.mock("@/lib/hooks", () => ({
  useArchiveGroup: () => ({ mutateAsync: mockArchiveMutateAsync, isPending: false }),
  useDeleteGroup: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
  useCategories: () => ({
    data: [
      { id: "cat-food", name: "Food", icon: "food" },
    ],
  }),
}));

jest.mock("@/lib/screen-helpers", () => ({
  hasUnsettledBalances: (members: any[]) => members.some((m: any) => (m.balance ?? 0) !== 0),
  dedupeMembers: (arr: any[]) => {
    const seen = new Set();
    return (Array.isArray(arr) ? arr : []).filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  },
  aggregateByPerson: () => [{ name: "Alice", total: 5000 }],
  aggregateByCategory: () => [["Food", 5000]],
  aggregateByMonth: () => [],
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    signOut: jest.fn(),
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "test@example.com" },
      imageUrl: "https://example.com/avatar.png",
    },
  }),
}));

jest.mock("@/lib/query", () => ({
  invalidateAfterGroupChange: jest.fn(),
  invalidateAfterMemberChange: jest.fn(),
}));

import GroupSettingsScreen from "@/app/group-settings";

const origDispatchEvent = typeof window !== "undefined" ? window.dispatchEvent : undefined;
beforeAll(() => {
  if (typeof window !== "undefined") {
    window.dispatchEvent = jest.fn();
  }
});
afterAll(() => {
  if (typeof window !== "undefined" && origDispatchEvent) {
    window.dispatchEvent = origDispatchEvent;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue({
    id: "g1",
    name: "Trip to Paris",
    emoji: "✈️",
    inviteCode: "abc123",
    defaultCurrency: "USD",
    memberCount: 2,
    isArchived: false,
    version: 1,
    groupType: "trip",
  });
  mockListMembers.mockResolvedValue([
    { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com", avatarUrl: null }, guestUser: null, displayName: "Alice", notificationsEnabled: true, balance: 2500 },
    { id: "m2", user: { id: "u2", name: "Bob", email: "bob@test.com", avatarUrl: null }, guestUser: null, displayName: "Bob", notificationsEnabled: true, balance: -2500 },
  ]);
  mockListExpenses.mockResolvedValue({ data: [], pagination: { hasMore: false } });
});

describe("GroupSettingsScreen", () => {
  it("renders Group Settings header", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Group Settings")).toBeTruthy();
    });
  });

  it("renders GROUP DETAILS section with group info", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("GROUP DETAILS")).toBeTruthy();
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
      expect(screen.getByText(/USD/)).toBeTruthy();
    });
  });

  it("renders MEMBERS section with full member list", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/MEMBERS \(2\)/)).toBeTruthy();
      expect(screen.getByText("Alice")).toBeTruthy();
      expect(screen.getByText("Bob")).toBeTruthy();
    });
  });

  it("shows member balances with correct colors", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("+$25.00")).toBeTruthy();
      expect(screen.getByText("-$25.00")).toBeTruthy();
    });
  });

  it("shows member emails", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeTruthy();
      expect(screen.getByText("bob@test.com")).toBeTruthy();
    });
  });

  it("renders PREFERENCES section with notification toggle", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("PREFERENCES")).toBeTruthy();
      expect(screen.getByText("Group Notifications")).toBeTruthy();
    });
  });

  it("toggles group notifications on press", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Group Notifications")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Group Notifications"));
    await waitFor(() => {
      expect(mockUpdateMember).toHaveBeenCalledWith(
        "g1",
        expect.any(String),
        expect.objectContaining({ notificationsEnabled: false }),
        "mock-token"
      );
    });
  });

  it("reverts notification toggle on failure", async () => {
    mockUpdateMember.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Group Notifications")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Group Notifications"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to update notification preference");
    });
  });

  it("renders Simplify debts toggle", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Simplify debts")).toBeTruthy();
      expect(screen.getByText("Reduces the number of transactions needed to settle up")).toBeTruthy();
    });
  });

  it("toggles simplify debts with correct API call", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Simplify debts")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Simplify debts"));
    await waitFor(() => {
      expect(mockUpdateGroup).toHaveBeenCalledWith(
        "g1",
        { simplifyDebts: true, version: 1 },
        "mock-token"
      );
    });
  });

  it("reverts simplify toggle on failure", async () => {
    mockUpdateGroup.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Simplify debts")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Simplify debts"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to update simplify debts setting");
    });
  });

  it("renders DANGER ZONE with archive and delete buttons", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("DANGER ZONE")).toBeTruthy();
      expect(screen.getByText("Archive Group")).toBeTruthy();
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
  });

  it("opens add member modal", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
      expect(screen.getByText("Add to Group")).toBeTruthy();
    });
  });

  it("adds guest member by name", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "Charlie");
    fireEvent.press(screen.getByText("Add to Group"));
    await waitFor(() => {
      expect(mockAddGuestMember).toHaveBeenCalledWith("g1", { name: "Charlie" }, "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith("Charlie added to group.");
    });
  });

  it("invites member by email", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "Dave");
    const emailInput = screen.getByPlaceholderText("e.g., alex@example.com");
    fireEvent.changeText(emailInput, "dave@test.com");
    fireEvent.press(screen.getByText("Add to Group"));
    await waitFor(() => {
      expect(mockInviteByEmail).toHaveBeenCalledWith("g1", { email: "dave@test.com" }, "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith("Invite sent to dave@test.com");
    });
  });

  it("validates empty name when adding member", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add to Group")).toBeTruthy();
    });
    const emailInput = screen.getByPlaceholderText("e.g., alex@example.com");
    fireEvent(emailInput, "submitEditing");
    expect(mockToast.error).toHaveBeenCalledWith("Please enter a name.");
  });

  it("validates invalid email when adding member", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "Eve");
    const emailInput = screen.getByPlaceholderText("e.g., alex@example.com");
    fireEvent.changeText(emailInput, "bad-email");
    fireEvent.press(screen.getByText("Add to Group"));
    expect(mockToast.error).toHaveBeenCalledWith("Please enter a valid email address.");
  });

  it("handles 409 already member error", async () => {
    mockInviteByEmail.mockRejectedValueOnce(new Error("409 ERR-409 INVITE_ALREADY_MEMBER"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "Frank");
    const emailInput = screen.getByPlaceholderText("e.g., alex@example.com");
    fireEvent.changeText(emailInput, "frank@test.com");
    fireEvent.press(screen.getByText("Add to Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This person is already in the group.");
    });
  });

  it("handles group archived error when adding member", async () => {
    mockAddGuestMember.mockRejectedValueOnce(new Error("ERR-402 GROUP_ARCHIVED"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "NewPerson");
    fireEvent.press(screen.getByText("Add to Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This group is archived.");
    });
  });

  it("opens share modal via Invite Link button", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText(/Invite to Trip to Paris/)).toBeTruthy();
      expect(screen.getByText("https://splitr.ai/invite/abc123")).toBeTruthy();
    });
  });

  it("copies invite link", async () => {
    const Clipboard = require("expo-clipboard");
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText("https://splitr.ai/invite/abc123")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("https://splitr.ai/invite/abc123"));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://splitr.ai/invite/abc123");
    });
  });

  it("regenerates invite link", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText("Regenerate invite link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Regenerate invite link"));
    await waitFor(() => {
      expect(mockRegenerate).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("Invite link regenerated.");
    });
  });

  it("shows QR code toggle in share modal", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText("Show QR Code")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Show QR Code"));
  });

  it("archives group with balance warning", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText(/outstanding balances/)).toBeTruthy();
      expect(screen.getByText("Archive Anyway")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Anyway"));
    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: "g1", archive: true })
      );
    });
  });

  it("archives group with standard message when balances are zero", async () => {
    mockListMembers.mockResolvedValue([
      { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com" }, balance: 0 },
      { id: "m2", user: { id: "u2", name: "Bob", email: "bob@test.com" }, balance: 0 },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText(/Archive "Trip to Paris"/)).toBeTruthy();
      expect(screen.getByText("Archive")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive"));
    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: "g1", archive: true })
      );
    });
  });

  it("deletes group", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete Group"));
    await waitFor(() => {
      expect(screen.getByText(/Permanently delete/)).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("g1");
    });
  });

  it("shows error when deleting group with outstanding balances", async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error("OUTSTANDING_BALANCES"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete Group"));
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Cannot delete — settle up all balances first.");
    });
  });

  it("shows Restore Group for archived groups", async () => {
    mockGetGroup.mockResolvedValue({
      id: "g1",
      name: "Trip to Paris",
      emoji: "✈️",
      inviteCode: "abc123",
      defaultCurrency: "USD",
      memberCount: 2,
      isArchived: true,
      version: 1,
    });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Restore Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Restore Group"));
    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: "g1", archive: false })
      );
    });
  });

  it("hides simplify debts toggle for archived groups", async () => {
    mockGetGroup.mockResolvedValue({
      id: "g1",
      name: "Trip to Paris",
      emoji: "✈️",
      inviteCode: "abc123",
      defaultCurrency: "USD",
      memberCount: 2,
      isArchived: true,
      version: 1,
    });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Group Settings")).toBeTruthy();
    });
    expect(screen.queryByText("Simplify debts")).toBeNull();
  });

  it("hides Add and Invite Link for archived groups", async () => {
    mockGetGroup.mockResolvedValue({
      id: "g1",
      name: "Trip to Paris",
      emoji: "✈️",
      inviteCode: "abc123",
      defaultCurrency: "USD",
      memberCount: 2,
      isArchived: true,
      version: 1,
    });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Group Settings")).toBeTruthy();
    });
    expect(screen.queryByText("Add")).toBeNull();
    expect(screen.queryByText("Invite Link")).toBeNull();
  });

  it("shows insights when expenses exist", async () => {
    mockListExpenses.mockResolvedValue({
      data: [
        {
          id: "e1",
          description: "Lunch",
          amountCents: 3000,
          category: { icon: "food", name: "Food" },
          payers: [{ user: { id: "u1", name: "Alice" }, amountPaid: 3000 }],
          splits: [],
          createdAt: "2026-03-10T10:00:00Z",
          date: "2026-03-10",
        },
      ],
      pagination: { hasMore: false },
    });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("INSIGHTS")).toBeTruthy();
      expect(screen.getByText("BY PERSON")).toBeTruthy();
    });
  });

  it("shows group not found when API fails", async () => {
    mockGetGroup.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Group not found")).toBeTruthy();
    });
  });

  it("loads contacts when add member modal opens", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", name: "Charlie", email: "charlie@test.com", isGuest: false },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(mockListContacts).toHaveBeenCalled();
    });
  });

  it("shows contacts from other groups in add member modal", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", guestUserId: null, name: "Charlie", email: "charlie@test.com", isGuest: false, avatarUrl: null },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("FROM YOUR OTHER GROUPS")).toBeTruthy();
      expect(screen.getByText("Charlie")).toBeTruthy();
    });
  });

  it("shows share link shortcut in add member modal", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Or share invite link instead")).toBeTruthy();
    });
  });

  it("handles regenerate link error", async () => {
    mockRegenerate.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText("Regenerate invite link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Regenerate invite link"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to regenerate link.");
    });
  });
});
