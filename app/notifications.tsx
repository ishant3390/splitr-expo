import React, { useState, useCallback, useMemo } from "react";
import { View, Text, SectionList, Pressable, RefreshControl, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useNotifications } from "@/lib/hooks";
import { hapticLight } from "@/lib/haptics";
import type { NotificationDto } from "@/lib/types";

const NOTIF_EMOJI: Record<string, string> = {
  expense_created: "\uD83D\uDCB8",
  expense_updated: "\u270F\uFE0F",
  expense_deleted: "\uD83D\uDDD1\uFE0F",
  member_joined_via_invite: "\uD83D\uDC4B",
  group_created: "\uD83C\uDF89",
  settlement_created: "\uD83E\uDD1D",
  coalesced_expenses: "\uD83D\uDCE6",
};

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

export default function NotificationsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { data: notifications = [], isLoading: loading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const sections = useMemo(() => groupByDay(notifications), [notifications]);

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
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">Notifications</Text>
        <Pressable onPress={markAllRead} className="px-2">
          <CheckCheck size={22} color="#0d9488" />
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
            iconColor="#94a3b8"
            title="No notifications yet"
            subtitle="You'll see updates when people add expenses or join your groups"
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-xs font-sans-semibold text-muted-foreground px-5 mt-4 mb-2">
              {title}
            </Text>
          )}
          renderItem={({ item }) => {
            const isRead = readIds.has(item.id);
            const emoji = NOTIF_EMOJI[item.notificationType] ?? "\uD83D\uDCCB";
            const route = getNotifRoute(item);

            return (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setReadIds((prev) => new Set(prev).add(item.id));
                  if (route) router.push(route as any);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: isRead ? "transparent" : "#0d948808",
                }}
              >
                {/* Unread dot */}
                <View style={{ width: 8, paddingTop: 8 }}>
                  {!isRead && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0d9488" }} />
                  )}
                </View>

                {/* Icon */}
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "#334155" : "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: isRead ? "Inter_400Regular" : "Inter_600SemiBold",
                      color: isDark ? "#f1f5f9" : "#0f172a",
                      lineHeight: 18,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: isDark ? "#cbd5e1" : "#475569",
                      lineHeight: 16,
                      marginTop: 1,
                    }}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8", marginTop: 3 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
