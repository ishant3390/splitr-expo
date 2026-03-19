import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import {
  GoogleIcon,
  AppleIcon,
  FacebookIcon,
  InstagramIcon,
} from "@/components/icons/social-icons";
import { Mail, Phone } from "lucide-react-native";
import { palette } from "@/lib/tokens";

WebBrowser.maybeCompleteAuthSession();

const authTabs = [
  { id: "signup", label: "Sign Up" },
  { id: "signin", label: "Sign In" },
];

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState("signup");
  const router = useRouter();
  const toast = useToast();

  // Clerk OAuth hooks
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: "oauth_facebook" });
  const { startOAuthFlow: startInstagramOAuth } = useOAuth({ strategy: "oauth_instagram" });

  // Clerk sign-in for email/phone
  const { signIn, setActive } = useSignIn();

  const [signInEmail, setSignInEmail] = useState("");

  const handleOAuth = useCallback(
    async (startFlow: typeof startGoogleOAuth) => {
      try {
        const { createdSessionId, setActive: setActiveSession } =
          await startFlow({
            redirectUrl: Linking.createURL("/(tabs)"),
          });
        if (createdSessionId && setActiveSession) {
          await setActiveSession({ session: createdSessionId });
        }
      } catch (err: any) {
        toast.error("Something went wrong. Try again later.");
      }
    },
    []
  );

  const handleSignInWithOtp = async () => {
    if (!signInEmail.trim()) {
      toast.error("Please enter your email or phone number.");
      return;
    }
    try {
      // Determine if email or phone
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

  const socialProviders = [
    { name: "Google", icon: <GoogleIcon size={22} />, onPress: () => handleOAuth(startGoogleOAuth) },
    { name: "Apple", icon: <AppleIcon size={22} />, onPress: () => handleOAuth(startAppleOAuth) },
    { name: "Facebook", icon: <FacebookIcon size={22} />, onPress: () => handleOAuth(startFacebookOAuth) },
    { name: "Instagram", icon: <InstagramIcon size={22} />, onPress: () => handleOAuth(startInstagramOAuth) },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-12 pb-10"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
            <Text className="text-3xl font-sans-bold text-primary-foreground">S</Text>
          </View>
          <Text className="text-3xl font-sans-bold text-foreground">Splitr</Text>
          <Text className="text-base text-muted-foreground font-sans mt-1">
            Split expenses effortlessly
          </Text>
        </View>

        {/* Tabs */}
        <Tabs
          tabs={authTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-8"
        />

        {/* Social OAuth buttons */}
        <View className="gap-3 mb-6">
          {socialProviders.map((provider) => (
            <Button
              key={provider.name}
              variant="outline"
              onPress={provider.onPress}
              className="flex-row items-center justify-center gap-3 py-3.5"
            >
              {provider.icon}
              <Text className="text-base font-sans-medium text-foreground">
                {activeTab === "signup" ? "Sign up" : "Sign in"} with {provider.name}
              </Text>
            </Button>
          ))}
        </View>

        {/* Divider */}
        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-border" />
          <Text className="mx-4 text-sm text-muted-foreground font-sans">or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        {/* Sign Up form vs Sign In form */}
        {activeTab === "signup" ? (
          <View className="gap-4">
            <Button
              variant="default"
              onPress={() => router.push("/(auth)/signup-form")}
              className="flex-row items-center justify-center gap-3"
            >
              <Mail size={20} color={palette.white} />
              <Text className="text-base font-sans-semibold text-primary-foreground">
                Sign up with email or phone
              </Text>
            </Button>

            <Text className="text-xs text-center text-muted-foreground font-sans leading-5">
              {"By signing up, you agree to our Terms of Service and Privacy Policy."}
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            <Input
              placeholder="Email address or phone number"
              value={signInEmail}
              onChangeText={setSignInEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button variant="default" onPress={handleSignInWithOtp}>
              <View className="flex-row items-center justify-center gap-2">
                <Phone size={18} color={palette.white} />
                <Text className="text-base font-sans-semibold text-primary-foreground">
                  Send verification code
                </Text>
              </View>
            </Button>
          </View>
        )}

        {/* Footer toggle */}
        <Pressable onPress={() => setActiveTab(activeTab === "signup" ? "signin" : "signup")} className="mt-8">
          <Text className="text-center text-sm text-muted-foreground font-sans">
            {activeTab === "signup"
              ? "Already have an account? "
              : "Don't have an account? "}
            <Text className="text-primary font-sans-semibold">
              {activeTab === "signup" ? "Sign In" : "Sign Up"}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
