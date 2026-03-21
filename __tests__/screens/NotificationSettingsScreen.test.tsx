import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/lib/api", () => ({
  usersApi: {
    updateMe: jest.fn(() => Promise.resolve({})),
  },
}));

const mockUpdateProfileMutate = jest.fn();
jest.mock("@/lib/hooks", () => ({
  useUserProfile: () => ({
    data: {
      preferences: { emailDigest: "weekly" },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfileMutate,
    isLoading: false,
  }),
}));

jest.mock("@/components/ui/themed-switch", () => {
  const MockReact = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    ThemedSwitch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (val: boolean) => void }) =>
      MockReact.createElement(
        Pressable,
        { onPress: () => onCheckedChange(!checked), accessibilityRole: "switch" },
        MockReact.createElement(Text, null, checked ? "ON" : "OFF")
      ),
  };
});

import NotificationSettingsScreen from "@/app/notification-settings";
import { getNotificationPermissionStatus, getNotificationPreferences, saveNotificationPreferences } from "@/lib/notifications";

const mockGetPermission = getNotificationPermissionStatus as jest.Mock;
const mockGetPrefs = getNotificationPreferences as jest.Mock;
const mockSavePrefs = saveNotificationPreferences as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateProfileMutate.mockReset();
  mockGetPermission.mockResolvedValue(true);
  mockGetPrefs.mockResolvedValue({
    enabled: true,
    detailLevel: "privacy",
    expenses: true,
    settlements: true,
    groups: true,
    reminders: true,
  });
});

describe("NotificationSettingsScreen", () => {
  it("renders header", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Notification Settings")).toBeTruthy();
    });
  });

  it("renders privacy notice", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Your privacy matters")).toBeTruthy();
    });
  });

  it("renders push notifications toggle", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Push Notifications")).toBeTruthy();
    });
  });

  it("renders notification detail section", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("NOTIFICATION DETAIL")).toBeTruthy();
      expect(screen.getByText("Privacy mode (recommended)")).toBeTruthy();
      expect(screen.getByText("Detailed")).toBeTruthy();
    });
  });

  it("renders all notification categories", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("NOTIFICATION CATEGORIES")).toBeTruthy();
      expect(screen.getByText("Expenses")).toBeTruthy();
      expect(screen.getByText("Settlements")).toBeTruthy();
      expect(screen.getByText("Groups")).toBeTruthy();
      expect(screen.getByText("Reminders")).toBeTruthy();
    });
  });

  it("renders category descriptions", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("New expenses, edits, and deletions in your groups")).toBeTruthy();
      expect(screen.getByText("Payments received, sent, or reversed")).toBeTruthy();
      expect(screen.getByText("New group invites and member changes")).toBeTruthy();
      expect(screen.getByText("Balance reminders and payment nudges")).toBeTruthy();
    });
  });

  it("shows disabled banner when system permission is false", async () => {
    mockGetPermission.mockResolvedValue(false);
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Notifications are disabled")).toBeTruthy();
      expect(screen.getByText("Tap to enable in system settings")).toBeTruthy();
    });
  });

  it("saves preference when toggling a category", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Expenses")).toBeTruthy();
    });

    const switches = screen.getAllByText("ON");
    // Toggle a category switch (index 0 = global, 1 = expenses)
    fireEvent.press(switches[1]);

    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalled();
    });
  });

  it("syncs global enabled toggle to backend", async () => {
    const { usersApi } = require("@/lib/api");
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Push Notifications")).toBeTruthy();
    });

    // Toggle the global switch (first ON switch)
    const switches = screen.getAllByText("ON");
    fireEvent.press(switches[0]); // global toggle

    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
      expect(usersApi.updateMe).toHaveBeenCalledWith(
        { preferences: { notifications: false } },
        "mock-token"
      );
    });
  });

  it("handles enable notifications button tap when permission denied", async () => {
    const { Linking, Platform } = require("react-native");
    const spy = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));
    const { requestNotificationPermission } = require("@/lib/notifications");
    (requestNotificationPermission as jest.Mock).mockResolvedValue(false);

    mockGetPermission.mockResolvedValue(false);
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Notifications are disabled")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Notifications are disabled"));
    await waitFor(() => {
      expect(requestNotificationPermission).toHaveBeenCalled();
    });
    spy.mockRestore();
  });

  it("switches detail level to detailed", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Detailed")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Detailed"));
    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalledWith(
        expect.objectContaining({ detailLevel: "detailed" })
      );
    });
  });

  it("switches detail level back to privacy", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Privacy mode (recommended)")).toBeTruthy();
    });

    // Switch to detailed first
    fireEvent.press(screen.getByText("Detailed"));
    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalled();
    });

    // Switch back to privacy
    fireEvent.press(screen.getByText("Privacy mode (recommended)"));
    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalledWith(
        expect.objectContaining({ detailLevel: "privacy" })
      );
    });
  });

  it("toggles all category switches", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Settlements")).toBeTruthy();
    });

    const switches = screen.getAllByText("ON");
    // Toggle settlements (index 2), groups (3), reminders (4)
    for (let i = 2; i < switches.length; i++) {
      fireEvent.press(switches[i]);
    }
    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalled();
    });
  });

  it("renders detail level descriptions", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/You have a new expense/)).toBeTruthy();
      expect(screen.getByText(/Alice added \$25.00 for Dinner/)).toBeTruthy();
    });
  });

  it("handles backend error gracefully when syncing global toggle", async () => {
    const { usersApi } = require("@/lib/api");
    usersApi.updateMe = jest.fn(() => Promise.reject(new Error("Network error")));

    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Push Notifications")).toBeTruthy();
    });

    // Toggle global switch — backend fails but local pref is still saved
    const switches = screen.getAllByText("ON");
    fireEvent.press(switches[0]);

    await waitFor(() => {
      expect(mockSavePrefs).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
    // Should not crash despite backend error
  });

  // --- Email Digest section ---
  it("renders email digest section with 3 options", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("EMAIL DIGEST")).toBeTruthy();
      expect(screen.getByText("Digest Frequency")).toBeTruthy();
      expect(screen.getByText("Weekly")).toBeTruthy();
      expect(screen.getByText("Daily")).toBeTruthy();
      expect(screen.getByText("Off")).toBeTruthy();
    });
  });

  it("shows Weekly selected by default", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Summary email every Monday morning")).toBeTruthy();
    });
  });

  it("triggers mutation with daily when Daily is pressed", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Daily")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("email-digest-daily"));
    await waitFor(() => {
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { preferences: { emailDigest: "daily" } },
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });
  });

  it("triggers mutation with off when Off is pressed", async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Off")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("email-digest-off"));
    await waitFor(() => {
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { preferences: { emailDigest: "off" } },
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });
  });

  it("reverts digest and shows toast on mutation failure", async () => {
    // Make mutate call the onError callback
    mockUpdateProfileMutate.mockImplementation((_data: any, opts: any) => {
      if (opts?.onError) opts.onError(new Error("Network error"));
    });

    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Daily")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("email-digest-daily"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to update digest preference.");
    });
  });
});
