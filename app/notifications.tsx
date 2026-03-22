import React, { useState, useCallback, useMemo } from "react";
import { View, Text, SectionList, Pressable, RefreshControl } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Bell, CheckCheck, Home, Users, Plus, Clock, UserCircle } from "lucide-react-native";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useNotifications } from "@/lib/hooks";
import { hapticLight, hapticSelection } from "@/lib/haptics";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NotificationDto } from "@/lib/types";

const NOTIF_CONFIG: Record<string, { emoji: string; bg: string; bgDark: string }> = {
  expense_created: { emoji: "\uD83D\uDCB8", bg: "#f0fdfa", bgDark: "rgba(13,148,136,0.15)" },
  expense_updated: { emoji: "\u270F\uFE0F", bg: "#eff6ff", bgDark: "rgba(59,130,246,0.15)" },
  expense_deleted: { emoji: "\uD83D\uDDD1\uFE0F", bg: "#fef2f2", bgDark: "rgba(239,68,68,0.15)" },
  member_joined_via_invite: { emoji: "\uD83D\uDC4B", bg: "#fefce8", bgDark: "rgba(234,179,8,0.15)" },
  group_created: { emoji: "\uD83C\uDF89", bg: "#f5f3ff", bgDark: "rgba(139,92,246,0.15)" },
  settlement_created: { emoji: "\uD83E\uDD1D", bg: "#ecfdf5", bgDark: "rgba(16,185,129,0.15)" },
  coalesced_expenses: { emoji: "\uD83D\uDCE6", bg: "#fff7ed", bgDark: "rgba(249,115,22,0.15)" },
};

const DEFAULT_CONFIG = { emoji: "\uD83D\uDCCB", bg: "#f8fafc", bgDark: "rgba(148,163,184,0.15)" };

function getNotifRoute(notif: NotificationDto): string | null {
  const groupId = notif.groupId ?? (notif.data?.groupId as string | undefined);
  if (!groupId) return null;

  switch (notif.notificationType) {
    case "settlement_created":
      return `/settle-up?groupId=${groupId}`;
    default:
      return `/(tabs)/groups/${groupId}`;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(items: NotificationDto[]): { title: string; data: NotificationDto[] }[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  const groups: Record<string, NotificationDto[]> = {};
  items.forEach((item) => {
    const d = new Date(item.createdAt).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : "Earlier";
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });

  const order = ["Today", "Yesterday", "Earlier"];
  return order
    .filter((k) => groups[k]?.length)
    .map((title) => ({ title, data: groups[title] }));
}

const NAV_ITEMS = [
  { icon: Home, label: "Home", route: "/(tabs)" },
  { icon: Users, label: "Groups", route: "/(tabs)/groups" },
  { icon: Plus, label: "Add", route: "/(tabs)/add", isFab: true },
  { icon: Clock, label: "Activity", route: "/(tabs)/activity" },
  { icon: UserCircle, label: "Profile", route: "/(tabs)/profile" },
] as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const insets = useSafeAreaInsets();
  const { data: notifications = [], isLoading: loading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const sections = useMemo(() => groupByDay(notifications), [notifications]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const markAllRead = () => {
    const allIds = new Set<string>();
    sections.forEach((s) => s.data.forEach((item) => allIds.add(item.id)));
    setReadIds(allIds);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable
          onPress={goBack}
          className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80"
          hitSlop={8}
        >
          <ArrowLeft size={22} color={c.primary} strokeWidth={2.5} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-sans-semibold text-foreground">Notifications</Text>
          {unreadCount > 0 && (
            <View style={{
              backgroundColor: c.primary,
              borderRadius: radius.md,
              minWidth: 20,
              height: 20,
              paddingHorizontal: 6,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Text style={{ fontSize: fs.xs, fontFamily: ff.semibold, color: palette.white }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <Pressable onPress={markAllRead} className="px-2" hitSlop={8}>
          <CheckCheck size={22} color={c.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View className="px-5 pt-4">
          <SkeletonList count={6} type="activity" />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={Bell}
            iconColor={c.mutedForeground}
            title="No notifications yet"
            subtitle="You'll see updates when people add expenses or join your groups"
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          renderSectionHeader={({ section: { title } }) => (
            <Text
              style={{
                fontSize: fs.base,
                fontFamily: ff.semibold,
                color: c.mutedForeground,
                marginTop: 20,
                marginBottom: 10,
                paddingHorizontal: 4,
              }}
            >
              {title}
            </Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isRead = readIds.has(item.id);
            const config = NOTIF_CONFIG[item.notificationType] ?? DEFAULT_CONFIG;
            const route = getNotifRoute(item);

            return (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setReadIds((prev) => new Set(prev).add(item.id));
                  if (route) router.push(route as any);
                }}
                className="active:opacity-80"
              >
                <Card className="p-4">
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    {/* Icon with type-tinted background */}
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.DEFAULT,
                      backgroundColor: isDark ? config.bgDark : config.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: fs["2xl"] }}>{config.emoji}</Text>
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <Text
                        className={`text-foreground ${isRead ? "font-sans" : "font-sans-semibold"}`}
                        style={{
                          fontSize: fs.md,
                          lineHeight: 20,
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      {item.body ? (
                        <Text
                          style={{
                            fontSize: fs.base,
                            fontFamily: ff.regular,
                            color: c.mutedForeground,
                            lineHeight: 18,
                            marginTop: 2,
                          }}
                          numberOfLines={2}
                        >
                          {item.body}
                        </Text>
                      ) : null}
                      <Text style={{
                        fontSize: fs.sm,
                        fontFamily: ff.regular,
                        color: c.mutedForeground,
                        marginTop: 4,
                      }}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>

                    {/* Unread indicator */}
                    {!isRead && (
                      <View style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: c.primary,
                        marginTop: 6,
                      }} />
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
      {/* Bottom Navigation Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 8,
          paddingBottom: insets.bottom || 16,
          backgroundColor: isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)",
          borderTopWidth: 0,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          if (item.isFab) {
            return (
              <View key={item.label} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Pressable
                  onPress={() => { hapticSelection(); router.push(item.route as any); }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius["2xl"],
                    backgroundColor: c.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={22} color={palette.white} strokeWidth={2.5} />
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable
              key={item.label}
              onPress={() => { hapticSelection(); router.push(item.route as any); }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 2 }}
            >
              <Icon size={22} color={c.mutedForeground} />
              <Text style={{ fontSize: 10, fontFamily: ff.medium, color: c.mutedForeground }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
