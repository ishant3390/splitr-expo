import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ThemedSwitch } from "@/components/ui/themed-switch";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useUserProfile } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { getInitials, formatMemberSince } from "@/lib/utils";
import { colors, radius, palette } from "@/lib/tokens";

const DARK_MODE_KEY = "@splitr/dark_mode";

const menuItems = [
  { icon: User, label: "Edit Profile", id: "profile", iconBg: palette.teal50, iconBgDark: "rgba(13,148,136,0.12)", iconColor: palette.teal600 },
  { icon: CreditCard, label: "Payment Methods", id: "payment", iconBg: "#eef2ff", iconBgDark: "rgba(99,102,241,0.12)", iconColor: palette.indigo500 },
  { icon: Bell, label: "Notifications", id: "notifications", iconBg: "#fffbeb", iconBgDark: "rgba(245,158,11,0.12)", iconColor: palette.amber500 },
  { icon: Shield, label: "Privacy & Security", id: "privacy", iconBg: "#ecfdf5", iconBgDark: "rgba(16,185,129,0.12)", iconColor: palette.emerald500 },
  { icon: HelpCircle, label: "Help & Support", id: "help", iconBg: "#eff6ff", iconBgDark: "rgba(59,130,246,0.12)", iconColor: palette.blue500 },
];

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const { data: apiUser = null } = useUserProfile();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const toast = useToast();

  const handleToggleDarkMode = () => {
    const next = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(next);
    AsyncStorage.setItem(DARK_MODE_KEY, next);
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const handleMenuPress = (id: string) => {
    switch (id) {
      case "profile":
        router.push("/edit-profile");
        break;
      case "payment":
        router.push("/payment-methods" as any);
        break;
      case "notifications":
        router.push("/notification-settings" as any);
        break;
      case "privacy":
        router.push("/privacy-security" as any);
        break;
      case "help":
        router.push("/help-support" as any);
        break;
    }
  };

  return (
    <>
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: "hidden" }}
        >
          {/* Watermark */}
          <View
            style={{ position: "absolute", bottom: -30, right: -20, opacity: 0.06 }}
            pointerEvents="none"
          >
            <User size={180} color={palette.white} strokeWidth={1} />
          </View>

          {/* Decorative orb */}
          <View
            style={{
              position: "absolute", top: -30, left: -30,
              width: 100, height: 100, borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            pointerEvents="none"
          />

          {/* Title */}
          <View className="px-5 pt-3 pb-2">
            <Text className="text-2xl font-sans-bold" style={{ color: palette.white }}>
              Profile
            </Text>
          </View>

          {/* Avatar + Name + Email */}
          <View className="items-center px-5 pt-2 pb-4">
            <View
              style={{
                width: 76, height: 76, borderRadius: radius.full,
                borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
                overflow: "hidden",
              }}
            >
              <Avatar
                src={user?.imageUrl}
                fallback={getInitials(user?.fullName ?? "?")}
                size="lg"
                className="w-full h-full"
              />
            </View>
            <Text
              className="text-lg font-sans-bold mt-3"
              style={{ color: palette.white }}
            >
              {user?.fullName ?? ""}
            </Text>
            <Text
              className="text-sm font-sans mt-0.5"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </Text>
          </View>

          {/* Stats row */}
          <View className="px-5 pb-5">
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: radius.lg,
                padding: 14,
                flexDirection: "row",
              }}
            >
              <View className="flex-1 items-center">
                <Text
                  className="text-lg font-sans-bold"
                  style={{ color: palette.white }}
                >
                  {apiUser?.defaultCurrency ?? "USD"}
                </Text>
                <Text
                  className="text-xs font-sans mt-0.5"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Currency
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
              <View className="flex-1 items-center">
                <Text
                  className="text-lg font-sans-bold"
                  style={{ color: palette.white }}
                >
                  {apiUser?.isPremium ? "Yes" : "No"}
                </Text>
                <Text
                  className="text-xs font-sans mt-0.5"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Premium
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
              <View className="flex-1 items-center">
                <Text
                  className="text-lg font-sans-bold"
                  style={{ color: palette.white }}
                >
                  {apiUser?.createdAt
                    ? formatMemberSince(apiUser.createdAt)
                    : user?.createdAt
                    ? formatMemberSince(new Date(user.createdAt).toISOString())
                    : "—"}
                </Text>
                <Text
                  className="text-xs font-sans mt-0.5"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Member since
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5 pt-4 gap-4">

          {/* Settings */}
          <Card className="overflow-hidden">
            {/* Dark mode toggle */}
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center"
                  style={{ backgroundColor: isDark ? "rgba(139,92,246,0.12)" : "#f5f3ff" }}
                >
                  <Moon size={18} color="#8b5cf6" />
                </View>
                <Text className="text-sm font-sans-medium text-card-foreground">Dark Mode</Text>
              </View>
              <ThemedSwitch checked={colorScheme === "dark"} onCheckedChange={handleToggleDarkMode} />
            </View>

            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleMenuPress(item.id)}
                  className={`flex-row items-center justify-between p-4 ${
                    index < menuItems.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-9 h-9 rounded-lg items-center justify-center"
                      style={{ backgroundColor: isDark ? item.iconBgDark : item.iconBg }}
                    >
                      <Icon size={18} color={item.iconColor} />
                    </View>
                    <Text className="text-sm font-sans-medium text-card-foreground">
                      {item.label}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={palette.slate400} />
                </Pressable>
              );
            })}
          </Card>

          {/* Sign out */}
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center gap-2 py-4"
          >
            <LogOut size={18} color={c.destructive} />
            <Text className="text-base font-sans-semibold text-destructive">Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>

    <ConfirmModal
      visible={showSignOutModal}
      title="Sign Out"
      message="Are you sure you want to sign out?"
      confirmLabel="Sign Out"
      destructive
      onConfirm={() => { setShowSignOutModal(false); signOut(); }}
      onCancel={() => setShowSignOutModal(false)}
    />
    </>
  );
}
