import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { CategoryIcon } from "@/components/ui/category-icon";
import { getActivityIcon } from "@/lib/category-icons";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { SkeletonList } from "@/components/ui/skeleton";
import { useUserActivity, useUserBalance, useTopDebtor, useGroups, useUserProfile } from "@/lib/hooks";
import { useNetwork } from "@/components/NetworkProvider";
import { cn, formatCents, formatDate, formatRelativeTime, getInitials } from "@/lib/utils";
import { formatActivityTitle, formatActivityInvolvement, formatCentsForInvolvement, resolveActivityGroupName } from "@/lib/screen-helpers";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CheckCircle, Users, Clock, HandCoins } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { GRADIENTS } from "@/lib/gradients";
import { SHADOWS } from "@/lib/shadows";
import type { ActivityLogDto } from "@/lib/types";

// Nudge persistence
const NUDGE_DISMISS_PREFIX = "@splitr/nudge_dismissed_";
const NUDGE_REMINDED_PREFIX = "@splitr/nudge_reminded_";
const NUDGE_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getNudgeKey(prefix: string, groupId: string, userId: string) {
  return `${prefix}${groupId}_${userId}`;
}

async function isNudgeDismissed(groupId: string, userId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(getNudgeKey(NUDGE_DISMISS_PREFIX, groupId, userId));
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (Date.now() - dismissedAt > NUDGE_DISMISS_TTL_MS) {
      await AsyncStorage.removeItem(getNudgeKey(NUDGE_DISMISS_PREFIX, groupId, userId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function dismissNudge(groupId: string, userId: string) {
  await AsyncStorage.setItem(getNudgeKey(NUDGE_DISMISS_PREFIX, groupId, userId), String(Date.now()));
}

async function getRemindedAt(groupId: string, userId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(getNudgeKey(NUDGE_REMINDED_PREFIX, groupId, userId));
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

async function saveRemindedAt(groupId: string, userId: string) {
  await AsyncStorage.setItem(getNudgeKey(NUDGE_REMINDED_PREFIX, groupId, userId), String(Date.now()));
}

function formatRemindedAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Reminded today";
  if (diffDays === 1) return "Reminded yesterday";
  return `Reminded ${diffDays} days ago`;
}

// Airbnb-style category data
const CATEGORIES = [
  { key: "all", label: "All", icon: Zap },
  { key: "food", label: "Food", icon: Utensils },
  { key: "transport", label: "Transport", icon: Car },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "home", label: "Home", icon: HomeIcon },
  { key: "entertainment", label: "Fun", icon: Gamepad2 },
  { key: "shopping", label: "Shopping", icon: ShoppingBag },
  { key: "coffee", label: "Coffee", icon: Coffee },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "health", label: "Health", icon: Heart },
  { key: "work", label: "Work", icon: Briefcase },
  { key: "utilities", label: "Utilities", icon: Wifi },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: backendUser } = useUserProfile();
  const { getToken } = useAuth();
  const { pendingCount } = useNetwork();
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeRemindedAt, setNudgeRemindedAt] = useState<number | null>(null);
  const [nudgeStateLoaded, setNudgeStateLoaded] = useState(false);

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

  const { data: groups = [] } = useGroups();
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups]);

  // Load persisted nudge state when topDebtor changes
  useEffect(() => {
    if (!topDebtor) {
      setNudgeStateLoaded(true);
      return;
    }
    const debtorUserId = topDebtor.suggestion.fromUser?.id;
    if (!debtorUserId) {
      setNudgeStateLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [dismissed, reminded] = await Promise.all([
        isNudgeDismissed(topDebtor.groupId, debtorUserId),
        getRemindedAt(topDebtor.groupId, debtorUserId),
      ]);
      if (cancelled) return;
      setNudgeDismissed(dismissed);
      setNudgeRemindedAt(reminded);
      setNudgeStateLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [topDebtor?.groupId, topDebtor?.suggestion.fromUser?.id]);

  const handleNudgeDismiss = async () => {
    if (!topDebtor?.suggestion.fromUser?.id) return;
    setNudgeDismissed(true);
    await dismissNudge(topDebtor.groupId, topDebtor.suggestion.fromUser.id);
  };

  const handleNudge = async () => {
    if (!topDebtor || nudging) return;
    const debtorUserId = topDebtor.suggestion.fromUser?.id;
    if (!debtorUserId) return;
    setNudging(true);
    try {
      const token = await getToken();
      if (!token) return;
      await groupsApi.nudge(topDebtor.groupId, debtorUserId, token);
      hapticSuccess();
      toast.success("Reminder sent!");
      await saveRemindedAt(topDebtor.groupId, debtorUserId);
      setNudgeRemindedAt(Date.now());
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("422") || msg.includes("429") || msg.toLowerCase().includes("cooldown") || msg.toLowerCase().includes("reminder recently")) {
        toast.info("Reminder was sent recently. Try again later.");
        // Still save reminded state — backend confirms a reminder was sent recently
        await saveRemindedAt(topDebtor.groupId, debtorUserId);
        setNudgeRemindedAt(Date.now());
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
            <Bell size={20} color={isDark ? "#94a3b8" : "#64748b"} />
          </Pressable>
        </View>

        <View className="px-5 gap-5">
          {/* Balance Card */}
          <View style={SHADOWS.glowTeal}>
            <View className="rounded-2xl overflow-hidden" style={{ borderCurve: "continuous" as any }}>
              <LinearGradient
                colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.08]" style={{ transform: [{ translateX: 16 }, { translateY: -16 }] }} />
                <View className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/[0.06]" style={{ transform: [{ translateX: -12 }, { translateY: 12 }] }} />
                <Text className="text-sm text-primary-foreground/70 font-sans-medium mb-1">
                  Net Balance
                </Text>
                <AnimatedNumber
                  value={(totalOwedCents - totalOwesCents) / 100}
                  formatter={(n) => formatCents(Math.round(n * 100))}
                  selectable
                  className="font-sans-bold text-primary-foreground mb-4"
                  style={{ fontVariant: ["tabular-nums"], fontSize: 42, lineHeight: 50 }}
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
                    onPress={() => { hapticLight(); router.push("/settle-up"); }}
                    className="mt-4 flex-row items-center justify-center gap-2 bg-white/15 rounded-xl py-2.5"
                    style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <HandCoins size={16} color="#ffffff" />
                    <Text className="text-sm font-sans-semibold text-primary-foreground">
                      Settle up {formatCents(totalOwesCents)}
                    </Text>
                  </Pressable>
                )}
              </LinearGradient>
            </View>
          </View>

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
          {totalOwedCents > 0 && topDebtor && nudgeStateLoaded && !nudgeDismissed && (
            nudgeRemindedAt ? (
              /* Soft "reminded" state — subtle card with option to remind again */
              <Animated.View entering={FadeInDown.duration(300).springify()}>
                <Card className="p-3 border-border">
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                      <CheckCircle size={16} color="#10b981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-sans-medium text-card-foreground">
                        {topDebtor.suggestion.fromUser?.name ?? "Someone"} owes you {formatCents(topDebtor.suggestion.amount)}
                      </Text>
                      <Text className="text-xs font-sans text-muted-foreground mt-0.5">
                        {formatRemindedAgo(nudgeRemindedAt)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleNudge}
                      disabled={nudging}
                      className="px-3 py-1.5 rounded-lg bg-muted"
                    >
                      <Text className="text-xs font-sans-medium text-muted-foreground">
                        {nudging ? "Sending..." : "Remind Again"}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              </Animated.View>
            ) : (
              /* Full nudge card — first time seeing this debtor */
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
                          onPress={handleNudgeDismiss}
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
            )
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
                  className="items-center py-2 px-3 rounded-xl"
                  style={{
                    minWidth: 64,
                    backgroundColor: isActive
                      ? (isDark ? "#f1f5f9" : "#0f172a")
                      : (isDark ? "#334155" : "#f1f5f9"),
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? (isDark ? "#0f172a" : "#ffffff") : (isDark ? "#94a3b8" : "#64748b")}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Inter_500Medium",
                      marginTop: 4,
                      color: isActive
                        ? (isDark ? "#0f172a" : "#ffffff")
                        : (isDark ? "#94a3b8" : "#64748b"),
                    }}
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
                  const title = formatActivityTitle(item, backendUser?.id);
                  const groupName = resolveActivityGroupName(item) ?? (item.groupId ? groupNameMap.get(item.groupId) : null) ?? null;
                  const isExpenseUpdated = item.activityType === "expense_updated";
                  const oldAmount = item.details?.oldAmount as number | undefined;
                  const newAmount = item.details?.newAmount as number | undefined;
                  const amountChanged = oldAmount != null && newAmount != null && oldAmount !== newAmount;
                  const oldDesc = item.details?.oldDescription as string | undefined;
                  const newDesc = item.details?.newDescription as string | undefined;
                  const descChanged = oldDesc != null && newDesc != null && oldDesc !== newDesc;
                  const isMemberActivity = ["member_joined", "member_joined_via_invite", "member_added", "member_left"].includes(item.activityType);
                  const isGroupLifecycle = ["group_created", "group_archived", "group_unarchived", "group_deleted", "group_updated"].includes(item.activityType);
                  const memberRole = (item.details?.role as string) ?? "";
                  const displayAmount = (item.details?.amount ?? item.details?.amountCents ?? item.details?.newAmount) as number | undefined;
                  const involvement = formatActivityInvolvement(item);
                  const destination = item.groupId
                    ? { pathname: `/(tabs)/groups/${item.groupId}` as const }
                    : null;

                  // Get icon config for this activity item
                  const categoryName = (item.details?.categoryName ?? item.details?.category) as string | undefined;
                  const expenseDescription = (item.details?.newDescription ?? item.details?.description) as string | undefined;
                  const activityIconConfig = getActivityIcon(item.activityType, categoryName, expenseDescription, backendUser?.defaultCurrency);

                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(idx * 40).duration(300).springify()}
                    >
                    <AnimatedPressable
                      onPress={() => { hapticLight(); destination && router.push(destination as any); }}
                      disabled={!destination}
                    >
                      <Card className="p-4">
                        <View className="flex-row items-center gap-3">
                          <CategoryIcon config={activityIconConfig} />
                          <View className="flex-1">
                            <Text className="text-sm font-sans-semibold text-card-foreground">
                              {title}
                            </Text>
                            {groupName && (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                in {groupName}
                              </Text>
                            )}
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
                            {isMemberActivity && memberRole ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                as {memberRole}
                              </Text>
                            ) : isGroupLifecycle ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                {item.activityType === "group_created" ? "New group" : item.activityType === "group_archived" ? "Archived" : item.activityType === "group_deleted" ? "Deleted" : item.activityType === "group_updated" ? "Updated" : "Restored"}
                              </Text>
                            ) : null}
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
                                  involvement.color === "success"
                                    ? "text-emerald-600"
                                    : involvement.color === "destructive"
                                    ? "text-red-500"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {involvement.text}{involvement.amountCents != null ? ` ${formatCentsForInvolvement(involvement.amountCents)}` : ""}
                              </Text>
                            )}
                            <Text className="text-xs text-muted-foreground font-sans">
                              {formatRelativeTime(item.createdAt)}
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
