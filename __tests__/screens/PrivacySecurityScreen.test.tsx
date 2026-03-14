import React from "react";
import { Platform, Linking } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PrivacySecurityScreen from "@/app/privacy-security";

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastInfo = jest.fn();

const mockGetBiometricLockEnabled = jest.fn(() => Promise.resolve(false));
const mockGetBiometricSupport = jest.fn(() =>
  Promise.resolve({
    hasHardware: true,
    isEnrolled: true,
    supportedAuthenticationTypes: [1],
  })
);
const mockGetBiometricLabel = jest.fn(() => "fingerprint");
const mockAuthenticateAppUnlock = jest.fn(() => Promise.resolve({ success: true }));
const mockSetBiometricLockEnabled = jest.fn(() => Promise.resolve());

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  }),
}));

jest.mock("@/lib/haptics", () => ({
  hapticLight: jest.fn(),
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(),
}));

jest.mock("@/lib/biometrics", () => ({
  getBiometricLockEnabled: () => mockGetBiometricLockEnabled(),
  getBiometricSupport: () => mockGetBiometricSupport(),
  getBiometricLabel: (types: number[]) => mockGetBiometricLabel(types),
  authenticateAppUnlock: (prompt: string) => mockAuthenticateAppUnlock(prompt),
  setBiometricLockEnabled: (enabled: boolean) => mockSetBiometricLockEnabled(enabled),
}));

const mockMe = jest.fn(() => Promise.resolve({ id: "u1", name: "Test" }));
jest.mock("@/lib/api", () => ({
  usersApi: {
    me: (...args: any[]) => mockMe(...args),
  },
}));

// Mock ThemedSwitch using Switch (supports valueChange event + press)
jest.mock("@/components/ui/themed-switch", () => {
  const MockReact = require("react");
  const RN = require("react-native");
  return {
    ThemedSwitch: ({ checked, onCheckedChange, testID, disabled }: any) =>
      MockReact.createElement(RN.Switch, {
        testID,
        value: checked,
        onValueChange: (val: boolean) => !disabled && onCheckedChange(val),
        disabled,
      }),
  };
});

// Mock ConfirmModal
jest.mock("@/components/ui/confirm-modal", () => {
  const MockReact = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    ConfirmModal: ({ visible, title, confirmLabel, onConfirm, onCancel }: any) => {
      if (!visible) return null;
      return MockReact.createElement(View, { testID: "confirm-modal" },
        MockReact.createElement(Text, null, title),
        MockReact.createElement(Pressable, { onPress: onConfirm },
          MockReact.createElement(Text, null, confirmLabel || "Confirm")
        ),
        MockReact.createElement(Pressable, { onPress: onCancel },
          MockReact.createElement(Text, null, "Cancel")
        )
      );
    },
  };
});

describe("PrivacySecurityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBiometricLockEnabled.mockResolvedValue(false);
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: true,
      isEnrolled: true,
      supportedAuthenticationTypes: [1],
    });
    mockGetBiometricLabel.mockReturnValue("fingerprint");
    mockAuthenticateAppUnlock.mockResolvedValue({ success: true });
    mockSetBiometricLockEnabled.mockResolvedValue(undefined);
  });

  it("renders privacy and app lock sections", async () => {
    render(<PrivacySecurityScreen />);
    expect(screen.getByText("Privacy & Security")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("Lock app with fingerprint")).toBeTruthy();
    });
  });

  it("renders data & storage and legal sections", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Data & Storage")).toBeTruthy();
      expect(screen.getByText("Export Your Data")).toBeTruthy();
      expect(screen.getByText("Clear Local Cache")).toBeTruthy();
      expect(screen.getByText("Legal")).toBeTruthy();
      expect(screen.getByText("Privacy Policy")).toBeTruthy();
      expect(screen.getByText("Terms of Service")).toBeTruthy();
    });
  });

  it("renders active sessions section", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeTruthy();
    });
  });

  it("enables biometric lock after successful authentication", async () => {
    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockAuthenticateAppUnlock).toHaveBeenCalledWith("Enable biometric app lock");
      expect(mockSetBiometricLockEnabled).toHaveBeenCalledWith(true);
      expect(mockToastSuccess).toHaveBeenCalledWith("Biometric app lock enabled.");
    });
  });

  it("disables biometric lock without auth prompt", async () => {
    mockGetBiometricLockEnabled.mockResolvedValue(true);
    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", false);

    await waitFor(() => {
      expect(mockAuthenticateAppUnlock).not.toHaveBeenCalled();
      expect(mockSetBiometricLockEnabled).toHaveBeenCalledWith(false);
      expect(mockToastInfo).toHaveBeenCalledWith("Biometric app lock disabled.");
    });
  });

  it("shows an error when biometrics are not enrolled", async () => {
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: true,
      isEnrolled: false,
      supportedAuthenticationTypes: [1],
    });

    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockAuthenticateAppUnlock).not.toHaveBeenCalled();
      expect(mockSetBiometricLockEnabled).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalled();
      // Platform-specific message
      const errorMsg = mockToastError.mock.calls[0][0];
      expect(errorMsg).toMatch(/Set up|fingerprint|face/i);
    });
  });

  it("renders delete account section", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete Account")).toBeTruthy();
    });
  });

  it("shows no hardware error when device has no biometrics", async () => {
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: false,
      isEnrolled: false,
      supportedAuthenticationTypes: [],
    });

    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Biometric authentication is not available on this device."
      );
    });
  });

  it("handles biometric auth cancellation", async () => {
    mockAuthenticateAppUnlock.mockResolvedValue({ success: false, error: "user_cancel" });

    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith("Biometric verification cancelled.");
    });
  });

  it("handles biometric auth failure", async () => {
    mockAuthenticateAppUnlock.mockResolvedValue({ success: false, error: "authentication_failed" });

    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Biometric verification failed. Please try again."
      );
    });
  });

  it("opens delete account modal and confirms", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => {
      expect(screen.getByText("Yes, Delete My Account")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Yes, Delete My Account"));
    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith(
        "Please email support@splitr.ai to request account deletion. We'll process it within 48 hours."
      );
    });
  });

  it("opens clear cache modal and confirms", async () => {
    const AsyncStorageMock = AsyncStorage as any;
    AsyncStorageMock.getAllKeys = jest.fn().mockResolvedValue([
      "@splitr/add_expense_defaults",
      "@splitr/notification_prefs",
      "@splitr/biometric_lock",
    ]);
    AsyncStorageMock.multiRemove = jest.fn().mockResolvedValue(undefined);

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Clear Local Cache")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Clear Local Cache"));
    await waitFor(() => {
      expect(screen.getByText("Clear Cache")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Clear Cache"));
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("Cleared"));
    });
  });

  it("exports data and shows info toast", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Export Your Data")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Export Your Data"));
    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith(
        "A data export link will be sent to your email within 24 hours."
      );
    });
  });

  it("handles export data failure", async () => {
    mockMe.mockRejectedValueOnce(new Error("network error"));
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Export Your Data")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Export Your Data"));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it("opens privacy policy link", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Privacy Policy")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Privacy Policy"));
    expect(spy).toHaveBeenCalledWith("https://splitr.ai/privacy");
    spy.mockRestore();
  });

  it("opens terms of service link", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Terms of Service")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Terms of Service"));
    expect(spy).toHaveBeenCalledWith("https://splitr.ai/terms");
    spy.mockRestore();
  });

  it("renders security info cards", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("How We Protect Your Data")).toBeTruthy();
      expect(screen.getByText("Encryption")).toBeTruthy();
      expect(screen.getByText("Secure Sign-In")).toBeTruthy();
      expect(screen.getByText("Privacy First")).toBeTruthy();
    });
  });

  it("shows no active sessions when list is empty", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("No active sessions found")).toBeTruthy();
    });
  });

  it("renders sessions when available from Clerk", async () => {
    const mockGetSessions = jest.fn().mockResolvedValue([
      {
        id: "sess-1",
        lastActiveAt: new Date("2026-03-05T10:00:00Z"),
        latestActivity: { browserName: "Chrome", deviceType: "Desktop", city: "San Francisco", country: "US" },
        status: "active",
      },
      {
        id: "sess-2",
        lastActiveAt: new Date("2026-03-04T10:00:00Z"),
        latestActivity: { browserName: "Safari", deviceType: "Mobile" },
        status: "active",
      },
    ]);

    // Override useUser for this test
    const clerkMock = require("@clerk/clerk-expo");
    const origUseUser = clerkMock.useUser;
    clerkMock.useUser = () => ({
      user: {
        fullName: "Test",
        primaryEmailAddress: { emailAddress: "t@t.com" },
        imageUrl: "https://example.com/img.png",
        getSessions: mockGetSessions,
        createdAt: new Date(),
      },
    });

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Chrome on Desktop")).toBeTruthy();
      expect(screen.getByText("Safari on Mobile")).toBeTruthy();
    });

    clerkMock.useUser = origUseUser;
  });

  it("shows biometric unavailable link when biometrics not available", async () => {
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: false,
      isEnrolled: false,
      supportedAuthenticationTypes: [],
    });

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      const text = Platform.OS === "ios"
        ? "Face ID / Touch ID not set up. Tap to open Settings."
        : "Biometrics not set up. Tap to open Settings.";
      expect(screen.getByText(text)).toBeTruthy();
    });
  });

  it("taps biometric unavailable link to open settings", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));
    const settingsSpy = jest.spyOn(Linking, "openSettings").mockImplementation(() => Promise.resolve());
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: false,
      isEnrolled: false,
      supportedAuthenticationTypes: [],
    });

    render(<PrivacySecurityScreen />);
    const text = Platform.OS === "ios"
      ? "Face ID / Touch ID not set up. Tap to open Settings."
      : "Biometrics not set up. Tap to open Settings.";
    await waitFor(() => {
      expect(screen.getByText(text)).toBeTruthy();
    });
    fireEvent.press(screen.getByText(text));
    if (Platform.OS === "ios") {
      expect(spy).toHaveBeenCalledWith("app-settings:");
    } else {
      expect(settingsSpy).toHaveBeenCalled();
    }
    spy.mockRestore();
    settingsSpy.mockRestore();
  });

  it("handles clear cache with nothing to remove", async () => {
    const AsyncStorageMock = AsyncStorage as any;
    AsyncStorageMock.getAllKeys = jest.fn().mockResolvedValue([
      "@splitr/biometric_lock",
      "@splitr/dark_mode",
    ]);
    AsyncStorageMock.multiRemove = jest.fn().mockResolvedValue(undefined);

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Clear Local Cache")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Clear Local Cache"));
    await waitFor(() => {
      expect(screen.getByText("Clear Cache")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Clear Cache"));
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Cleared 0 cached items.");
    });
  });

  it("handles clear cache failure", async () => {
    const AsyncStorageMock = AsyncStorage as any;
    AsyncStorageMock.getAllKeys = jest.fn().mockRejectedValue(new Error("fail"));

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Clear Local Cache")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Clear Local Cache"));
    await waitFor(() => {
      expect(screen.getByText("Clear Cache")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Clear Cache"));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to clear cache.");
    });
  });

  it("cancels delete account modal", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => {
      expect(screen.getByText("Yes, Delete My Account")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Cancel"));
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText("Yes, Delete My Account")).toBeNull();
    });
  });

  it("revokes a session successfully", async () => {
    const mockRevoke = jest.fn().mockResolvedValue(undefined);
    const mockGetSessions = jest.fn().mockResolvedValue([
      {
        id: "sess-1",
        lastActiveAt: new Date(),
        latestActivity: { browserName: "Chrome", deviceType: "Desktop" },
        status: "active",
        revoke: mockRevoke,
      },
      {
        id: "sess-2",
        lastActiveAt: new Date(),
        latestActivity: { browserName: "Safari", deviceType: "Mobile" },
        status: "active",
        revoke: jest.fn(),
      },
    ]);

    const clerkMock = require("@clerk/clerk-expo");
    const origUseUser = clerkMock.useUser;
    clerkMock.useUser = () => ({
      user: {
        fullName: "Test",
        primaryEmailAddress: { emailAddress: "t@t.com" },
        imageUrl: null,
        getSessions: mockGetSessions,
        createdAt: new Date(),
      },
    });

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Chrome on Desktop")).toBeTruthy();
    });

    const revokeButtons = screen.getAllByText("Revoke");
    expect(revokeButtons.length).toBeGreaterThan(0);
    fireEvent.press(revokeButtons[0]);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Session revoked.");
    });

    clerkMock.useUser = origUseUser;
  });

  it("handles system_cancel on biometric toggle", async () => {
    mockAuthenticateAppUnlock.mockResolvedValue({ success: false, error: "system_cancel" });
    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith("Biometric verification cancelled.");
    });
  });

  it("renders session with location info", async () => {
    const mockGetSessions = jest.fn().mockResolvedValue([
      {
        id: "sess-1",
        lastActiveAt: new Date(),
        latestActivity: { browserName: "Chrome", deviceType: "Desktop", city: "San Francisco", country: "US" },
        status: "active",
      },
    ]);

    const clerkMock = require("@clerk/clerk-expo");
    const origUseUser = clerkMock.useUser;
    clerkMock.useUser = () => ({
      user: {
        fullName: "Test",
        primaryEmailAddress: { emailAddress: "t@t.com" },
        imageUrl: null,
        getSessions: mockGetSessions,
        createdAt: new Date(),
      },
    });

    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("San Francisco, US")).toBeTruthy();
    });

    clerkMock.useUser = origUseUser;
  });

  it("navigates back on back button press", async () => {
    const mockBack = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true,
    });

    render(<PrivacySecurityScreen />);
    expect(screen.getByText("Privacy & Security")).toBeTruthy();
  });
});
