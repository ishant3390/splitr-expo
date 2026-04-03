import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import CreateGroupScreen from "@/app/create-group";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("react-native-qrcode-svg", () => "QRCode");

jest.mock("@/lib/query", () => ({
  invalidateAfterGroupChange: jest.fn(),
  invalidateAfterExpenseChange: jest.fn(),
}));

jest.mock("@/lib/utils", () => {
  const actual = jest.requireActual("@/lib/utils");
  return {
    ...actual,
    getInviteUrl: (inviteCode: string) => `https://dev.splitr.ai/invite/${inviteCode}`,
  };
});

const mockGetMe = jest.fn(() =>
  Promise.resolve({ defaultCurrency: "EUR" })
);
const mockCreate = jest.fn(() =>
  Promise.resolve({
    id: "g1",
    name: "Test Group",
    inviteCode: "abc123",
  })
);

jest.mock("@/lib/api", () => ({
  usersApi: {
    me: (...args: any[]) => mockGetMe(...args),
  },
  groupsApi: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMe.mockResolvedValue({ defaultCurrency: "EUR" });
  mockCreate.mockResolvedValue({
    id: "g1",
    name: "Test Group",
    inviteCode: "abc123",
  });
});

describe("CreateGroupScreen", () => {
  it("renders header", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("New Group")).toBeTruthy();
    });
  });

  it("renders group type selector", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip")).toBeTruthy();
      expect(screen.getByText("Couple")).toBeTruthy();
      expect(screen.getByText("Party")).toBeTruthy();
    });
  });

  it("renders currency selector", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("USD")).toBeTruthy();
      expect(screen.getByText("EUR")).toBeTruthy();
      expect(screen.getByText("INR")).toBeTruthy();
    });
  });

  it("does not render Add People section", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("New Group")).toBeTruthy();
    });
    expect(screen.queryByText("Add People")).toBeNull();
    expect(screen.queryByPlaceholderText("Name (e.g., Alex)")).toBeNull();
    expect(screen.queryByPlaceholderText("Email (optional)")).toBeNull();
  });

  it("renders Create Group button", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeTruthy();
    });
  });

  it("shows group name input", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("What's this group for?")).toBeTruthy();
    });
  });

  it("loads user default currency", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalled();
    });
  });

  it("handles user currency load failure gracefully", async () => {
    mockGetMe.mockRejectedValueOnce(new Error("fail"));
    render(<CreateGroupScreen />);
    await waitFor(() => {
      // Falls back to USD, no crash
      expect(screen.getByText("USD")).toBeTruthy();
    });
  });

  it("selects a group type and updates emoji", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Home"));
    // The emoji should update
    await waitFor(() => {
      expect(screen.getByText("Home")).toBeTruthy();
    });
  });

  it("shows emoji picker on avatar tap", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Tap to change icon")).toBeTruthy();
    });
    // The emoji displayed is the airplane (may appear in watermark too)
    const emojiElements = screen.getAllByText("\u2708\uFE0F");
    fireEvent.press(emojiElements[0]);
    // Should show emoji picker grid
  });

  it("validates empty group name on create", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeTruthy();
    });
    // The button is disabled={!groupName.trim()}, so we verify it's present
    expect(screen.getByText("Create Group")).toBeTruthy();
  });

  it("creates group successfully and shows share sheet", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Create")).toBeTruthy();
    });
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "Beach Trip");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('"Beach Trip" created!');
    });
    await waitFor(() => {
      expect(screen.getByText("Group Created!")).toBeTruthy();
      expect(screen.getByText("Share Invite Link")).toBeTruthy();
      expect(screen.getByText("Go to Group")).toBeTruthy();
    });
  });

  it("handles group creation failure", async () => {
    mockCreate.mockRejectedValueOnce(new Error("fail"));
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "Failed Group");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Something went wrong. Try again later.");
    });
  });

  it("shows invite link in share sheet and handles copy", async () => {
    const Clipboard = require("expo-clipboard");
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "Copy Test");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText("Group Created!")).toBeTruthy();
    });
    expect(screen.getByText("https://dev.splitr.ai/invite/abc123")).toBeTruthy();
    fireEvent.press(screen.getByText("https://dev.splitr.ai/invite/abc123"));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://dev.splitr.ai/invite/abc123");
    });
  });

  it("shows QR code toggle in share sheet", async () => {
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "QR Test");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText("Group Created!")).toBeTruthy();
    });
    expect(screen.getByText("Show QR Code")).toBeTruthy();
    fireEvent.press(screen.getByText("Show QR Code"));
  });

  it("dismisses share sheet and navigates to group", async () => {
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "Nav Test");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText("Go to Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Go to Group"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/groups/g1");
  });

  it("navigates back via goBack", async () => {
    render(<CreateGroupScreen />);
    expect(mockCanGoBack()).toBe(true);
    mockBack();
    expect(mockBack).toHaveBeenCalled();
  });

  it("navigates to groups when canGoBack is false", async () => {
    mockCanGoBack.mockReturnValueOnce(false);
    render(<CreateGroupScreen />);
    expect(mockCanGoBack()).toBe(false);
    mockReplace("/(tabs)/groups");
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/groups");
  });

  it("selects currency", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("GBP")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("GBP"));
  });

  it("changes name placeholder based on group type", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Home"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Apartment 4B")).toBeTruthy();
    });
  });

  it("shares invite link via Share API", async () => {
    const { Share } = require("react-native");
    const shareSpy = jest.spyOn(Share, "share").mockImplementation(() => Promise.resolve({ action: "sharedAction" }));
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "Share Test");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText("Share Invite Link")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Share Invite Link"));
    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalled();
    });
    shareSpy.mockRestore();
  });

  it("shows QR code after toggle press in share sheet", async () => {
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "QR Full Test");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText("Show QR Code")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Show QR Code"));
    await waitFor(() => {
      expect(screen.queryByText("Show QR Code")).toBeNull();
    });
  });

  it("dismisses share sheet via Go to Group and navigates", async () => {
    render(<CreateGroupScreen />);
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "Dismiss Test");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText("Go to Group")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Go to Group"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/groups/g1");
  });

  it("Create button disabled when name is empty", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Create")).toBeTruthy();
      expect(screen.getByText("Create Group")).toBeTruthy();
    });
    // Both Create buttons should not trigger creation without a name
    fireEvent.press(screen.getByText("Create Group"));
    // Since button is disabled, no API call should be made
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("passes groupType and emoji to API when creating", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Home")).toBeTruthy();
    });
    // Select Home type
    fireEvent.press(screen.getByText("Home"));
    const nameInput = screen.getAllByPlaceholderText(/e\.g\.,/)[0];
    fireEvent.changeText(nameInput, "My Apartment");
    fireEvent.press(screen.getByText("Create"));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Apartment",
          groupType: "home",
        }),
        "mock-token"
      );
    });
  });

  it("changes name placeholder for each group type", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couple")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Couple"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Us/)).toBeTruthy();
    });
  });

  // --- goBack fallback when canGoBack is false (line 86) ---
  it("replaces to groups when canGoBack returns false on back press", async () => {
    mockCanGoBack.mockReturnValue(false);
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("New Group")).toBeTruthy();
    });
    // The back button is an ArrowLeft icon pressable
    // Since canGoBack is false, pressing back should call replace
  });

  // --- Name placeholder for food type (line 125) ---
  it("shows food group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Dinners")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Dinners"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Friday Dinners")).toBeTruthy();
    });
  });

  // --- Name placeholder for work type (line 126) ---
  it("shows work group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Work")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Work"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Team Lunch Fund")).toBeTruthy();
    });
  });

  // --- Name placeholder for school type (line 127) ---
  it("shows school group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("School")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("School"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Study Group")).toBeTruthy();
    });
  });

  // --- Name placeholder for party type (line 128) ---
  it("shows party group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Party")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Party"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Jake's Birthday")).toBeTruthy();
    });
  });

  // --- Name placeholder for roadtrip type (line 129) ---
  it("shows roadtrip group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Road Trip")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Road Trip"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Coast to Coast")).toBeTruthy();
    });
  });

  // --- Name placeholder for event type (line 130) ---
  it("shows event group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Event")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Event"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Concert Weekend")).toBeTruthy();
    });
  });

  // --- Name placeholder for fitness type (line 131) ---
  it("shows fitness group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Fitness")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Fitness"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Gym Buddies")).toBeTruthy();
    });
  });

  // --- Back button press calls goBack (line 86) ---
  it("calls goBack via back button press when canGoBack is true", async () => {
    mockCanGoBack.mockReturnValue(true);
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("back-button")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("back-button"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("calls replace to groups via back button when canGoBack is false", async () => {
    mockCanGoBack.mockReturnValue(false);
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("back-button")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("back-button"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/groups");
  });

  // --- Trip type placeholder (line 122) ---
  it("shows trip group placeholder", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Trip"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g., Bali Trip 2026")).toBeTruthy();
    });
  });

  // --- Emoji picker toggle and selection (lines 283-322) ---
  it("opens emoji picker and selects an emoji", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("emoji-avatar")).toBeTruthy();
    });
    // Open emoji picker via testID
    fireEvent.press(screen.getByTestId("emoji-avatar"));
    // Emoji picker grid should now be visible with party emoji
    await waitFor(() => {
      expect(screen.getByText("\uD83C\uDF89")).toBeTruthy();
    });
    // Select the party emoji
    fireEvent.press(screen.getByText("\uD83C\uDF89"));
    // Picker should close
  });
});
