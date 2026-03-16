import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Linking, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  Bell,
  BellOff,
  DollarSign,
  HandCoins,
  Users,
  Clock,
  Shield,
  ChevronRight,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemedSwitch } from "@/components/ui/themed-switch";
import { useToast } from "@/components/ui/toast";
import { hapticSelection } from "@/lib/haptics";
import { usersApi } from "@/lib/api";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/lib/notifications";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const { getToken } = useAuth();

  const [systemPermission, setSystemPermission] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    const load = async () => {
      const [permission, savedPrefs] = await Promise.all([
        getNotificationPermissionStatus(),
        getNotificationPreferences(),
      ]);
      setSystemPermission(permission);
      setPrefs(savedPrefs);
    };
    load();
  }, []);

  const updatePref = useCallback(
    async (key: keyof NotificationPreferences, value: boolean | string) => {
      hapticSelection();
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      await saveNotificationPreferences(updated);

      // Sync global enabled toggle to backend
      if (key === "enabled") {
        try {
          const token = await getToken();
          if (token) {
            await usersApi.updateMe({ preferences: { notifications: value as boolean } }, token);
          }
        } catch {
          // Non-fatal — local pref is saved regardless
        }
      }
    },
    [prefs, getToken]
  );

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setSystemPermission(granted);
    if (!granted) {
      // Permission permanently denied — direct to system settings
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else {
        Linking.openSettings();
      }
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  const categories = [
    {
      key: "expenses" as const,
      icon: DollarSign,
      label: "Expenses",
      description: "New expenses, edits, and deletions in your groups",
    },
    {
      key: "settlements" as const,
      icon: HandCoins,
      label: "Settlements",
      description: "Payments received, sent, or reversed",
    },
    {
      key: "groups" as const,
      icon: Users,
      label: "Groups",
      description: "New group invites and member changes",
    },
    {
      key: "reminders" as const,
      icon: Clock,
      label: "Reminders",
      description: "Balance reminders and payment nudges",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">
          Notification Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 gap-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* System permission banner */}
        {systemPermission === false && (
          <Pressable onPress={handleEnableNotifications}>
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <View className="flex-row items-center gap-3">
                <BellOff size={20} color="#ef4444" />
                <View className="flex-1">
                  <Text className="text-sm font-sans-semibold text-foreground">
                    Notifications are disabled
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    Tap to enable in system settings
                  </Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </View>
            </Card>
          </Pressable>
        )}

        {/* Privacy notice */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <View className="flex-row items-start gap-3">
            <Shield size={18} color="#0d9488" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-sm font-sans-semibold text-foreground">
                Your privacy matters
              </Text>
              <Text className="text-xs text-muted-foreground font-sans mt-1 leading-4">
                Splitr never sends sensitive financial details in push notifications by default.
                You can opt in to detailed notifications below.
              </Text>
            </View>
          </View>
        </Card>

        {/* Global toggle */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                <Bell size={18} color="#0d9488" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-foreground">
                  Push Notifications
                </Text>
                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                  Receive alerts for expenses, settlements, and groups
                </Text>
              </View>
            </View>
            <ThemedSwitch
              checked={prefs.enabled}
              onCheckedChange={(val) => updatePref("enabled", val)}
            />
          </View>
        </Card>

        {/* Detail level */}
        <Card className="overflow-hidden">
          <View className="p-4 border-b border-border">
            <Text className="text-xs font-sans-semibold text-muted-foreground mb-3">
              NOTIFICATION DETAIL
            </Text>

            <Pressable
              onPress={() => updatePref("detailLevel", "privacy")}
              className="flex-row items-center gap-3 mb-3"
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: prefs.detailLevel === "privacy" ? "#0d9488" : "#94a3b8",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {prefs.detailLevel === "privacy" && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#0d9488",
                    }}
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-foreground">
                  Privacy mode (recommended)
                </Text>
                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                  "You have a new expense" — no amounts or names
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => updatePref("detailLevel", "detailed")}
              className="flex-row items-center gap-3"
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: prefs.detailLevel === "detailed" ? "#0d9488" : "#94a3b8",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {prefs.detailLevel === "detailed" && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#0d9488",
                    }}
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-foreground">
                  Detailed
                </Text>
                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                  "Alice added $25.00 for Dinner" — full details on lock screen
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>

        {/* Category toggles */}
        <Card className="overflow-hidden">
          <View className="p-4 pb-2">
            <Text className="text-xs font-sans-semibold text-muted-foreground">
              NOTIFICATION CATEGORIES
            </Text>
          </View>

          {categories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <View
                key={cat.key}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  index < categories.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center">
                    <Icon size={18} color="#64748b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-medium text-foreground">
                      {cat.label}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                      {cat.description}
                    </Text>
                  </View>
                </View>
                <ThemedSwitch
                  checked={prefs[cat.key]}
                  onCheckedChange={(val) => updatePref(cat.key, val)}
                />
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
