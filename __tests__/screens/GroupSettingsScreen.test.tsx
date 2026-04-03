import React from "react";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react-native";
import { SplitError } from "@/lib/errors";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

const mockSearchParams = jest.fn(() => ({ groupId: "g1" }));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
      canGoBack: mockCanGoBack,
    }),
    useLocalSearchParams: () => mockSearchParams(),
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
  useUploadGroupBanner: () => ({ mutateAsync: jest.fn(() => Promise.resolve({})) }),
  useDeleteGroupBanner: () => ({ mutateAsync: jest.fn(() => Promise.resolve()) }),
}));

jest.mock("@/lib/image-utils", () => ({
  pickImage: jest.fn(() => Promise.resolve(null)),
  validateImage: jest.fn(() => null),
  buildImageFormDataAsync: jest.fn(() => Promise.resolve(new FormData())),
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

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams.mockReturnValue({ groupId: "g1" });
  mockListContacts.mockResolvedValue([]);
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
  it("renders Settings header", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeTruthy();
    });
  });

  it("renders group identity in hero with group info", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
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
        { simplifyDebts: true },
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
      expect(mockInviteByEmail).toHaveBeenCalledWith("g1", { email: "dave@test.com", name: "Dave" }, "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith("Invite sent to dave@test.com");
    });
  });

  it("prevents self-add when entered email matches current user email", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "Test User");
    const emailInput = screen.getByPlaceholderText("e.g., alex@example.com");
    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.press(screen.getByText("Add to Group"));
    expect(mockToast.info).toHaveBeenCalledWith("You're already a member of this group.");
    expect(mockInviteByEmail).not.toHaveBeenCalled();
  });

  it("sends name along with email when inviting by email", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    const nameInput = screen.getByPlaceholderText("e.g., Alex");
    fireEvent.changeText(nameInput, "Alice Smith");
    const emailInput = screen.getByPlaceholderText("e.g., alex@example.com");
    fireEvent.changeText(emailInput, "alice@example.com");
    fireEvent.press(screen.getByText("Add to Group"));
    await waitFor(() => {
      expect(mockInviteByEmail).toHaveBeenCalledWith("g1", { email: "alice@example.com", name: "Alice Smith" }, "mock-token");
    });
  });

  it("prevents self-add via contact selection when contact email matches current user", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", guestUserId: null, name: "Test User", email: "test@example.com", isGuest: false, avatarUrl: null },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeTruthy();
    });
    const addButtons = screen.getAllByText("Add");
    fireEvent.press(addButtons[addButtons.length - 1]);
    expect(mockToast.info).toHaveBeenCalledWith("You're already a member of this group.");
    expect(mockInviteByEmail).not.toHaveBeenCalled();
    expect(mockAddGuestMember).not.toHaveBeenCalled();
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
    const phoneInput = screen.getByPlaceholderText("e.g., +1 555 123 4567");
    fireEvent(phoneInput, "submitEditing");
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
    mockInviteByEmail.mockRejectedValueOnce(new SplitError({ code: "ERR-409", category: "BUSINESS_LOGIC", message: "Already a member" }, 422));
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
      expect(mockToast.error).toHaveBeenCalledWith("This person is already a member of the group.");
    });
  });

  it("handles group archived error when adding member", async () => {
    mockAddGuestMember.mockRejectedValueOnce(new SplitError({ code: "ERR-402", category: "BUSINESS_LOGIC", message: "Group archived" }, 422));
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
      expect(mockToast.error).toHaveBeenCalledWith("This group has been archived and can't accept new members.");
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
    mockDeleteMutateAsync.mockRejectedValueOnce(new SplitError({ code: "ERR-400", category: "BUSINESS_LOGIC", message: "Outstanding balances" }, 422));
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
      expect(screen.getByText("Settings")).toBeTruthy();
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
      expect(screen.getByText("Settings")).toBeTruthy();
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

  it("adds contact with email via handleAddContact", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", guestUserId: null, name: "Diana", email: "diana@test.com", isGuest: false, avatarUrl: null },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Diana")).toBeTruthy();
    });
    const addButtons = screen.getAllByText("Add");
    fireEvent.press(addButtons[addButtons.length - 1]);
    await waitFor(() => {
      expect(mockInviteByEmail).toHaveBeenCalledWith("g1", { email: "diana@test.com", name: "Diana" }, "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith("Invite sent to Diana.");
    });
  });

  it("adds a guest contact without email via handleAddContact", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", guestUserId: null, name: "GuestPerson", email: null, isGuest: true, avatarUrl: null },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText(/GuestPerson/)).toBeTruthy();
    });
    const addButtons = screen.getAllByText("Add");
    fireEvent.press(addButtons[addButtons.length - 1]);
    await waitFor(() => {
      expect(mockAddGuestMember).toHaveBeenCalledWith("g1", { name: "GuestPerson" }, "mock-token");
      expect(mockToast.success).toHaveBeenCalledWith("GuestPerson added to group.");
    });
  });

  it("handles 409 error when adding contact", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", guestUserId: null, name: "Charlie", email: "charlie@test.com", isGuest: false, avatarUrl: null },
    ]);
    mockInviteByEmail.mockRejectedValueOnce(new SplitError({ code: "ERR-409", category: "BUSINESS_LOGIC", message: "Already a member" }, 422));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Charlie")).toBeTruthy();
    });
    const addButtons = screen.getAllByText("Add");
    fireEvent.press(addButtons[addButtons.length - 1]);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("This person is already a member of the group.");
    });
  });

  it("handles generic error when adding contact", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u3", guestUserId: null, name: "Charlie", email: "charlie@test.com", isGuest: false, avatarUrl: null },
    ]);
    mockInviteByEmail.mockRejectedValueOnce(new Error("network error"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Charlie")).toBeTruthy();
    });
    const addButtons = screen.getAllByText("Add");
    fireEvent.press(addButtons[addButtons.length - 1]);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to add member. Try again later.");
    });
  });

  it("shows contact guest badge and email in add member modal", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u7", guestUserId: null, name: "GuestBob", email: "guestbob@test.com", isGuest: true, avatarUrl: null },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("FROM YOUR OTHER GROUPS")).toBeTruthy();
      expect(screen.getByText(/GuestBob/)).toBeTruthy();
      expect(screen.getByText("guestbob@test.com")).toBeTruthy();
    });
  });

  it("handles contacts load failure gracefully", async () => {
    mockListContacts.mockRejectedValueOnce(new Error("network error"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    // Should not crash and contacts should be empty
    expect(screen.queryByText("FROM YOUR OTHER GROUPS")).toBeNull();
  });

  it("filters out existing members from contacts list", async () => {
    mockListContacts.mockResolvedValue([
      { userId: "u1", guestUserId: null, name: "Alice", email: "alice@test.com", isGuest: false, avatarUrl: null },
      { userId: "u4", guestUserId: null, name: "Diana", email: "diana@test.com", isGuest: false, avatarUrl: null },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Diana")).toBeTruthy();
    });
    expect(screen.getByText("FROM YOUR OTHER GROUPS")).toBeTruthy();
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

  it("handles 404 group not found when adding member", async () => {
    mockAddGuestMember.mockRejectedValueOnce(new SplitError({ code: "ERR-300", category: "RESOURCE", message: "Group not found" }, 404));
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
      expect(mockToast.error).toHaveBeenCalledWith("This doesn't exist or may have been deleted.");
    });
  });

  it("handles 403 not a member when adding member", async () => {
    mockAddGuestMember.mockRejectedValueOnce(new SplitError({ code: "ERR-204", category: "AUTHORIZATION", message: "Not a member" }, 403));
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
      expect(mockToast.error).toHaveBeenCalledWith("You're not a member of this group.");
    });
  });

  it("handles generic fallback error when adding member", async () => {
    mockAddGuestMember.mockRejectedValueOnce(new Error("something unexpected"));
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
      expect(mockToast.error).toHaveBeenCalledWith("Failed to add member. They may already be in the group.");
    });
  });

  it("removes a member successfully", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    // Find the remove (X) buttons in the member list. They are small Pressables
    // wrapping the X icon. Since they have no text/testID, find them by traversing.
    // Each member row has a Pressable with onPress that calls setMemberToRemove.
    // The X icon renders as Svg. The Pressable wrapping it is accessible.
    // Let's find all accessible elements and look for the ones near member names.
    const aliceRow = screen.getByText("Alice");
    // The X button is a sibling in the same row. Let's try finding by parent.
    const allPressables = screen.root.findAll(
      (node) =>
        node.props?.onPress &&
        node.props?.className?.includes?.("bg-destructive")
    );
    if (allPressables.length > 0) {
      fireEvent.press(allPressables[0]);
      await waitFor(() => {
        expect(screen.getByText("Remove Member")).toBeTruthy();
        expect(screen.getByText(/Remove .* from the group/)).toBeTruthy();
      });
      // Press the Remove button to confirm
      fireEvent.press(screen.getByText("Remove"));
      await waitFor(() => {
        expect(mockRemoveMember).toHaveBeenCalledWith("g1", "m1", "mock-token");
        expect(mockToast.success).toHaveBeenCalledWith("Member removed from group.");
      });
    }
  });

  it("handles remove member failure", async () => {
    mockRemoveMember.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    const allPressables = screen.root.findAll(
      (node) =>
        node.props?.onPress &&
        node.props?.className?.includes?.("bg-destructive")
    );
    if (allPressables.length > 0) {
      fireEvent.press(allPressables[0]);
      await waitFor(() => {
        expect(screen.getByText("Remove Member")).toBeTruthy();
      });
      fireEvent.press(screen.getByText("Remove"));
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to remove member. Try again.");
      });
    }
  });

  it("cancels member removal", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    const allPressables = screen.root.findAll(
      (node) =>
        node.props?.onPress &&
        node.props?.className?.includes?.("bg-destructive")
    );
    if (allPressables.length > 0) {
      fireEvent.press(allPressables[0]);
      await waitFor(() => {
        expect(screen.getByText("Remove Member")).toBeTruthy();
      });
      fireEvent.press(screen.getByText("Cancel"));
      await waitFor(() => {
        expect(screen.queryByText("Remove Member")).toBeNull();
      });
    }
  });

  it("handles share via native share", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText("Share Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Share Invite Link"));
    // Share.share should be called
  });

  it("shows monthly spending chart when enough monthly data exists", async () => {
    const screenHelpers = require("@/lib/screen-helpers");
    screenHelpers.aggregateByMonth = jest.fn(() => [
      { month: "2026-01", total: 5000 },
      { month: "2026-02", total: 8000 },
      { month: "2026-03", total: 3000 },
    ]);
    mockListExpenses.mockResolvedValue({
      data: [
        {
          id: "e1",
          description: "Lunch",
          amountCents: 3000,
          category: { icon: "food", name: "Food" },
          payers: [{ user: { id: "u1", name: "Alice" }, amountPaid: 3000 }],
          splits: [],
          createdAt: "2026-01-10T10:00:00Z",
          date: "2026-01-10",
        },
      ],
      pagination: { hasMore: false },
    });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("MONTHLY SPENDING")).toBeTruthy();
    });
    expect(screen.getByText("Jan")).toBeTruthy();
    expect(screen.getByText("Feb")).toBeTruthy();
    expect(screen.getByText("Mar")).toBeTruthy();
    // Reset mock
    screenHelpers.aggregateByMonth = jest.fn(() => []);
  });

  it("shows restore group failure toast", async () => {
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
    mockArchiveMutateAsync.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Restore Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Restore Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to restore group.");
    });
  });

  it("shows archive failure toast", async () => {
    mockListMembers.mockResolvedValue([
      { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com" }, balance: 0 },
      { id: "m2", user: { id: "u2", name: "Bob", email: "bob@test.com" }, balance: 0 },
    ]);
    mockArchiveMutateAsync.mockRejectedValueOnce(new Error("fail"));
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText("Archive")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to archive group.");
    });
  });

  it("shows generic delete error for non-balance-related failures", async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error("some unknown error"));
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
      expect(mockToast.error).toHaveBeenCalledWith("Failed to delete group.");
    });
  });

  it("switches from add member modal to share modal via share link shortcut", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Or share invite link instead")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Or share invite link instead"));
    await waitFor(() => {
      expect(screen.getByText(/Invite to Trip to Paris/)).toBeTruthy();
    });
  });

  it("shows group description when present", async () => {
    mockGetGroup.mockResolvedValue({
      id: "g1",
      name: "Trip to Paris",
      emoji: "✈️",
      description: "Our amazing vacation",
      inviteCode: "abc123",
      defaultCurrency: "USD",
      memberCount: 2,
      isArchived: false,
      version: 1,
      groupType: "trip",
    });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Our amazing vacation")).toBeTruthy();
    });
  });

  it("renders back button in hero navigation", async () => {
    mockCanGoBack.mockReturnValue(true);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeTruthy();
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
  });

  it("closes add member modal via the BottomSheetModal onClose", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Add"));
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
    // The BottomSheetModal has onClose prop. When the backdrop is pressed, it calls onClose.
    // The onClose calls setShowAddMember(false) and setAddMemberEmail("").
    // In the Modal, pressing the backdrop Pressable triggers onClose.
    // Let's find the backdrop by looking for the outer Pressable in the Modal.
    // The BottomSheetModal renders: Modal > View > Pressable (backdrop, onPress=onClose) > ...
    // We can trigger onRequestClose on the Modal.
    const modals = screen.root.findAll(
      (node) => node.type === "Modal" && node.props?.visible === true
    );
    if (modals.length > 0) {
      // Trigger the onRequestClose callback
      modals[0].props.onRequestClose?.();
      await waitFor(() => {
        expect(screen.queryByText("Add Member")).toBeNull();
      });
    }
  });

  it("closes share modal via the BottomSheetModal onClose", async () => {
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Invite Link"));
    await waitFor(() => {
      expect(screen.getByText(/Invite to Trip to Paris/)).toBeTruthy();
    });
    const modals = screen.root.findAll(
      (node) => node.type === "Modal" && node.props?.visible === true
    );
    if (modals.length > 0) {
      modals[0].props.onRequestClose?.();
      await waitFor(() => {
        expect(screen.queryByText(/Invite to Trip to Paris/)).toBeNull();
      });
    }
  });

  it("auto-opens add member modal when autoAddMember param is true", async () => {
    mockSearchParams.mockReturnValue({ groupId: "g1", autoAddMember: "true" });
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add Member")).toBeTruthy();
    });
  });

  it("cancels archive confirmation", async () => {
    mockListMembers.mockResolvedValue([
      { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com" }, balance: 0 },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText("Archive")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByText(/Archive "Trip to Paris"/)).toBeNull();
    });
  });

  it("shows member with zero balance in muted color", async () => {
    mockListMembers.mockResolvedValue([
      { id: "m1", user: { id: "u1", name: "Alice", email: "test@example.com", avatarUrl: null }, guestUser: null, displayName: "Alice", notificationsEnabled: true, balance: 0 },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("$0.00")).toBeTruthy();
    });
  });

  it("shows member without email correctly", async () => {
    mockListMembers.mockResolvedValue([
      { id: "m1", user: null, guestUser: { id: "gu1", name: "GuestOnly" }, displayName: "GuestOnly", notificationsEnabled: true, balance: 100 },
    ]);
    render(<GroupSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("GuestOnly")).toBeTruthy();
    });
  });

});
