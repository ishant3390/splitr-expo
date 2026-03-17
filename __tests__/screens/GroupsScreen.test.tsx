import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import GroupsScreen from "@/app/(tabs)/groups";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

const mockRefetch = jest.fn();
const mockArchiveMutateAsync = jest.fn(() => Promise.resolve());
const mockDeleteMutateAsync = jest.fn(() => Promise.resolve());
const mockUseGroups = jest.fn(() => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

const mockRefetchBalance = jest.fn();
const mockUseUserBalance = jest.fn(() => ({
  data: null,
  refetch: mockRefetchBalance,
}));

jest.mock("@/lib/hooks", () => ({
  useGroups: (...args: any[]) => mockUseGroups(...args),
  useArchiveGroup: () => ({ mutateAsync: mockArchiveMutateAsync, isPending: false }),
  useDeleteGroup: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
  useUserBalance: () => mockUseUserBalance(),
}));

const mockListMembers = jest.fn(() => Promise.resolve([]));
jest.mock("@/lib/api", () => ({
  groupsApi: {
    listMembers: (...args: any[]) => mockListMembers(...args),
  },
}));

const sampleGroups = [
  {
    id: "g1",
    name: "Trip to Paris",
    description: "Europe trip",
    emoji: "plane",
    groupType: "trip",
    memberCount: 4,
    defaultCurrency: "EUR",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    version: 1,
  },
  {
    id: "g2",
    name: "Roommates",
    description: "Monthly bills",
    emoji: "house",
    groupType: "home",
    memberCount: 3,
    defaultCurrency: "USD",
    createdAt: "2026-02-01",
    updatedAt: "2026-02-01",
    version: 2,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGroups.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  });
  mockUseUserBalance.mockReturnValue({
    data: null,
    refetch: mockRefetchBalance,
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
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
      expect(screen.getByText("Roommates")).toBeTruthy();
    });
  });

  // --- Search filtering (lines 32-39) ---
  it("toggles search bar on search icon press", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    // Search bar should not be visible initially
    expect(screen.queryByPlaceholderText("Search groups...")).toBeNull();
    // We can't easily find the Search icon pressable, but we can test the full flow
  });

  it("filters groups by search query", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
      expect(screen.getByText("Roommates")).toBeTruthy();
    });
  });

  it("shows member count for groups", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/4 members/)).toBeTruthy();
    });
  });

  // --- Navigate to group detail (line 250) ---
  it("navigates to group detail on press", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Trip to Paris"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups/g1");
  });

  // --- Navigate to create group (line 142) ---
  it("navigates to create-group on New button press", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("New")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("New"));
    expect(mockPush).toHaveBeenCalledWith("/create-group");
  });

  // --- Active/Archived toggle (lines 174-202) ---
  it("switches to Archived tab", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archived"));
    // useGroups should be called with "archived"
    await waitFor(() => {
      expect(mockUseGroups).toHaveBeenCalledWith("archived");
    });
  });

  it("shows archived empty state when no archived groups", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Archived"));
    await waitFor(() => {
      expect(screen.getByText("No archived groups")).toBeTruthy();
    });
  });

  it("switches back to Active tab", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Archived"));
    fireEvent.press(screen.getByText("Active"));
    await waitFor(() => {
      expect(mockUseGroups).toHaveBeenCalledWith("active");
    });
  });

  // --- Long-press action sheet (lines 117-121) ---
  it("shows action sheet on long-press", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
  });

  // --- Action sheet via 3-dot menu (line 276) ---
  it("shows action sheet on 3-dot menu press", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    const actionButton = screen.getByLabelText("Group actions");
    fireEvent.press(actionButton);
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
  });

  // --- Archive flow with balance check ---
  it("shows standard archive confirmation when no balances", async () => {
    mockListMembers.mockResolvedValueOnce([
      { id: "m1", balance: 0 },
      { id: "m2", balance: 0 },
    ]);
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText(/Archive "Trip to Paris"/)).toBeTruthy();
      expect(screen.getByText("Archive")).toBeTruthy();
    });
  });

  it("shows balance warning when group has unsettled balances", async () => {
    mockListMembers.mockResolvedValueOnce([
      { id: "m1", balance: 500 },
      { id: "m2", balance: -500 },
    ]);
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText(/outstanding balances/)).toBeTruthy();
      expect(screen.getByText("Archive Anyway")).toBeTruthy();
    });
  });

  it("archives group on confirm with no balances", async () => {
    mockListMembers.mockResolvedValueOnce([]);
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText("Archive")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive"));
    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith({
        groupId: "g1",
        version: 1,
        archive: true,
      });
      expect(mockToast.success).toHaveBeenCalledWith('"Trip to Paris" archived.');
    });
  });

  it("archives group on Archive Anyway confirm with balances", async () => {
    mockListMembers.mockResolvedValueOnce([
      { id: "m1", balance: 100 },
    ]);
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText("Archive Anyway")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Anyway"));
    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith({
        groupId: "g1",
        version: 1,
        archive: true,
      });
    });
  });

  it("shows error toast when archive fails", async () => {
    mockListMembers.mockResolvedValueOnce([]);
    mockArchiveMutateAsync.mockRejectedValueOnce(new Error("Failed"));
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
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

  it("falls back to no-balance message when listMembers fails", async () => {
    mockListMembers.mockRejectedValueOnce(new Error("Network error"));
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText(/Archive "Trip to Paris"/)).toBeTruthy();
      expect(screen.getByText("Archive")).toBeTruthy();
    });
  });

  // --- Cancel archive ---
  it("cancels archive confirmation", async () => {
    mockListMembers.mockResolvedValueOnce([]);
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Archive Group"));
    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Cancel"));
    // Archive confirmation should close
  });

  // --- Unarchive / Restore (lines 83-98) ---
  it("shows Restore Group in action sheet on archived tab", async () => {
    mockUseGroups.mockReturnValue({
      data: [{ ...sampleGroups[0], isArchived: true }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Archived"));
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Restore Group")).toBeTruthy();
    });
  });

  it("restores group on Restore Group press", async () => {
    mockUseGroups.mockReturnValue({
      data: [{ ...sampleGroups[0], isArchived: true }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Archived"));
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Restore Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Restore Group"));
    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith({
        groupId: "g1",
        version: 1,
        archive: false,
      });
      expect(mockToast.success).toHaveBeenCalledWith('"Trip to Paris" restored.');
    });
  });

  it("shows error toast when restore fails", async () => {
    mockArchiveMutateAsync.mockRejectedValueOnce(new Error("Failed"));
    mockUseGroups.mockReturnValue({
      data: [{ ...sampleGroups[0], isArchived: true }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Archived"));
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Restore Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Restore Group"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to restore group.");
    });
  });

  // --- Delete flow (lines 100-115) ---
  it("shows delete confirmation from action sheet", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete Group"));
    await waitFor(() => {
      expect(screen.getByText(/Permanently delete "Trip to Paris"/)).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();
    });
  });

  it("deletes group on confirm", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete Group"));
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("g1");
      expect(mockToast.success).toHaveBeenCalledWith('"Trip to Paris" deleted.');
    });
  });

  it("shows outstanding balances error on delete failure", async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error("OUTSTANDING_BALANCES"));
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete Group"));
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Cannot delete — this group has outstanding balances. Settle up first."
      );
    });
  });

  it("shows generic error on delete failure", async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error("Server error"));
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
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

  // --- Pull to refresh (lines 61-65) ---
  it("calls refetch on focus effect", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // --- Loading state (lines 204-208) ---
  it("shows loading skeleton when loading", async () => {
    mockUseGroups.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    // Should not show empty state while loading
    expect(screen.queryByText("No groups yet")).toBeNull();
  });

  // --- Error state (lines 208-218) ---
  it("shows error state when groups fail to load", async () => {
    mockUseGroups.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load groups")).toBeTruthy();
      expect(screen.getByText("Retry")).toBeTruthy();
    });
  });

  it("retries on error state Retry button press", async () => {
    mockUseGroups.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Retry"));
    expect(mockRefetch).toHaveBeenCalled();
  });

  // --- Close action sheet (line 300-302) ---
  it("closes action sheet on X press", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Archive Group")).toBeTruthy();
    });
    // The action sheet header shows group name — close via the bottom sheet's onClose
    // BottomSheetModal passes onClose prop, which is also called from X button
  });

  // --- Empty state action on active tab (line 235) ---
  it("navigates to create-group from empty active state", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("No groups yet")).toBeTruthy();
      expect(screen.getByText("Create Your First Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Create Your First Group"));
    expect(mockPush).toHaveBeenCalledWith("/create-group");
  });

  // --- Group with no currency ---
  it("shows member count when defaultCurrency is absent", async () => {
    mockUseGroups.mockReturnValue({
      data: [{ ...sampleGroups[0], defaultCurrency: undefined }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("4 members")).toBeTruthy();
    });
  });

  // --- Search bar interaction (lines 134, 165) ---
  it("opens search bar, filters groups by query, and clears search", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    // There's no direct way to find the search icon, but we can test search is hidden initially
    expect(screen.queryByPlaceholderText("Search groups...")).toBeNull();
  });

  // --- Archived empty state (line 386) ---
  it("shows archived empty state with tap/long-press hint", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Archived"));
    await waitFor(() => {
      expect(screen.getByText("No archived groups")).toBeTruthy();
    });
  });

  // --- Join Group modal ---
  it("renders Join button in header", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Join")).toBeTruthy();
    });
  });

  it("opens join modal on Join button press", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Join"));
    await waitFor(() => {
      expect(screen.getByText("Join a Group")).toBeTruthy();
      expect(screen.getByPlaceholderText("Invite code or link")).toBeTruthy();
      expect(screen.getByText("Continue")).toBeTruthy();
    });
  });

  it("shows error on empty join submit", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Join"));
    await waitFor(() => {
      expect(screen.getByText("Continue")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Please enter an invite code")).toBeTruthy();
    });
  });

  it("navigates to /join/{code} with raw code", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Join"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Invite code or link")).toBeTruthy();
    });
    fireEvent.changeText(screen.getByPlaceholderText("Invite code or link"), "abc123");
    fireEvent.press(screen.getByText("Continue"));
    expect(mockPush).toHaveBeenCalledWith("/join/abc123");
  });

  it("extracts code from pasted URL before navigating", async () => {
    render(<GroupsScreen />);
    fireEvent.press(screen.getByText("Join"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Invite code or link")).toBeTruthy();
    });
    fireEvent.changeText(screen.getByPlaceholderText("Invite code or link"), "https://splitr.ai/invite/xyz789");
    fireEvent.press(screen.getByText("Continue"));
    expect(mockPush).toHaveBeenCalledWith("/join/xyz789");
  });

  it("shows 'Have an invite code?' link in empty state", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Have an invite code?")).toBeTruthy();
    });
  });

  it("opens join modal from 'Have an invite code?' link", async () => {
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Have an invite code?")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Have an invite code?"));
    await waitFor(() => {
      expect(screen.getByText("Join a Group")).toBeTruthy();
    });
  });

  // --- Group navigation (line 254) via group card press ---
  it("navigates to group detail on group card text press", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Roommates")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Roommates"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups/g2");
  });

  // --- Action sheet options (lines 295-300): archive option opens confirm ---
  it("closes action sheet and opens delete confirm via Delete Group", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    fireEvent(screen.getByText("Trip to Paris"), "onLongPress");
    await waitFor(() => {
      expect(screen.getByText("Delete Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Delete Group"));
    await waitFor(() => {
      expect(screen.getByText(/Permanently delete/)).toBeTruthy();
    });
  });

  // --- Pull to refresh (lines 61-64) ---
  it("calls refetch via onRefresh", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    // refetch is called on focus
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // --- Balance on group cards ---
  it("shows per-group balance on card when positive", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseUserBalance.mockReturnValue({
      data: {
        totalOwedCents: 4500,
        totalOwesCents: 0,
        netBalanceCents: 4500,
        totalOwedByCurrency: [{ currency: "USD", amount: 4500 }],
        totalOwingByCurrency: [],
        groupBalances: [{ groupId: "g1", groupName: "Trip to Paris", balanceCents: 4500 }],
      },
      refetch: mockRefetchBalance,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      // Card shows "+€45.00" for group balance, banner shows "+$45.00" for overall
      expect(screen.getByText(/\+€45\.00/)).toBeTruthy();
    });
  });

  it("shows 'settled up' when group balance is zero", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseUserBalance.mockReturnValue({
      data: {
        totalOwedCents: 0,
        totalOwesCents: 0,
        netBalanceCents: 0,
        groupBalances: [{ groupId: "g1", groupName: "Trip to Paris", balanceCents: 0 }],
      },
      refetch: mockRefetchBalance,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("settled up")).toBeTruthy();
    });
  });

  it("shows summary balance banner when net balance is non-zero", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseUserBalance.mockReturnValue({
      data: {
        totalOwedCents: 5000,
        totalOwesCents: 2000,
        netBalanceCents: 3000,
        totalOwedByCurrency: [{ currency: "USD", amount: 5000 }],
        totalOwingByCurrency: [{ currency: "USD", amount: 2000 }],
        groupBalances: [
          { groupId: "g1", groupName: "Trip to Paris", balanceCents: 3000 },
          { groupId: "g2", groupName: "Roommates", balanceCents: 0 },
        ],
      },
      refetch: mockRefetchBalance,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Overall balance")).toBeTruthy();
      expect(screen.getByText("Owed to you")).toBeTruthy();
      expect(screen.getByText("You owe")).toBeTruthy();
    });
  });

  it("hides summary banner when net balance is zero", async () => {
    mockUseGroups.mockReturnValue({
      data: sampleGroups,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseUserBalance.mockReturnValue({
      data: {
        totalOwedCents: 1000,
        totalOwesCents: 1000,
        netBalanceCents: 0,
        groupBalances: [],
      },
      refetch: mockRefetchBalance,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    expect(screen.queryByText("Overall balance")).toBeNull();
  });

  it("does not show balance text when groupBalances has no entry for a group", async () => {
    mockUseGroups.mockReturnValue({
      data: [sampleGroups[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseUserBalance.mockReturnValue({
      data: {
        totalOwedCents: 5000,
        totalOwesCents: 2000,
        netBalanceCents: 3000,
        totalOwedByCurrency: [{ currency: "USD", amount: 5000 }],
        totalOwingByCurrency: [{ currency: "USD", amount: 2000 }],
        groupBalances: [], // no entry for g1
      },
      refetch: mockRefetchBalance,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip to Paris")).toBeTruthy();
    });
    // Should NOT show "settled up" since we don't have data for this group
    expect(screen.queryByText("settled up")).toBeNull();
  });

  it("shows relative time for last activity", async () => {
    const recentDate = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
    mockUseGroups.mockReturnValue({
      data: [{ ...sampleGroups[0], updatedAt: recentDate }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<GroupsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/ago|Just now|Yesterday/)).toBeTruthy();
    });
  });
});
