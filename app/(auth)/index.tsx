import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Platform, useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  GoogleIcon,
  AppleIcon,
} from "@/components/icons/social-icons";
import { Mail, Phone, ArrowRight, ChevronRight } from "lucide-react-native";
import { colors, palette, radius } from "@/lib/tokens";
import { GRADIENTS } from "@/lib/gradients";
import type { OAuthStrategy } from "@clerk/types";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<"signup" | "signin">("signup");
  const [signInEmail, setSignInEmail] = useState("");
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const { height: screenHeight } = useWindowDimensions();

  // Clerk OAuth hooks (native only — web uses redirect flow below)
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  // Clerk sign-in/sign-up for email/phone and web OAuth redirect
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();

  /**
   * Web: full-page redirect to OAuth provider (no popup — avoids browser popup blockers).
   * Native: popup via expo-web-browser (works natively).
   */
  const handleOAuth = useCallback(
    async (strategy: OAuthStrategy) => {
      try {
        if (Platform.OS === "web") {
          // Web: use Clerk's authenticateWithRedirect — does a full-page redirect.
          // Use signUp for new users, signIn for existing users.
          const resource = activeTab === "signup" ? signUp : signIn;
          if (!resource) return;
          await resource.authenticateWithRedirect({
            strategy,
            redirectUrl: "/sso-callback",
            redirectUrlComplete: "/",
          });
          // Browser will navigate away — no further code runs
        } else {
          // Native: popup-based OAuth via expo-web-browser
          const startFlow = strategy === "oauth_google" ? startGoogleOAuth : startAppleOAuth;
          const { createdSessionId, setActive: setActiveSession } =
            await startFlow({
              redirectUrl: Linking.createURL("/(tabs)"),
            });
          if (createdSessionId && setActiveSession) {
            await setActiveSession({ session: createdSessionId });
          }
        }
      } catch (err: any) {
        toast.error("Something went wrong. Try again later.");
      }
    },
    [signIn, signUp, activeTab, startGoogleOAuth, startAppleOAuth]
  );

  const handleSignInWithOtp = async () => {
    if (!signInEmail.trim()) {
      toast.error("Please enter your email or phone number.");
      return;
    }
    try {
      const isPhone = /^\+?\d{10,}$/.test(signInEmail.replace(/[\s\-()]/g, ""));
      if (isPhone) {
        await signIn?.create({ identifier: signInEmail });
        await signIn?.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: signIn?.supportedFirstFactors?.find(
            (f: any) => f.strategy === "phone_code"
          )?.phoneNumberId as string,
        });
      } else {
        await signIn?.create({ identifier: signInEmail });
        await signIn?.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: signIn?.supportedFirstFactors?.find(
            (f: any) => f.strategy === "email_code"
          )?.emailAddressId as string,
        });
      }
      router.push({
        pathname: "/(auth)/otp-verify",
        params: { contact: signInEmail, mode: "signin" },
      });
    } catch (err: any) {
      toast.error("Something went wrong. Try again later.");
    }
  };

  const isSignUp = activeTab === "signup";
  const actionLabel = isSignUp ? "Sign up" : "Sign in";

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ minHeight: screenHeight }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero section with gradient */}
        <LinearGradient
          colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24, overflow: "hidden" }}
        >
          {/* Decorative orbs */}
          <View
            style={{
              position: "absolute", top: -40, right: -40,
              width: 160, height: 160, borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            pointerEvents="none"
          />
          <View
            style={{
              position: "absolute", bottom: -20, left: -20,
              width: 100, height: 100, borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
            pointerEvents="none"
          />

          {/* Logo */}
          <View className="items-center">
            <View
              style={{
                width: 64, height: 64, borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center", justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: "700", color: palette.white }}>S</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: "700", color: palette.white, letterSpacing: -0.5 }}>
              Splitr
            </Text>
            <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
              Split expenses with friends, effortlessly
            </Text>
          </View>
        </LinearGradient>

        {/* Content area */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, flex: 1 }}>

          {/* Tab switcher */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: c.muted,
              borderRadius: radius.DEFAULT,
              padding: 4,
              marginBottom: 28,
            }}
          >
            {(["signup", "signin"] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => { setActiveTab(tab); setShowEmailSignIn(false); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: radius.md,
                    backgroundColor: isActive ? c.card : "transparent",
                    ...(isActive && !isDark ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 3,
                      elevation: 1,
                    } : {}),
                    ...(isActive && isDark ? {
                      borderWidth: 1,
                      borderColor: c.border,
                    } : {}),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isActive ? "600" : "500",
                      color: isActive ? c.foreground : c.mutedForeground,
                    }}
                  >
                    {tab === "signup" ? "Sign Up" : "Sign In"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Primary OAuth buttons — Google & Apple */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            {/* Google */}
            <Pressable
              onPress={() => handleOAuth("oauth_google")}
              accessibilityRole="button"
              accessibilityLabel={`${actionLabel} with Google`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 14,
                borderRadius: radius.DEFAULT,
                backgroundColor: isDark ? "#1a1a1a" : palette.white,
                borderWidth: 1,
                borderColor: isDark ? c.border : "#e2e8f0",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <GoogleIcon size={20} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.foreground }}>
                {actionLabel} with Google
              </Text>
            </Pressable>

            {/* Apple */}
            <Pressable
              onPress={() => handleOAuth("oauth_apple")}
              accessibilityRole="button"
              accessibilityLabel={`${actionLabel} with Apple`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 14,
                borderRadius: radius.DEFAULT,
                backgroundColor: isDark ? palette.white : palette.black,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppleIcon size={20} color={isDark ? palette.black : palette.white} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: isDark ? palette.black : palette.white }}>
                {actionLabel} with Apple
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            <Text style={{ marginHorizontal: 16, fontSize: 13, color: c.mutedForeground }}>
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </View>

          {/* Email/Phone section */}
          {isSignUp ? (
            <View style={{ marginTop: 8 }}>
              <Pressable
                onPress={() => router.push("/(auth)/signup-form")}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  paddingVertical: 14,
                  borderRadius: radius.DEFAULT,
                  backgroundColor: c.primary,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Mail size={18} color={palette.white} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: palette.white }}>
                  Sign up with email or phone
                </Text>
              </Pressable>
            </View>
          ) : showEmailSignIn ? (
            <View style={{ gap: 12, marginTop: 8 }}>
              <Input
                placeholder="Email address or phone number"
                value={signInEmail}
                onChangeText={setSignInEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button variant="default" onPress={handleSignInWithOtp}>
                <View className="flex-row items-center justify-center gap-2">
                  <ArrowRight size={18} color={palette.white} />
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Send verification code
                  </Text>
                </View>
              </Button>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowEmailSignIn(true)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingVertical: 14,
                marginTop: 8,
                borderRadius: radius.DEFAULT,
                borderWidth: 1,
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Mail size={18} color={c.mutedForeground} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.foreground }}>
                Sign in with email or phone
              </Text>
            </Pressable>
          )}

          {/* Terms */}
          <Text
            style={{
              fontSize: 12,
              color: c.mutedForeground,
              textAlign: "center",
              lineHeight: 18,
              marginTop: 24,
            }}
          >
            By continuing, you agree to our{" "}
            <Text style={{ color: c.primary, fontWeight: "500" }}>Terms of Service</Text>
            {" "}and{" "}
            <Text style={{ color: c.primary, fontWeight: "500" }}>Privacy Policy</Text>
          </Text>

          {/* Footer toggle */}
          <Pressable
            onPress={() => { setActiveTab(isSignUp ? "signin" : "signup"); setShowEmailSignIn(false); }}
            style={{ marginTop: 24 }}
          >
            <Text style={{ textAlign: "center", fontSize: 14, color: c.mutedForeground }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <Text style={{ color: c.primary, fontWeight: "600" }}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
