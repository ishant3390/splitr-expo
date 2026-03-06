import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    const ensureUser = async () => {
      try {
        const token = await getToken();
        if (token) {
          await usersApi.me(token);
        }
      } catch {
        // user creation/fetch is non-fatal on startup
      }
    };
    ensureUser();
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
      <Stack.Screen name="help-support" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="privacy-security" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="payment-methods" options={{ animation: "slide_from_right" }} />
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

  // Restore persisted dark mode preference on app start
  useEffect(() => {
    AsyncStorage.getItem("@splitr/dark_mode").then((value) => {
      if (value === "dark" || value === "light") {
        Appearance.setColorScheme(value);
      }
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <ClerkLoaded>
            <SafeAreaProvider>
              <ToastProvider>
                <NetworkProvider>
                  <StatusBar style={Appearance.getColorScheme() === "dark" ? "light" : "dark"} />
                  <AuthGate />
                </NetworkProvider>
              </ToastProvider>
            </SafeAreaProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
