import React from "react";
import { render, screen, act } from "@testing-library/react-native";
import { Text, AppState, Platform } from "react-native";

// Unmock NotificationProvider so we test the real implementation
jest.unmock("@/components/NotificationProvider");

// Mock usersApi
const mockRegisterPushToken = jest.fn(() => Promise.resolve());
const mockUnregisterPushTokenApi = jest.fn(() => Promise.resolve());
jest.mock("@/lib/api", () => ({
  usersApi: {
    registerPushToken: (...args: any[]) => mockRegisterPushToken(...args),
    unregisterPushToken: (...args: any[]) => mockUnregisterPushTokenApi(...args),
  },
}));

// Use jest.fn() directly inside factory to avoid hoisting issues
// configureForegroundHandler is called at module load time, so the mock must be ready
jest.mock("@/lib/notifications", () => {
  const registerPushTokenFn = jest.fn(async (callback: Function) => {
    await callback("push-token-123", "ios", "device-id", "Test Device");
  });
  const unregisterPushTokenFn = jest.fn(async (callback: Function) => {
    await callback("push-token-123");
  });
  const clearBadgeFn = jest.fn();
  const getNotificationUrlFn = jest.fn(() => "/(tabs)/groups/g1");
  const setupNotificationCategoriesFn = jest.fn();
  const configureForegroundHandlerFn = jest.fn();

  return {
    __esModule: true,
    configureForegroundHandler: configureForegroundHandlerFn,
    registerPushToken: registerPushTokenFn,
    unregisterPushToken: unregisterPushTokenFn,
    clearBadge: clearBadgeFn,
    getNotificationUrl: getNotificationUrlFn,
    setupNotificationCategories: setupNotificationCategoriesFn,
    setupAndroidChannels: jest.fn(),
    getNotificationPermissionStatus: jest.fn(() => Promise.resolve(true)),
    requestNotificationPermission: jest.fn(() => Promise.resolve(true)),
    getNotificationPreferences: jest.fn(() => Promise.resolve({
      enabled: true, detailLevel: "privacy", expenses: true,
      settlements: true, groups: true, reminders: true,
    })),
    saveNotificationPreferences: jest.fn(() => Promise.resolve()),
    getExpoPushToken: jest.fn(() => Promise.resolve("ExponentPushToken[test-token]")),
    NOTIFICATION_CHANNELS: {},
    NOTIFICATION_PREFS_KEY: "@splitr/notification_prefs",
    DEFAULT_NOTIFICATION_PREFS: {},
  };
});

// Track notification response listener
let notificationResponseCallback: ((response: any) => void) | null = null;
const mockRemoveListener = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn((cb: any) => {
  notificationResponseCallback = cb;
  return { remove: mockRemoveListener };
});
const mockUseLastNotificationResponse = jest.fn(() => null);

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "ExponentPushToken[test-token]" })),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: (...args: any[]) => mockAddNotificationResponseReceivedListener(...args),
  removeNotificationSubscription: jest.fn(),
  useLastNotificationResponse: (...args: any[]) => mockUseLastNotificationResponse(...args),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

// Mock router
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

// Mock clerk
let mockIsSignedIn = true;
const mockGetToken = jest.fn(() => Promise.resolve("mock-token"));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    signOut: jest.fn(),
    get isSignedIn() { return mockIsSignedIn; },
  }),
  useUser: () => ({ user: null }),
}));

import { NotificationProvider } from "@/components/NotificationProvider";

// Get references to the mocked functions after import
const notifMocks = require("@/lib/notifications");

// Mock AppState.addEventListener to return proper subscription
const mockAppStateRemove = jest.fn();
const appStateAddEventListenerSpy = jest.spyOn(AppState, "addEventListener").mockImplementation(
  (event: string, callback: any) => {
    return { remove: mockAppStateRemove } as any;
  }
);

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSignedIn = true;
  notificationResponseCallback = null;
  notifMocks.getNotificationUrl.mockReturnValue("/(tabs)/groups/g1");
  mockUseLastNotificationResponse.mockReturnValue(null);
});

afterAll(() => {
  appStateAddEventListenerSpy.mockRestore();
});

describe("NotificationProvider", () => {
  it("renders children", () => {
    render(
      <NotificationProvider>
        <Text>Child Content</Text>
      </NotificationProvider>
    );
    expect(screen.getByText("Child Content")).toBeTruthy();
  });

  it("renders multiple children", () => {
    render(
      <NotificationProvider>
        <Text>First</Text>
        <Text>Second</Text>
      </NotificationProvider>
    );
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("registers push token when signed in", async () => {
    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(notifMocks.setupNotificationCategories).toHaveBeenCalled();
    expect(notifMocks.registerPushToken).toHaveBeenCalled();
    expect(mockRegisterPushToken).toHaveBeenCalledWith(
      { token: "push-token-123", platform: "ios", deviceId: "device-id", deviceName: "Test Device" },
      "mock-token"
    );
  });

  it("skips token registration when getToken returns null", async () => {
    mockGetToken.mockResolvedValueOnce(null);

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(notifMocks.setupNotificationCategories).toHaveBeenCalled();
    expect(notifMocks.registerPushToken).not.toHaveBeenCalled();
  });

  it("unregisters token when signed out", async () => {
    mockIsSignedIn = false;

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(notifMocks.unregisterPushToken).toHaveBeenCalled();
  });

  it("unregisters token with backend when auth token available", async () => {
    mockIsSignedIn = false;
    mockGetToken.mockResolvedValueOnce("signout-token");

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockUnregisterPushTokenApi).toHaveBeenCalledWith("push-token-123", "signout-token");
  });

  it("unregisters token gracefully when getToken fails", async () => {
    mockIsSignedIn = false;
    mockGetToken.mockRejectedValueOnce(new Error("no session"));

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(notifMocks.unregisterPushToken).toHaveBeenCalled();
  });

  it("clears badge on mount", () => {
    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    expect(notifMocks.clearBadge).toHaveBeenCalled();
  });

  it("clears badge when app returns to active state", () => {
    let appStateCallback: ((state: string) => void) | undefined;
    // Temporarily override to capture callback
    appStateAddEventListenerSpy.mockImplementationOnce(
      (event: string, callback: any) => {
        if (event === "change") appStateCallback = callback;
        return { remove: jest.fn() } as any;
      }
    );

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    notifMocks.clearBadge.mockClear();

    if (appStateCallback) {
      appStateCallback("active");
    }

    expect(notifMocks.clearBadge).toHaveBeenCalled();
  });

  it("sets up notification response listener", () => {
    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
  });

  it("navigates on notification tap", () => {
    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    if (notificationResponseCallback) {
      notificationResponseCallback({
        notification: {
          request: { identifier: "notif-1" },
        },
      });
    }

    expect(notifMocks.getNotificationUrl).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups/g1");
  });

  it("deduplicates notification taps with same identifier", () => {
    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    const response = {
      notification: {
        request: { identifier: "notif-dup" },
      },
    };

    if (notificationResponseCallback) {
      notificationResponseCallback(response);
      notificationResponseCallback(response);
    }

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("does not navigate when getNotificationUrl returns null", () => {
    notifMocks.getNotificationUrl.mockReturnValue(null);

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    if (notificationResponseCallback) {
      notificationResponseCallback({
        notification: {
          request: { identifier: "notif-no-url" },
        },
      });
    }

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("handles cold start notification when signed in", async () => {
    jest.useFakeTimers();

    mockUseLastNotificationResponse.mockReturnValue({
      notification: {
        request: { identifier: "cold-start-1" },
      },
    });

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    jest.advanceTimersByTime(600);

    expect(notifMocks.getNotificationUrl).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/groups/g1");

    jest.useRealTimers();
  });

  it("skips cold start navigation when not signed in", () => {
    mockIsSignedIn = false;

    mockUseLastNotificationResponse.mockReturnValue({
      notification: {
        request: { identifier: "cold-start-2" },
      },
    });

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("skips cold start navigation when url is null", () => {
    jest.useFakeTimers();

    notifMocks.getNotificationUrl.mockReturnValue(null);
    mockUseLastNotificationResponse.mockReturnValue({
      notification: {
        request: { identifier: "cold-start-null-url" },
      },
    });

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    jest.advanceTimersByTime(600);
    expect(mockPush).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("cleans up response listener on unmount", () => {
    const { unmount } = render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    unmount();

    expect(mockRemoveListener).toHaveBeenCalled();
  });

  it("does not crash when unmounted during pending token registration", async () => {
    notifMocks.registerPushToken.mockImplementation(async (callback: Function) => {
      await new Promise((r) => setTimeout(r, 100));
      await callback("push-token-123", "ios", "device-id", "Test Device");
    });

    const { unmount } = render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    unmount();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    // If we reach here without throwing, test passes
    expect(notifMocks.registerPushToken).toHaveBeenCalled();
  });

  it("handles API register callback errors gracefully without crashing", async () => {
    // Mirror the real lib/notifications.ts behavior: callback rejections are caught inside registerPushToken
    notifMocks.registerPushToken.mockImplementationOnce(async (callback: Function) => {
      try {
        await callback("push-token-123", "ios", "device-id", "Test Device");
      } catch {
        // Swallowed — matches real registerPushToken try/catch
      }
    });
    mockRegisterPushToken.mockRejectedValueOnce(new Error("network down"));

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Register was invoked; the rejection is swallowed inside lib/notifications.ts
    expect(notifMocks.registerPushToken).toHaveBeenCalled();
    expect(mockRegisterPushToken).toHaveBeenCalled();
  });

  it("does not double-navigate when both cold-start and runtime listener see the same notification", () => {
    jest.useFakeTimers();

    const sharedResponse = {
      notification: {
        request: { identifier: "shared-notif-id" },
      },
    };

    mockUseLastNotificationResponse.mockReturnValue(sharedResponse);

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    // Fire runtime listener with same identifier (should be dedup'd against cold-start)
    if (notificationResponseCallback) {
      notificationResponseCallback(sharedResponse);
    }

    // Advance timers to let cold-start setTimeout fire
    jest.advanceTimersByTime(600);

    // Exactly one push total — dedup works regardless of who fires first
    expect(mockPush).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("unregisters token on sign-out even when unregister API call throws", async () => {
    mockIsSignedIn = false;
    // Mirror the real lib/notifications.ts behavior: callback rejections are caught inside unregisterPushToken
    notifMocks.unregisterPushToken.mockImplementationOnce(async (callback: Function) => {
      try {
        await callback("push-token-123");
      } catch {
        // Swallowed — matches real unregisterPushToken try/catch
      }
    });
    mockUnregisterPushTokenApi.mockRejectedValueOnce(new Error("network fail"));

    render(
      <NotificationProvider>
        <Text>App</Text>
      </NotificationProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // unregisterPushToken is still invoked; lib/notifications catches the API error internally
    expect(notifMocks.unregisterPushToken).toHaveBeenCalled();
  });
});
