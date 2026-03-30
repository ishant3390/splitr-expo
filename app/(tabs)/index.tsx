import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { hapticLight, hapticSuccess, hapticError } from "@/lib/haptics";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@clerk/clerk-expo";
import { groupsApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useUser } from "@clerk/clerk-expo";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  AlertTriangle,
} from "lucide-react-native";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getActivityIcon } from "@/lib/category-icons";
import { Card } from "@/components/ui/card";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { SkeletonList } from "@/components/ui/skeleton";
import { useUserActivity, useUserBalance, useTopDebtor, useGroups, useUserProfile, useGroupCurrencyMap } from "@/lib/hooks";
import { useNetwork } from "@/components/NetworkProvider";
import { cn, formatCents, formatDate, formatRelativeTime, getInitials, getFxDisplayAmounts } from "@/lib/utils";
import { formatActivityTitle, formatActivityInvolvement, formatCentsForInvolvement, resolveActivityGroupName } from "@/lib/screen-helpers";
import { MultiCurrencyAmount, formatMultiCurrency } from "@/components/ui/multi-currency-amount";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CheckCircle, Users, Clock, HandCoins, ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { GRADIENTS } from "@/lib/gradients";
import { SHADOWS } from "@/lib/shadows";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
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


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const { data: backendUser } = useUserProfile();
  const { getToken } = useAuth();
  const { pendingCount } = useNetwork();
  const toast = useToast();
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

  const { data: groups = [], refetch: refetchGroups } = useGroups();
  const balanceMap = useMemo(() => {
    const map = new Map<string, { balanceCents: number; currency: string }>();
    (balanceData?.groupBalances ?? []).forEach((gb) => map.set(gb.groupId, { balanceCents: gb.balanceCents, currency: gb.currency }));
    return map;
  }, [balanceData?.groupBalances]);
  const activeGroups = useMemo(() => {
    return [...groups].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 2);
  }, [groups]);
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups]);
  const groupCurrencyMap = useGroupCurrencyMap();

  const isMultiCurrencyOwed = (balanceData?.totalOwedByCurrency?.length ?? 0) > 1;
  const isMultiCurrencyOwing = (balanceData?.totalOwingByCurrency?.length ?? 0) > 1;
  const isMultiCurrency = isMultiCurrencyOwed || isMultiCurrencyOwing;
  // For net balance display in multi-currency mode, show the currency with the largest amount
  const primaryOwedCurrency = useMemo(() => {
    const allAmounts = [
      ...(balanceData?.totalOwedByCurrency ?? []),
      ...(balanceData?.totalOwingByCurrency ?? []),
    ];
    if (allAmounts.length === 0) return "USD";
    return allAmounts.reduce((best, cur) => cur.amount > best.amount ? cur : best).currency;
  }, [balanceData?.totalOwedByCurrency, balanceData?.totalOwingByCurrency]);

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
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      if (apiErr?.code === "ERR-407") {
        toast.info(getUserMessage(apiErr));
        await saveRemindedAt(topDebtor.groupId, debtorUserId);
        setNudgeRemindedAt(Date.now());
      } else if (apiErr?.code === "ERR-408") {
        toast.info(getUserMessage(apiErr));
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
      refetchGroups();
    }, [refetchActivity, refetchBalance, refetchGroups])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchActivity(), refetchBalance(), refetchGroups()]);
    setRefreshing(false);
  }, [refetchActivity, refetchBalance, refetchGroups]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
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
            <Bell size={20} color={c.mutedForeground} />
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
                {isMultiCurrency ? (
                  <Text
                    selectable
                    className="font-sans-bold text-primary-foreground mb-4"
                    style={{ fontVariant: ["tabular-nums"], fontSize: 42, lineHeight: 50 }}
                  >
                    {(totalOwedCents - totalOwesCents) > 0 ? "+" : (totalOwedCents - totalOwesCents) < 0 ? "-" : ""}{formatCents(Math.abs(totalOwedCents - totalOwesCents), primaryOwedCurrency)}
                  </Text>
                ) : (
                  <AnimatedNumber
                    value={(totalOwedCents - totalOwesCents) / 100}
                    formatter={(n) => formatCents(Math.round(n * 100), primaryOwedCurrency)}
                    selectable
                    className="font-sans-bold text-primary-foreground mb-4"
                    style={{ fontVariant: ["tabular-nums"], fontSize: 42, lineHeight: 50 }}
                  />
                )}
                <View className="flex-row gap-6">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <ArrowDownLeft size={16} color={palette.white} />
                    </View>
                    <View>
                      <Text className="text-xs text-primary-foreground/60 font-sans">You are owed</Text>
                      {isMultiCurrencyOwed ? (
                        <MultiCurrencyAmount
                          amounts={balanceData?.totalOwedByCurrency ?? []}
                          selectable
                          className="text-sm font-sans-semibold text-primary-foreground"
                          style={{ fontVariant: ["tabular-nums"] }}
                        />
                      ) : (
                        <Text selectable className="text-sm font-sans-semibold text-primary-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                          {formatCents(totalOwedCents, balanceData?.totalOwedByCurrency?.[0]?.currency)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <ArrowUpRight size={16} color={palette.white} />
                    </View>
                    <View>
                      <Text className="text-xs text-primary-foreground/60 font-sans">You owe</Text>
                      {isMultiCurrencyOwing ? (
                        <MultiCurrencyAmount
                          amounts={balanceData?.totalOwingByCurrency ?? []}
                          selectable
                          className="text-sm font-sans-semibold text-primary-foreground"
                          style={{ fontVariant: ["tabular-nums"] }}
                        />
                      ) : (
                        <Text selectable className="text-sm font-sans-semibold text-primary-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                          {formatCents(totalOwesCents, balanceData?.totalOwingByCurrency?.[0]?.currency)}
                        </Text>
                      )}
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
                    <HandCoins size={16} color={palette.white} />
                    <Text className="text-sm font-sans-semibold text-primary-foreground">
                      Settle up {isMultiCurrencyOwing ? formatMultiCurrency(balanceData?.totalOwingByCurrency ?? []) : formatCents(totalOwesCents, balanceData?.totalOwingByCurrency?.[0]?.currency)}
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
                      <CheckCircle size={16} color={c.success} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-sans-medium text-card-foreground">
                        {topDebtor.suggestion.fromUser?.name ?? "Someone"} owes you {formatCents(topDebtor.suggestion.amount, topDebtor.suggestion.currency)}
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
                      <Bell size={18} color={c.warning} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-sans-semibold text-amber-900 dark:text-amber-100">
                        {topDebtor.suggestion.fromUser?.name ?? "Someone"}{" "}
                        {topDebtor.othersCount > 0
                          ? `and ${topDebtor.othersCount} other${topDebtor.othersCount > 1 ? "s" : ""} owe you ${isMultiCurrencyOwed ? formatMultiCurrency(balanceData?.totalOwedByCurrency ?? []) : formatCents(totalOwedCents, balanceData?.totalOwedByCurrency?.[0]?.currency)}`
                          : `owes you ${formatCents(topDebtor.suggestion.amount, topDebtor.suggestion.currency)}`}
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
                          <Bell size={14} color={palette.white} />
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

          {/* Active Groups */}
          {activeGroups.length > 0 && (
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-sans-semibold text-foreground">
                  Active Groups
                </Text>
                {groups.length > 2 && (
                  <Pressable onPress={() => { hapticLight(); router.push("/(tabs)/groups"); }} accessibilityRole="button">
                    <Text className="text-sm font-sans-medium" style={{ color: c.primary }}>
                      View all
                    </Text>
                  </Pressable>
                )}
              </View>
              <View className="gap-3">
                {activeGroups.map((group, idx) => {
                  const bal = balanceMap.get(group.id);
                  const balanceCents = bal?.balanceCents ?? 0;
                  const currency = bal?.currency ?? group.defaultCurrency ?? "USD";
                  return (
                    <Animated.View
                      key={group.id}
                      entering={FadeInDown.delay(idx * 100).duration(400).springify()}
                    >
                      <AnimatedPressable
                        onPress={() => { hapticLight(); router.push(`/(tabs)/groups/${group.id}` as any); }}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${group.name}`}
                      >
                        <View style={SHADOWS.card}>
                          <Card className="p-0 overflow-hidden">
                            {/* Gradient accent strip */}
                            <View className="flex-row">
                              <View
                                style={{
                                  width: 4,
                                  backgroundColor: balanceCents > 0 ? palette.emerald500 : balanceCents < 0 ? palette.red500 : palette.slate300,
                                  borderTopLeftRadius: 12,
                                  borderBottomLeftRadius: 12,
                                }}
                              />
                              <View className="flex-1 p-3.5">
                                <View className="flex-row items-center gap-3">
                                  <GroupAvatar name={group.name} emoji={group.emoji} groupType={group.groupType} id={group.id} />
                                  <View className="flex-1">
                                    <Text className="text-base font-sans-semibold text-card-foreground" numberOfLines={1}>
                                      {group.name}
                                    </Text>
                                    <View className="flex-row items-center gap-1.5 mt-0.5">
                                      <Users size={12} color={c.mutedForeground} />
                                      <Text className="text-xs font-sans text-muted-foreground">
                                        {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                                      </Text>
                                      <Text className="text-xs text-muted-foreground">·</Text>
                                      <Text className="text-xs font-sans text-muted-foreground">
                                        {formatRelativeTime(group.updatedAt)}
                                      </Text>
                                    </View>
                                  </View>
                                  <ChevronRight size={16} color={c.mutedForeground} />
                                </View>
                                {/* Balance row */}
                                <View
                                  className={cn(
                                    "mt-2.5 pt-2.5 flex-row items-center justify-between",
                                  )}
                                  style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}
                                >
                                  <Text className="text-xs font-sans text-muted-foreground">
                                    Your balance
                                  </Text>
                                  <View
                                    className={cn(
                                      "px-2 py-0.5 rounded-full",
                                      balanceCents > 0
                                        ? "bg-emerald-50 dark:bg-emerald-950/40"
                                        : balanceCents < 0
                                        ? "bg-red-50 dark:bg-red-950/40"
                                        : "bg-muted"
                                    )}
                                  >
                                    <Text
                                      className={cn(
                                        "text-sm font-sans-bold",
                                        balanceCents > 0 ? "text-emerald-600" : balanceCents < 0 ? "text-red-500" : "text-muted-foreground"
                                      )}
                                      style={{ fontVariant: ["tabular-nums"] }}
                                    >
                                      {balanceCents > 0 ? `+${formatCents(balanceCents, currency)}` : balanceCents < 0 ? `-${formatCents(Math.abs(balanceCents), currency)}` : "settled up"}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </Card>
                        </View>
                      </AnimatedPressable>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recent Activity */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-sans-semibold text-foreground">
                Recent Activity
              </Text>
              {activity.length > 5 && (
                <Pressable onPress={() => { hapticLight(); router.push("/(tabs)/activity"); }} accessibilityRole="button">
                  <Text className="text-sm font-sans-medium" style={{ color: c.primary }}>
                    View all
                  </Text>
                </Pressable>
              )}
            </View>
            {loading ? (
              <SkeletonList count={3} type="activity" />
            ) : hasError ? (
              <EmptyState
                icon={AlertTriangle}
                iconColor={c.destructive}
                title="Something went wrong"
                subtitle="We couldn't load your data. Pull down to try again."
                actionLabel="Retry"
                onAction={() => { refetchActivity(); refetchBalance(); }}
              />
            ) : activity.length === 0 ? (
              <EmptyState
                icon={Users}
                iconColor={c.primary}
                title="No activity yet"
                subtitle="Start by creating a group and adding expenses with friends"
                actionLabel="Create a Group"
                onAction={() => router.push("/create-group")}
              />
            ) : (
              <View className="gap-2">
                {activity.slice(0, 5).map((item, idx) => {
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
                  const itemCurrency = (item.details?.currency as string) ?? groupCurrencyMap.get(item.groupId ?? "") ?? "USD";
                  const involvement = formatActivityInvolvement(item);
                  const fxDisplay = displayAmount != null
                    ? getFxDisplayAmounts({
                        amountCents: displayAmount,
                        currency: itemCurrency,
                        convertedAmountCents: item.details?.convertedAmountCents as number | undefined,
                        convertedCurrency: item.details?.convertedCurrency as string | undefined,
                        convertedAmount: item.details?.convertedAmount as
                          | { amountMinor: number; currency: string }
                          | number
                          | undefined,
                      })
                    : null;
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
                      entering={FadeInDown.delay(idx * 50).duration(300).springify()}
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
                            {groupName && item.activityType !== "group_created" && item.activityType !== "group_archived" && (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                in {groupName}
                              </Text>
                            )}
                            {isExpenseUpdated && amountChanged ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                {formatCents(oldAmount!, itemCurrency)} → {formatCents(newAmount!, itemCurrency)}
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
                            ) : isGroupLifecycle && item.activityType !== "group_created" && item.activityType !== "group_archived" ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                {item.activityType === "group_deleted" ? "Deleted" : item.activityType === "group_updated" ? "Updated" : "Restored"}
                              </Text>
                            ) : null}
                          </View>
                          <View className="items-end">
                            {displayAmount != null && (
                              <Text className="text-sm font-sans-semibold text-foreground">
                                {formatCents(displayAmount, itemCurrency)}
                              </Text>
                            )}
                            {fxDisplay?.secondary ? (
                              <Text className="text-[11px] text-muted-foreground font-sans">
                                {fxDisplay.secondary}
                              </Text>
                            ) : null}
                            {involvement.text != null && (
                              <View
                                className={cn(
                                  "px-1.5 py-0.5 rounded-md mt-1 self-end",
                                  involvement.color === "success"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                                    : involvement.color === "destructive"
                                    ? "bg-red-50 dark:bg-red-950/40"
                                    : "bg-muted"
                                )}
                              >
                                <Text
                                  className={cn(
                                    "text-xs font-sans-semibold",
                                    involvement.color === "success"
                                      ? "text-emerald-600"
                                      : involvement.color === "destructive"
                                      ? "text-red-500"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {involvement.text}{involvement.amountCents != null ? ` ${formatCentsForInvolvement(involvement.amountCents, itemCurrency)}` : ""}
                                </Text>
                              </View>
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
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
