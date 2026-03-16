import "../global.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { AppState, Appearance, Platform, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { ToastProvider } from "@/components/ui/toast";
import { NetworkProvider } from "@/components/NetworkProvider";
import { NotificationProvider } from "@/components/NotificationProvider";
import {
  authenticateAppUnlock,
  getBiometricLabel,
  getBiometricLockEnabled,
  getBiometricSupport,
  setBiometricLockEnabled,
} from "@/lib/biometrics";
import * as SecureStore from "expo-secure-store";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import * as QuickActions from "expo-quick-actions";

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

const ONBOARDING_KEY = "@splitr/onboarding_complete";

function AuthGate() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setOnboardingChecked(true);
      return;
    }
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setNeedsOnboarding(value !== "true");
      setOnboardingChecked(true);
    });
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !onboardingChecked) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";
    // Invite/join routes are publicly accessible — unauthenticated users see the
    // group preview and are prompted to sign in only when they tap "Join"
    const inPublicRoute = segments[0] === "invite" || segments[0] === "join";

    if (!isSignedIn && !inAuthGroup && !inPublicRoute) {
      router.replace("/(auth)");
    } else if (isSignedIn && inAuthGroup) {
      if (needsOnboarding) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isSignedIn, isLoaded, segments, onboardingChecked, needsOnboarding]);

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
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="receipt-scanner" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-group" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="edit-profile" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="pending-expenses" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="help-support" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="privacy-security" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="payment-methods" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="notification-settings" options={{ animation: "slide_from_right" }} />
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

function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("biometrics");
  const appStateRef = useRef(AppState.currentState);
  const authInFlightRef = useRef(false);

  const promptForUnlock = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setLockEnabled(false);
      setUnlocked(true);
      return;
    }

    const enabled = await getBiometricLockEnabled();
    setLockEnabled(enabled);
    if (!enabled) {
      setUnlocked(true);
      return;
    }

    if (authInFlightRef.current) return;

    authInFlightRef.current = true;
    setAuthenticating(true);
    setUnlocked(false);

    const support = await getBiometricSupport();
    setBiometricLabel(getBiometricLabel(support.supportedAuthenticationTypes));

    if (!support.hasHardware || !support.isEnrolled) {
      await setBiometricLockEnabled(false);
      setLockEnabled(false);
      setUnlocked(true);
      authInFlightRef.current = false;
      setAuthenticating(false);
      return;
    }

    const result = await authenticateAppUnlock("Unlock Splitr");
    setUnlocked(result.success);
    authInFlightRef.current = false;
    setAuthenticating(false);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    promptForUnlock();
  }, [promptForUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const wasBackgrounded =
        previousState === "background" || previousState === "inactive";
      if (wasBackgrounded && nextState === "active") {
        promptForUnlock();
      }
    });

    return () => subscription.remove();
  }, [promptForUnlock]);

  const shouldBlock = isLoaded && isSignedIn && lockEnabled && !unlocked;

  return (
    <>
      {children}
      {shouldBlock && (
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          className="bg-background items-center justify-center px-6"
        >
          <View className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 items-center gap-3">
            <Text className="text-lg font-sans-bold text-card-foreground">App Locked</Text>
            <Text className="text-sm text-center text-muted-foreground font-sans">
              Authenticate with {biometricLabel} to continue.
            </Text>
            <Pressable
              className="mt-2 rounded-xl bg-primary px-5 py-3"
              disabled={authenticating}
              onPress={() => {
                promptForUnlock();
              }}
            >
              <Text className="text-sm font-sans-semibold text-primary-foreground">
                {authenticating ? "Checking..." : "Unlock"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Register 3D Touch / long-press quick actions
  useEffect(() => {
    QuickActions.setItems([
      {
        id: "add-expense",
        title: "Add Expense",
        icon: "add",
        params: { href: "/(tabs)/add" },
      },
      {
        id: "scan-receipt",
        title: "Scan Receipt",
        icon: "capturePhoto",
        params: { href: "/receipt-scanner" },
      },
      {
        id: "view-groups",
        title: "View Groups",
        icon: "contact",
        params: { href: "/(tabs)/groups" },
      },
    ]);
  }, []);

  // Restore persisted dark mode preference on app start
  useEffect(() => {
    AsyncStorage.getItem("@splitr/dark_mode").then((value) => {
      if (value === "dark" || value === "light") {
        if (Platform.OS !== "web") {
          Appearance.setColorScheme(value);
        }
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
                  <NotificationProvider>
                    <StatusBar style={Appearance.getColorScheme() === "dark" ? "light" : "dark"} />
                    <BiometricLockGate>
                      <AuthGate />
                    </BiometricLockGate>
                  </NotificationProvider>
                </NetworkProvider>
              </ToastProvider>
            </SafeAreaProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
