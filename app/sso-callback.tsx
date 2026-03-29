/**
 * SSO Callback — handles redirect back from OAuth provider on web.
 *
 * After the user authenticates with Google/Apple via full-page redirect,
 * the provider redirects back to /sso-callback with auth params.
 * Clerk's AuthenticateWithRedirectCallback handles completing the flow.
 */

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Platform } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { colors, palette } from "@/lib/tokens";
import { useColorScheme } from "nativewind";

const TIMEOUT_MS = 15000;

export default function SSOCallbackScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // This route is web-only — native uses popup flow
  if (Platform.OS !== "web") {
    return <Redirect href="/" />;
  }

  // Timeout fallback — if Clerk can't complete the flow, redirect back to auth
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.background,
        gap: 16,
      }}
    >
      <ActivityIndicator size="large" color={palette.teal600} />
      <Text style={{ fontSize: 15, color: c.mutedForeground }}>
        Completing sign in...
      </Text>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/(auth)"
        signUpFallbackRedirectUrl="/(auth)"
      />
    </View>
  );
}
