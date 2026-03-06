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
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { usersApi } from "@/lib/api";
import {
  configureForegroundHandler,
  registerPushToken,
  unregisterPushToken,
  clearBadge,
  getNotificationUrl,
  setupNotificationCategories,
} from "@/lib/notifications";

// Configure foreground handler at module load (before any component renders)
configureForegroundHandler();

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const lastResponseId = useRef<string | null>(null);

  // ---- Token registration on sign-in ----
  useEffect(() => {
    if (!isSignedIn) return;

    const register = async () => {
      await setupNotificationCategories();
      const authToken = await getToken();
      if (!authToken) return;

      await registerPushToken(async (pushToken, platform) => {
        await usersApi.registerPushToken(
          { token: pushToken, platform },
          authToken
        );
      });
    };

    register();
  }, [isSignedIn]);

  // ---- Token unregistration on sign-out ----
  useEffect(() => {
    if (isSignedIn) return;

    // User just signed out — unregister token
    const unregister = async () => {
      const authToken = await getToken().catch(() => null);
      await unregisterPushToken(async (pushToken) => {
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

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") clearBadge();
    });

    return () => subscription.remove();
  }, []);

  // ---- Handle notification taps (runtime: foreground + background) ----
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Deduplicate (same notification can fire multiple times)
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
      // Small delay to ensure navigation stack is ready
      setTimeout(() => router.push(url as any), 500);
    }
  }, [lastNotificationResponse, isSignedIn]);

  return <>{children}</>;
}
