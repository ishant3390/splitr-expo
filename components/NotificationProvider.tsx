/**
 * NotificationProvider — wraps the app to handle push notification lifecycle.
 *
 * Responsibilities:
 * - Register push token on sign-in
 * - Unregister on sign-out
 * - Handle notification taps (foreground + background + cold start)
 * - Navigate to the right screen via Expo Router
 * - Clear badge on app open
 */

import React, { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { usersApi } from "@/lib/api";

// Only import notifications on native platforms
const isNative = Platform.OS === "ios" || Platform.OS === "android";

// Conditionally configure foreground handler at module load
if (isNative) {
  const { configureForegroundHandler } = require("@/lib/notifications");
  configureForegroundHandler();
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // On web, just render children — no notification support
  if (!isNative) return <>{children}</>;

  return <NativeNotificationProvider>{children}</NativeNotificationProvider>;
}

function NativeNotificationProvider({ children }: NotificationProviderProps) {
  const Notifications = require("expo-notifications") as typeof import("expo-notifications");
  const {
    registerPushToken,
    unregisterPushToken,
    clearBadge,
    getNotificationUrl,
    setupNotificationCategories,
  } = require("@/lib/notifications");

  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const responseListener = useRef<import("expo-notifications").EventSubscription | null>(null);
  const lastResponseId = useRef<string | null>(null);

  // ---- Token registration on sign-in ----
  useEffect(() => {
    if (!isSignedIn) return;

    const register = async () => {
      await setupNotificationCategories();
      const authToken = await getToken();
      if (!authToken) return;

      await registerPushToken(async (pushToken: string, platform: string, deviceId: string, deviceName: string) => {
        await usersApi.registerPushToken(
          { token: pushToken, platform, deviceId, deviceName },
          authToken
        );
      });
    };

    register();
  }, [isSignedIn]);

  // ---- Token unregistration on sign-out ----
  useEffect(() => {
    if (isSignedIn) return;

    const unregister = async () => {
      const authToken = await getToken().catch(() => null);
      await unregisterPushToken(async (pushToken: string) => {
        if (authToken) {
          await usersApi.unregisterPushToken(pushToken, authToken);
        }
      });
    };

    unregister();
  }, [isSignedIn]);

  // ---- Clear badge on app open / foreground ----
  useEffect(() => {
    clearBadge();

    const subscription = AppState.addEventListener("change", (nextState: string) => {
      if (nextState === "active") clearBadge();
    });

    return () => subscription.remove();
  }, []);

  // ---- Handle notification taps (runtime: foreground + background) ----
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const responseId = response.notification.request.identifier;
        if (lastResponseId.current === responseId) return;
        lastResponseId.current = responseId;

        const url = getNotificationUrl(response);
        if (url) {
          router.push(url as any);
        }
      }
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  // ---- Handle cold start (app launched from notification tap) ----
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse || !isSignedIn) return;

    const responseId = lastNotificationResponse.notification.request.identifier;
    if (lastResponseId.current === responseId) return;
    lastResponseId.current = responseId;

    const url = getNotificationUrl(lastNotificationResponse);
    if (url) {
      setTimeout(() => router.push(url as any), 500);
    }
  }, [lastNotificationResponse, isSignedIn]);

  return <>{children}</>;
}
