import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { hapticLight, hapticSelection, hapticSuccess, hapticError } from "@/lib/haptics";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@clerk/clerk-expo";
import { groupsApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useUser } from "@clerk/clerk-expo";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Utensils,
  Car,
  Home as HomeIcon,
  Gamepad2,
  ShoppingBag,
  Plane,
  Heart,
  Zap,
  Coffee,
  Gift,
  Briefcase,
  Wifi,
  AlertTriangle,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { SkeletonList } from "@/components/ui/skeleton";
import { useUserActivity, useUserBalance, useTopDebtor } from "@/lib/hooks";
import { useNetwork } from "@/components/NetworkProvider";
import { cn, formatCents, formatDate, getInitials } from "@/lib/utils";
import { formatActivityTitle, formatActivityInvolvement } from "@/lib/screen-helpers";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CheckCircle, Users, Clock, HandCoins } from "lucide-react-native";
import type { ActivityLogDto } from "@/lib/types";

// Airbnb-style category data
const CATEGORIES = [
  { key: "all", label: "All", icon: Zap, emoji: "⚡" },
  { key: "food", label: "Food", icon: Utensils, emoji: "🍕" },
  { key: "transport", label: "Transport", icon: Car, emoji: "🚗" },
  { key: "travel", label: "Travel", icon: Plane, emoji: "✈️" },
  { key: "home", label: "Home", icon: HomeIcon, emoji: "🏠" },
  { key: "entertainment", label: "Fun", icon: Gamepad2, emoji: "🎮" },
  { key: "shopping", label: "Shopping", icon: ShoppingBag, emoji: "🛍️" },
  { key: "coffee", label: "Coffee", icon: Coffee, emoji: "☕" },
  { key: "gifts", label: "Gifts", icon: Gift, emoji: "🎁" },
  { key: "health", label: "Health", icon: Heart, emoji: "❤️" },
  { key: "work", label: "Work", icon: Briefcase, emoji: "💼" },
  { key: "utilities", label: "Utilities", icon: Wifi, emoji: "📡" },
] as const;

// Map activity type or category name to an emoji for activity items
const ACTIVITY_EMOJI_MAP: Record<string, string> = {
  expense_created: "💸",
  expense_updated: "✏️",
  expense_deleted: "🗑️",
  member_joined: "👋",
  member_left: "👋",
  group_created: "🎉",
  settlement_created: "🤝",
  food: "🍕",
  transport: "🚗",
  accommodation: "🏠",
  entertainment: "🎮",
  shopping: "🛍️",
  travel: "✈️",
  other: "📋",
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { pendingCount } = useNetwork();
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);

  const {
    data: activity = [],
    isLoading: loading,
    error: activityError,
    refetch: refetchActivity,
  } = useUserActivity();

  const {
    data: balanceData,
    error: balanceError,
    refetch: refetchBalance,
  } = useUserBalance();

  const hasError = !!(activityError || balanceError) && !loading && activity.length === 0;

  const totalOwedCents = balanceData?.totalOwedCents ?? 0;
  const totalOwesCents = balanceData?.totalOwesCents ?? 0;

  const topDebtor = useTopDebtor(balanceData);

  const handleNudge = async () => {
    if (!topDebtor || nudging) return;
    setNudging(true);
    try {
      const token = await getToken();
      if (!token) return;
      await groupsApi.nudge(topDebtor.groupId, topDebtor.suggestion.fromUser!.id, token);
      hapticSuccess();
      toast.success("Reminder sent!");
      setNudged(true);
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("429") || msg.toLowerCase().includes("cooldown")) {
        toast.info("You already sent a reminder. Try again later.");
      } else {
        toast.error("Failed to send reminder.");
      }
      hapticError();
    } finally {
      setNudging(false);
    }
  };

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetchActivity();
      refetchBalance();
    }, [refetchActivity, refetchBalance])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchActivity(), refetchBalance()]);
    setRefreshing(false);
  }, [refetchActivity, refetchBalance]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <View>
            <Text className="text-2xl font-sans-bold text-foreground">Splitr</Text>
            <Text className="text-sm text-muted-foreground font-sans">
              Welcome back, {user?.firstName || "there"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/notifications" as any)}
            className="w-10 h-10 rounded-full bg-muted items-center justify-center"
          >
            <Bell size={20} color="#64748b" />
          </Pressable>
        </View>

        <View className="px-5 gap-4">
          {/* Balance Card */}
          <Card className="p-5 bg-primary border-0 overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <Text className="text-sm text-primary-foreground/70 font-sans-medium mb-1">
              Net Balance
            </Text>
            <AnimatedNumber
              value={(totalOwedCents - totalOwesCents) / 100}
              formatter={(n) => formatCents(Math.round(n * 100))}
              selectable
              className="text-3xl font-sans-bold text-primary-foreground mb-4"
              style={{ fontVariant: ["tabular-nums"] }}
            />
            <View className="flex-row gap-6">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <ArrowDownLeft size={16} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xs text-primary-foreground/60 font-sans">You are owed</Text>
                  <Text selectable className="text-sm font-sans-semibold text-primary-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                    {formatCents(totalOwedCents)}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <ArrowUpRight size={16} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xs text-primary-foreground/60 font-sans">You owe</Text>
                  <Text selectable className="text-sm font-sans-semibold text-primary-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                    {formatCents(totalOwesCents)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Settle-up nudge */}
            {totalOwesCents > 0 && (
              <Pressable
                onPress={() => { hapticLight(); router.push("/(tabs)/groups"); }}
                className="mt-4 flex-row items-center justify-center gap-2 bg-white/15 rounded-xl py-2.5"
              >
                <HandCoins size={16} color="#ffffff" />
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  Settle up {formatCents(totalOwesCents)}
                </Text>
              </Pressable>
            )}
          </Card>

          {/* Pending Expenses Banner */}
          {pendingCount > 0 && (
            <Pressable
              onPress={() => { hapticLight(); router.push("/pending-expenses" as any); }}
              className="active:opacity-80"
            >
              <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center">
                    <Clock size={18} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-semibold text-amber-900 dark:text-amber-100">
                      {pendingCount} expense{pendingCount > 1 ? "s" : ""} pending
                    </Text>
                    <Text className="text-xs font-sans text-amber-700 dark:text-amber-300">
                      Will sync when you're back online
                    </Text>
                  </View>
                  <View className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 items-center justify-center">
                    <Text className="text-xs font-sans-bold text-amber-800 dark:text-amber-200">{pendingCount}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}

          {/* Nudge Reminder Card */}
          {totalOwedCents > 0 && topDebtor && !nudgeDismissed && !nudged && (
            <Animated.View entering={FadeInDown.duration(300).springify()}>
              <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <View className="flex-row items-start gap-3">
                  <View className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center mt-0.5">
                    <Bell size={18} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-semibold text-amber-900 dark:text-amber-100">
                      {topDebtor.suggestion.fromUser?.name ?? "Someone"}{" "}
                      {topDebtor.othersCount > 0
                        ? `and ${topDebtor.othersCount} other${topDebtor.othersCount > 1 ? "s" : ""} owe you ${formatCents(totalOwedCents)}`
                        : `owes you ${formatCents(topDebtor.suggestion.amount)}`}
                    </Text>
                    <Text className="text-xs font-sans text-amber-700 dark:text-amber-300 mt-0.5">
                      Send a friendly reminder to settle up
                    </Text>
                    <View className="flex-row gap-2 mt-3">
                      <Pressable
                        onPress={handleNudge}
                        disabled={nudging}
                        className={cn(
                          "flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-lg",
                          nudging ? "bg-amber-200 dark:bg-amber-800" : "bg-amber-400 dark:bg-amber-700"
                        )}
                      >
                        <Bell size={14} color="#ffffff" />
                        <Text className="text-xs font-sans-semibold text-white">
                          {nudging ? "Sending..." : "Send Reminder"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setNudgeDismissed(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900"
                      >
                        <Text className="text-xs font-sans-medium text-amber-700 dark:text-amber-300">
                          Dismiss
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Airbnb-style Category Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 4, paddingRight: 8 }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const Icon = cat.icon;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => { hapticSelection(); setSelectedCategory(cat.key); }}
                  className={`items-center py-2 px-3 rounded-xl border ${
                    isActive
                      ? "bg-foreground border-foreground"
                      : "bg-card border-border"
                  }`}
                  style={{ minWidth: 64 }}
                >
                  <Icon
                    size={20}
                    color={isActive ? "#ffffff" : "#64748b"}
                  />
                  <Text
                    className={`text-[10px] font-sans-medium mt-1 ${
                      isActive ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Recent Activity */}
          <View>
            <Text className="text-lg font-sans-semibold text-foreground mb-3">
              Recent Activity
            </Text>
            {loading ? (
              <SkeletonList count={3} type="activity" />
            ) : hasError ? (
              <EmptyState
                icon={AlertTriangle}
                iconColor="#ef4444"
                title="Something went wrong"
                subtitle="We couldn't load your data. Pull down to try again."
                actionLabel="Retry"
                onAction={() => { refetchActivity(); refetchBalance(); }}
              />
            ) : (() => {
              // Filter activity by selected category
              const filtered = selectedCategory === "all"
                ? activity
                : activity.filter((item) => {
                    const catName = (
                      (item.details?.categoryName as string) ??
                      (item.details?.category as string) ??
                      ""
                    ).toLowerCase();
                    const desc = (
                      (item.details?.description as string) ?? ""
                    ).toLowerCase();
                    // Match by category name or keyword in description
                    return catName === selectedCategory ||
                      catName.includes(selectedCategory) ||
                      desc.includes(selectedCategory);
                  });
              return filtered.length === 0 ? (
                selectedCategory === "all" ? (
                  <EmptyState
                    icon={Users}
                    iconColor="#0d9488"
                    title="No activity yet"
                    subtitle="Start by creating a group and adding expenses with friends"
                    actionLabel="Create a Group"
                    onAction={() => router.push("/create-group")}
                  />
                ) : (
                  <EmptyState
                    icon={CATEGORIES.find(c => c.key === selectedCategory)?.icon ?? Zap}
                    iconColor="#64748b"
                    title={`No ${selectedCategory} activity`}
                    subtitle="Try a different category or add an expense"
                  />
                )
              ) : (
              <View className="gap-2">
                {filtered.map((item, idx) => {
                  const actorName = item.actorUserName ?? item.actorGuestName ?? "?";
                  const title = formatActivityTitle(item, user?.id);
                  const groupName = item.groupName ?? (item.details?.groupName as string) ?? "";
                  const isExpenseUpdated = item.activityType === "expense_updated";
                  const oldAmount = item.details?.oldAmount as number | undefined;
                  const newAmount = item.details?.newAmount as number | undefined;
                  const amountChanged = oldAmount != null && newAmount != null && oldAmount !== newAmount;
                  const oldDesc = item.details?.oldDescription as string | undefined;
                  const newDesc = item.details?.newDescription as string | undefined;
                  const descChanged = oldDesc != null && newDesc != null && oldDesc !== newDesc;
                  const isMemberJoined = item.activityType === "member_joined";
                  const memberRole = (item.details?.role as string) ?? "";
                  const displayAmount = (item.details?.amount ?? item.details?.amountCents ?? item.details?.newAmount) as number | undefined;
                  const involvement = formatActivityInvolvement(item);
                  const destination = item.expenseId
                    ? { pathname: `/edit-expense/${item.expenseId}` as const, params: { groupId: item.groupId } }
                    : item.groupId
                    ? { pathname: `/(tabs)/groups/${item.groupId}` as const }
                    : null;

                  // Get emoji for this activity item
                  const categoryName = (item.details?.categoryName ?? item.details?.category) as string | undefined;
                  const activityEmoji =
                    ACTIVITY_EMOJI_MAP[categoryName?.toLowerCase() ?? ""] ||
                    ACTIVITY_EMOJI_MAP[item.activityType] ||
                    "📋";

                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(idx * 50).duration(300).springify()}
                    >
                    <AnimatedPressable
                      onPress={() => { hapticLight(); destination && router.push(destination as any); }}
                      disabled={!destination}
                    >
                      <Card className="p-4">
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                            <Text style={{ fontSize: 20 }}>{activityEmoji}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-sans-semibold text-card-foreground">
                              {title}
                            </Text>
                            {isExpenseUpdated && amountChanged ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                {formatCents(oldAmount!)} → {formatCents(newAmount!)}
                              </Text>
                            ) : null}
                            {isExpenseUpdated && descChanged ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                "{oldDesc}" → "{newDesc}"
                              </Text>
                            ) : null}
                            {isMemberJoined ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                {actorName} joined {item.groupName ?? groupName}{memberRole ? ` as ${memberRole}` : ""}
                              </Text>
                            ) : (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                {groupName}
                              </Text>
                            )}
                          </View>
                          <View className="items-end">
                            {displayAmount != null && (
                              <Text className="text-sm font-sans-semibold text-foreground">
                                {formatCents(displayAmount)}
                              </Text>
                            )}
                            {involvement.text != null && (
                              <Text
                                className={`text-xs font-sans-medium mt-0.5 ${
                                  involvement.color === "teal"
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {involvement.text}
                              </Text>
                            )}
                            <Text className="text-xs text-muted-foreground font-sans">
                              {formatDate(item.createdAt)}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </AnimatedPressable>
                    </Animated.View>
                  );
                })}
              </View>
            );
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
