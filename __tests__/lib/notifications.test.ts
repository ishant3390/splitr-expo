/**
 * Tests for lib/notifications.ts — push notification utilities.
 */

// Unmock the module under test (global setup.ts mocks it)
jest.unmock("@/lib/notifications");

// Must mock dependencies before importing
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: "ExponentPushToken[abc123]" })
  ),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

jest.mock("expo-device", () => ({
  __esModule: true,
  default: { isDevice: true },
  isDevice: true,
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "test-project-id" } } },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  configureForegroundHandler,
  setupAndroidChannels,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  clearBadge,
  getNotificationUrl,
  getNotificationPreferences,
  saveNotificationPreferences,
  setupNotificationCategories,
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREFS_KEY,
} from "@/lib/notifications";

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  // Restore default mocks after clearAllMocks
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
  (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: "ExponentPushToken[abc123]" });
  (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);
  (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(undefined);
  (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue(undefined);
});

describe("notifications.ts", () => {
  describe("configureForegroundHandler", () => {
    it("calls setNotificationHandler", () => {
      configureForegroundHandler();
      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          handleNotification: expect.any(Function),
        })
      );
    });

    it("handler returns all flags true", async () => {
      configureForegroundHandler();
      const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
      const result = await handler.handleNotification();
      expect(result).toEqual({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });
  });

  describe("getNotificationPermissionStatus", () => {
    it("returns true when granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
      expect(await getNotificationPermissionStatus()).toBe(true);
    });

    it("returns false when denied", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
      expect(await getNotificationPermissionStatus()).toBe(false);
    });
  });

  describe("requestNotificationPermission", () => {
    it("returns true if already granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it("requests permission if not granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledWith({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    });

    it("returns false if user denies", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
      expect(await requestNotificationPermission()).toBe(false);
    });
  });

  describe("getExpoPushToken", () => {
    it("returns token on physical device with permission", async () => {
      const token = await getExpoPushToken();
      expect(token).toBe("ExponentPushToken[abc123]");
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: "test-project-id",
      });
    });

    it("returns null on simulator", async () => {
      // Override the mock module's property
      (Device as any).isDevice = false;
      const token = await getExpoPushToken();
      expect(token).toBeNull();
      (Device as any).isDevice = true; // restore
    });

    it("returns null if permission denied", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
      const token = await getExpoPushToken();
      expect(token).toBeNull();
    });
  });

  describe("registerPushToken", () => {
    it("calls API register and stores token", async () => {
      const mockRegister = jest.fn(() => Promise.resolve());
      const token = await registerPushToken(mockRegister);
      expect(token).toBe("ExponentPushToken[abc123]");
      expect(mockRegister).toHaveBeenCalledWith(
        "ExponentPushToken[abc123]",
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("@splitr/push_token", "ExponentPushToken[abc123]");
    });

    it("skips API call if token already stored", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("ExponentPushToken[abc123]");
      const mockRegister = jest.fn(() => Promise.resolve());
      const token = await registerPushToken(mockRegister);
      expect(token).toBe("ExponentPushToken[abc123]");
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("handles API error gracefully", async () => {
      const mockRegister = jest.fn(() => Promise.reject(new Error("network")));
      const token = await registerPushToken(mockRegister);
      expect(token).toBe("ExponentPushToken[abc123]");
      // Token should NOT be stored on failure
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("returns null when push token is unavailable (e.g. simulator)", async () => {
      (Device as any).isDevice = false;
      const mockRegister = jest.fn();
      const token = await registerPushToken(mockRegister);
      expect(token).toBeNull();
      expect(mockRegister).not.toHaveBeenCalled();
      (Device as any).isDevice = true;
    });

    it("uses fallback deviceId when no projectId in config", async () => {
      // Clear stored token so it goes through the full registration path
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const originalConfig = require("expo-constants").expoConfig;
      require("expo-constants").expoConfig = { extra: {} }; // no eas.projectId

      const mockRegister = jest.fn(() => Promise.resolve());
      const token = await registerPushToken(mockRegister);
      expect(token).toBe("ExponentPushToken[abc123]");
      expect(mockRegister).toHaveBeenCalledWith(
        "ExponentPushToken[abc123]",
        expect.any(String),
        expect.stringContaining("ios-"), // fallback format
        expect.any(String)
      );

      require("expo-constants").expoConfig = originalConfig;
    });
  });

  describe("unregisterPushToken", () => {
    it("calls API unregister and removes stored token", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("ExponentPushToken[abc123]");
      const mockUnregister = jest.fn(() => Promise.resolve());
      await unregisterPushToken(mockUnregister);
      expect(mockUnregister).toHaveBeenCalledWith("ExponentPushToken[abc123]");
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/push_token");
    });

    it("does nothing if no stored token", async () => {
      const mockUnregister = jest.fn(() => Promise.resolve());
      await unregisterPushToken(mockUnregister);
      expect(mockUnregister).not.toHaveBeenCalled();
    });

    it("still removes stored token on API error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("ExponentPushToken[abc123]");
      const mockUnregister = jest.fn(() => Promise.reject(new Error("fail")));
      await unregisterPushToken(mockUnregister);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/push_token");
    });
  });

  describe("clearBadge", () => {
    it("sets badge count to 0", async () => {
      await clearBadge();
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe("getNotificationUrl", () => {
    it("constructs route from type + groupId for expense_created", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "expense_created", groupId: "grp_abc123" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/group/grp_abc123");
    });

    it("constructs settle-up route for settlement_created", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "settlement_created", groupId: "grp_xyz" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/settle-up?groupId=grp_xyz");
    });

    it("constructs group route for member_joined_via_invite", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "member_joined_via_invite", groupId: "grp_123" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/group/grp_123");
    });

    it("returns null when no groupId in data", () => {
      const response = {
        notification: {
          request: {
            content: { data: { type: "expense_created" } },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBeNull();
    });

    it("returns null when data is undefined", () => {
      const response = {
        notification: {
          request: {
            content: { data: undefined },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBeNull();
    });
  });

  describe("notification preferences", () => {
    it("returns defaults when no stored prefs", async () => {
      const prefs = await getNotificationPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
    });

    it("returns merged prefs from storage", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ detailLevel: "detailed", expenses: false })
      );
      const prefs = await getNotificationPreferences();
      expect(prefs.detailLevel).toBe("detailed");
      expect(prefs.expenses).toBe(false);
      expect(prefs.settlements).toBe(true); // from defaults
    });

    it("saves prefs to AsyncStorage", async () => {
      const prefs = { ...DEFAULT_NOTIFICATION_PREFS, detailLevel: "detailed" as const };
      await saveNotificationPreferences(prefs);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        NOTIFICATION_PREFS_KEY,
        JSON.stringify(prefs)
      );
    });
  });

  describe("setupAndroidChannels", () => {
    it("sets up channels on Android", async () => {
      const originalOS = require("react-native").Platform.OS;
      require("react-native").Platform.OS = "android";

      await setupAndroidChannels();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(4);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "expenses",
        expect.objectContaining({ name: "Expenses", sound: "default" })
      );
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "settlements",
        expect.objectContaining({ name: "Settlements" })
      );
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "groups",
        expect.objectContaining({ name: "Groups" })
      );
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "reminders",
        expect.objectContaining({ name: "Reminders" })
      );

      require("react-native").Platform.OS = originalOS;
    });
  });

  describe("getNotificationUrl — nudge and default types", () => {
    it("constructs settle-up route for settlement_nudge_debtor", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "settlement_nudge_debtor", groupId: "grp_1" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/settle-up?groupId=grp_1");
    });

    it("constructs settle-up route for settlement_nudge_manual", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "settlement_nudge_manual", groupId: "grp_2" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/settle-up?groupId=grp_2");
    });

    it("constructs group route for settlement_nudge_creditor", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "settlement_nudge_creditor", groupId: "grp_3" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/group/grp_3");
    });

    it("falls back to group route for unknown type", () => {
      const response = {
        notification: {
          request: {
            content: {
              data: { type: "some_unknown_type", groupId: "grp_4" },
            },
          },
        },
      } as any;
      expect(getNotificationUrl(response)).toBe("/group/grp_4");
    });
  });

  describe("setupNotificationCategories", () => {
    it("creates expense, settlement, and group categories", async () => {
      await setupNotificationCategories();
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledTimes(3);
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        "expense",
        expect.any(Array)
      );
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        "settlement",
        expect.any(Array)
      );
      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        "group",
        expect.any(Array)
      );
    });
  });
});
