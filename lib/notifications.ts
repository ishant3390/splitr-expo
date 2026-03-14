/**
 * Push notification utilities for Splitr.
 *
 * FINANCIAL APP SAFETY:
 * - Notification payloads carry only type + IDs, never amounts or PII
 * - App fetches details via authenticated API when user taps notification
 * - Token is deleted on sign-out to prevent stale delivery
 * - Badge is cleared on app open
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Constants ----

const PUSH_TOKEN_KEY = "@splitr/push_token";

export const NOTIFICATION_CHANNELS = {
  expenses: { id: "expenses", name: "Expenses", importance: Notifications.AndroidImportance.MAX },
  settlements: { id: "settlements", name: "Settlements", importance: Notifications.AndroidImportance.HIGH },
  groups: { id: "groups", name: "Groups", importance: Notifications.AndroidImportance.DEFAULT },
  reminders: { id: "reminders", name: "Reminders", importance: Notifications.AndroidImportance.DEFAULT },
} as const;

/** Notification preference keys stored in AsyncStorage */
export const NOTIFICATION_PREFS_KEY = "@splitr/notification_prefs";

export interface NotificationPreferences {
  /** Whether push notifications are enabled globally */
  enabled: boolean;
  /** Detail level: "privacy" = generic text, "detailed" = amounts + names */
  detailLevel: "privacy" | "detailed";
  /** Per-category toggles */
  expenses: boolean;
  settlements: boolean;
  groups: boolean;
  reminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  detailLevel: "privacy",
  expenses: true,
  settlements: true,
  groups: true,
  reminders: true,
};

// ---- Foreground handler ----

/**
 * Configure how notifications are handled when the app is in the foreground.
 * Must be called at module load time (before any component renders).
 */
export function configureForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ---- Android channels ----

export async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  for (const channel of Object.values(NOTIFICATION_CHANNELS)) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: channel.importance,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

// ---- Permissions ----

export async function getNotificationPermissionStatus(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === "granted";
}

// ---- Token registration ----

/**
 * Get the Expo push token for this device.
 * Returns null on simulator or if permissions denied.
 */
export async function getExpoPushToken(): Promise<string | null> {
  // Push doesn't work on simulators
  if (!Device.isDevice) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Setup Android channels before getting token
  await setupAndroidChannels();

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data; // "ExponentPushToken[xxx]"
}

/**
 * Register the push token with the backend.
 * Safe to call on every app launch (re-registering same token is harmless).
 * Sends deviceId, deviceName, and platform alongside the token.
 */
export async function registerPushToken(
  apiRegister: (token: string, platform: string, deviceId: string, deviceName: string) => Promise<void>
): Promise<string | null> {
  const token = await getExpoPushToken();
  if (!token) return null;

  // Check if token already registered
  const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (storedToken === token) return token; // Already registered, skip API call

  const deviceId = Constants.expoConfig?.extra?.eas?.projectId
    ? `${Platform.OS}-${Constants.expoConfig.extra.eas.projectId}`
    : `${Platform.OS}-${Date.now()}`;
  const deviceName = Device.modelName ?? `${Platform.OS} device`;

  try {
    await apiRegister(token, Platform.OS, deviceId, deviceName);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    // Non-fatal — will retry on next launch
  }

  return token;
}

/**
 * Unregister the push token from the backend (call on sign-out).
 */
export async function unregisterPushToken(
  apiUnregister: (token: string) => Promise<void>
): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await apiUnregister(token);
  } catch {
    // Best effort — token will become stale on backend eventually
  }

  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

// ---- Badge ----

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}

// ---- Navigation route from notification ----

/**
 * Construct a navigation route from a notification response payload.
 * Payload contains `type` + `groupId` (no pre-built URL).
 */
export function getNotificationUrl(
  response: Notifications.NotificationResponse
): string | null {
  const data = response.notification.request.content.data;
  if (!data) return null;

  const type = data.type as string | undefined;
  const groupId = data.groupId as string | undefined;

  if (!groupId) return null;

  switch (type) {
    case "expense_created":
    case "expense_updated":
    case "expense_deleted":
    case "coalesced_expenses":
      return `/(tabs)/groups/${groupId}`;
    case "settlement_created":
      return `/settle-up?groupId=${groupId}`;
    case "settlement_nudge_debtor":
    case "settlement_nudge_manual":
      return `/settle-up?groupId=${groupId}`;
    case "settlement_nudge_creditor":
      return `/(tabs)/groups/${groupId}`;
    case "member_joined_via_invite":
      return `/(tabs)/groups/${groupId}`;
    default:
      return `/(tabs)/groups/${groupId}`;
  }
}

// ---- Preferences ----

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (raw) return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
}

// ---- Notification categories (iOS action buttons) ----

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("expense", [
    { identifier: "view", buttonTitle: "View Details", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync("settlement", [
    { identifier: "view", buttonTitle: "View", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync("group", [
    { identifier: "view", buttonTitle: "Open Group", options: { opensAppToForeground: true } },
  ]);
}
