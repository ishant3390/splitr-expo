import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Platform, Appearance, useColorScheme as useSystemColorScheme } from "react-native";
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
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ThemedSwitch } from "@/components/ui/themed-switch";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useUserProfile } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { getInitials, formatDate } from "@/lib/utils";

const DARK_MODE_KEY = "@splitr/dark_mode";

const menuItems = [
  { icon: User, label: "Edit Profile", id: "profile" },
  { icon: CreditCard, label: "Payment Methods", id: "payment" },
  { icon: Bell, label: "Notifications", id: "notifications" },
  { icon: Shield, label: "Privacy & Security", id: "privacy" },
  { icon: HelpCircle, label: "Help & Support", id: "help" },
];

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const colorScheme = useSystemColorScheme();
  const { data: apiUser = null } = useUserProfile();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const toast = useToast();

  const handleToggleDarkMode = () => {
    const next = colorScheme === "dark" ? "light" : "dark";
    Appearance.setColorScheme(next);
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
        router.push("/notifications" as any);
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
        <View className="px-5 pt-3 pb-4">
          <Text className="text-2xl font-sans-bold text-foreground">Profile</Text>
        </View>

        <View className="px-5 gap-4">
          {/* User info card */}
          <Card className="p-5">
            <View className="flex-row items-center gap-4 mb-4">
              <Avatar
                src={user?.imageUrl}
                fallback={getInitials(user?.fullName ?? "?")}
                size="lg"
              />
              <View className="flex-1">
                <Text className="text-lg font-sans-bold text-card-foreground">
                  {user?.fullName ?? ""}
                </Text>
                <Text className="text-sm text-muted-foreground font-sans">
                  {user?.primaryEmailAddress?.emailAddress ?? ""}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row gap-4 pt-4 border-t border-border">
              <View className="flex-1 items-center">
                <Text className="text-xl font-sans-bold text-foreground">
                  {apiUser?.defaultCurrency ?? "USD"}
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">Currency</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xl font-sans-bold text-foreground">
                  {apiUser?.isPremium ? "Yes" : "No"}
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">Premium</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xl font-sans-bold text-primary">
                  {apiUser?.createdAt
                    ? formatDate(apiUser.createdAt)
                    : user?.createdAt
                    ? formatDate(new Date(user.createdAt).toISOString())
                    : "—"}
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">Member since</Text>
              </View>
            </View>
          </Card>

          {/* Settings */}
          <Card className="overflow-hidden">
            {/* Dark mode toggle */}
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center">
                  <Moon size={18} color="#64748b" />
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
                    <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center">
                      <Icon size={18} color="#64748b" />
                    </View>
                    <Text className="text-sm font-sans-medium text-card-foreground">
                      {item.label}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </Pressable>
              );
            })}
          </Card>

          {/* Sign out */}
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center gap-2 py-4"
          >
            <LogOut size={18} color="#ef4444" />
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
