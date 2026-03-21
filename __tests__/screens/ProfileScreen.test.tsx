import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { Appearance } from "react-native";
import ProfileScreen from "@/app/(tabs)/profile";

const mockPush = jest.fn();
const mockSignOut = jest.fn();

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

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    signOut: mockSignOut,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      fullName: "Test User",
      firstName: "Test",
      primaryEmailAddress: { emailAddress: "test@example.com" },
      imageUrl: "https://example.com/avatar.png",
      createdAt: new Date("2025-01-01").getTime(),
    },
  }),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/lib/image-utils", () => ({
  sanitizeImageUrl: jest.fn((url: string | null | undefined) => url ?? undefined),
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

beforeEach(() => {
  jest.clearAllMocks();
});

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

  it("renders Appearance theme selector", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Appearance")).toBeTruthy();
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

  // --- Theme selector (System / Light / Dark) ---
  it("renders appearance section with three theme options", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("System")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Dark")).toBeTruthy();
  });

  it("switches to dark theme on Dark button press", () => {
    const mockSetColorScheme = jest.fn();
    const nativewind = require("nativewind");
    jest.spyOn(nativewind, "useColorScheme").mockReturnValue({
      colorScheme: "light",
      setColorScheme: mockSetColorScheme,
      toggleColorScheme: jest.fn(),
    });
    const AsyncStorageMock = require("@react-native-async-storage/async-storage");
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Dark"));
    expect(mockSetColorScheme).toHaveBeenCalledWith("dark");
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith("@splitr/dark_mode", "dark");
  });

  it("switches to light theme on Light button press", () => {
    const mockSetColorScheme = jest.fn();
    const nativewind = require("nativewind");
    jest.spyOn(nativewind, "useColorScheme").mockReturnValue({
      colorScheme: "dark",
      setColorScheme: mockSetColorScheme,
      toggleColorScheme: jest.fn(),
    });
    const AsyncStorageMock = require("@react-native-async-storage/async-storage");
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Light"));
    expect(mockSetColorScheme).toHaveBeenCalledWith("light");
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith("@splitr/dark_mode", "light");
  });

  it("switches to system theme on System button press", () => {
    const mockSetColorScheme = jest.fn();
    const nativewind = require("nativewind");
    jest.spyOn(nativewind, "useColorScheme").mockReturnValue({
      colorScheme: "dark",
      setColorScheme: mockSetColorScheme,
      toggleColorScheme: jest.fn(),
    });
    const AsyncStorageMock = require("@react-native-async-storage/async-storage");
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("System"));
    expect(mockSetColorScheme).toHaveBeenCalledWith("system");
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith("@splitr/dark_mode", "system");
  });

  // --- Sign out flow (lines 50-52, 183-191) ---
  it("shows sign out confirmation modal on Sign Out press", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Sign Out"));
    // ConfirmModal should now be visible with "Are you sure you want to sign out?"
    expect(screen.getByText("Are you sure you want to sign out?")).toBeTruthy();
  });

  it("calls signOut when confirming sign out", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Sign Out"));
    expect(screen.getByText("Are you sure you want to sign out?")).toBeTruthy();
    // The confirm button in the modal says "Sign Out"
    // There are two "Sign Out" texts — one on the button, one as confirm label
    const signOutButtons = screen.getAllByText("Sign Out");
    // Press the confirmation one (last one — the modal's confirm button)
    fireEvent.press(signOutButtons[signOutButtons.length - 1]);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("cancels sign out modal", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Sign Out"));
    expect(screen.getByText("Are you sure you want to sign out?")).toBeTruthy();
    fireEvent.press(screen.getByText("Cancel"));
    // Modal should be dismissed — message should no longer be visible
  });

  // --- Menu item navigation (lines 54-71) ---
  it("navigates to Edit Profile on press", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Edit Profile"));
    expect(mockPush).toHaveBeenCalledWith("/edit-profile");
  });

  it("navigates to Payment Methods on press", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Payment Methods"));
    expect(mockPush).toHaveBeenCalledWith("/payment-methods");
  });

  it("navigates to Notifications settings on press", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Notifications"));
    expect(mockPush).toHaveBeenCalledWith("/notification-settings");
  });

  it("navigates to Privacy & Security on press", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Privacy & Security"));
    expect(mockPush).toHaveBeenCalledWith("/privacy-security");
  });

  it("navigates to Help & Support on press", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Help & Support"));
    expect(mockPush).toHaveBeenCalledWith("/help-support");
  });

  // --- Premium badge (line 116-118) ---
  it("shows No for non-premium user", async () => {
    render(<ProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("No")).toBeTruthy();
      expect(screen.getByText("Premium")).toBeTruthy();
    });
  });

  it("shows Yes for premium user", async () => {
    jest.spyOn(require("@/lib/hooks"), "useUserProfile").mockReturnValue({
      data: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        defaultCurrency: "EUR",
        isPremium: true,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Yes")).toBeTruthy();
    });
  });

  // --- Member since from API (lines 123-127) ---
  it("shows member since date from API user", async () => {
    render(<ProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Member since")).toBeTruthy();
    });
  });

  // --- Member since fallback from Clerk (lines 125-126) ---
  it("falls back to Clerk createdAt when API createdAt is missing", async () => {
    jest.spyOn(require("@/lib/hooks"), "useUserProfile").mockReturnValue({
      data: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        defaultCurrency: "USD",
        isPremium: false,
        createdAt: null,
        updatedAt: "2025-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Member since")).toBeTruthy();
    });
  });

  // --- No apiUser data (line 40 default null) ---
  it("renders with null apiUser (loading or error)", () => {
    jest.spyOn(require("@/lib/hooks"), "useUserProfile").mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileScreen />);
    expect(screen.getByText("Profile")).toBeTruthy();
    // Currency should fallback to "USD"
    expect(screen.getByText("USD")).toBeTruthy();
    // Premium should be "No"
    expect(screen.getByText("No")).toBeTruthy();
  });

  // --- FE-5: Avatar uses backend avatarUrl, not Clerk ---
  it("shows initials when both profileImageUrl and avatarUrl are null (after deletion)", () => {
    jest.spyOn(require("@/lib/hooks"), "useUserProfile").mockReturnValue({
      data: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        defaultCurrency: "USD",
        isPremium: false,
        profileImageUrl: null,
        avatarUrl: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileScreen />);
    // Clerk imageUrl should NOT be used — initials "TU" should render
    expect(screen.getByText("TU")).toBeTruthy();
  });

  it("uses avatarUrl as fallback when profileImageUrl is null", () => {
    jest.spyOn(require("@/lib/hooks"), "useUserProfile").mockReturnValue({
      data: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        defaultCurrency: "USD",
        isPremium: false,
        profileImageUrl: null,
        avatarUrl: "https://cdn.splitr.ai/avatar.jpg",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileScreen />);
    // Should NOT show initials — avatarUrl should be used as src
    expect(screen.queryByText("TU")).toBeNull();
  });
});
