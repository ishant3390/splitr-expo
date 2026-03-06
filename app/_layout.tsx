import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { useColorScheme } from "nativewind";
import { QueryClientProvider } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { ToastProvider } from "@/components/ui/toast";
import { NetworkProvider } from "@/components/NetworkProvider";
import * as SecureStore from "expo-secure-store";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // silently fail
    }
  },
};

function AuthGate() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

  useEffect(() => {
    if (!isSignedIn) return;
    const sync = async () => {
      try {
        const token = await getToken();
        if (token) await usersApi.sync(token);
      } catch {
        // sync failures are non-fatal
      }
    };
    sync();
  }, [isSignedIn]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="receipt-scanner" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="create-group"
        options={{
          animation: "slide_from_right",
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.85, 1.0],
        }}
      />
      <Stack.Screen name="group/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="edit-profile" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="pending-expenses" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="settle-up"
        options={{
          animation: "slide_from_right",
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkLoaded>
          <SafeAreaProvider>
            <ToastProvider>
              <NetworkProvider>
                <StatusBar style="auto" />
                <AuthGate />
              </NetworkProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </QueryClientProvider>
  );
}
