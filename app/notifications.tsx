import React, { useState, useCallback, useMemo } from "react";
import { View, Text, SectionList, Pressable, ActivityIndicator, RefreshControl, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserActivity } from "@/lib/hooks";
import { getInitials, cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";
import type { ActivityLogDto } from "@/lib/types";

const NOTIF_EMOJI: Record<string, string> = {
  expense_created: "\uD83D\uDCB8",
  expense_updated: "\u270F\uFE0F",
  expense_deleted: "\uD83D\uDDD1\uFE0F",
  member_joined: "\uD83D\uDC4B",
  member_left: "\uD83D\uDC4B",
  group_created: "\uD83C\uDF89",
  settlement_created: "\uD83E\uDD1D",
  settlement_deleted: "\u21A9\uFE0F",
};

function formatNotifMessage(item: ActivityLogDto): string {
  const actor = item.actorUserName ?? item.actorGuestName ?? "Someone";
  const group = item.groupName ?? "";
  const desc = (item.details?.description ?? item.details?.newDescription) as string | undefined;

  switch (item.activityType) {
    case "expense_created":
      return `${actor} added "${desc ?? "an expense"}" in ${group}`;
    case "expense_updated":
      return `${actor} updated "${desc ?? "an expense"}" in ${group}`;
    case "expense_deleted":
      return `${actor} deleted an expense in ${group}`;
    case "member_joined":
      return `${actor} joined ${group}`;
    case "member_left":
      return `${actor} left ${group}`;
    case "group_created":
      return `${actor} created ${group}`;
    case "settlement_created":
      return `${actor} recorded a payment in ${group}`;
    case "settlement_deleted":
      return `${actor} reversed a payment in ${group}`;
    default:
      return `${actor} ${item.activityType.replace(/_/g, " ")} in ${group}`;
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

function groupByDay(items: ActivityLogDto[]): { title: string; data: ActivityLogDto[] }[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  const groups: Record<string, ActivityLogDto[]> = {};
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
  const { data: activity = [], isLoading: loading, refetch } = useUserActivity();
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const sections = useMemo(() => groupByDay(activity), [activity]);

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
          <ArrowLeft size={24} color="#0f172a" />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">Notifications</Text>
        <Pressable onPress={markAllRead} className="px-2">
          <CheckCheck size={22} color="#0d9488" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" />
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
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-xs font-sans-semibold text-muted-foreground px-5 mt-4 mb-2">
              {title}
            </Text>
          )}
          renderItem={({ item }) => {
            const isRead = readIds.has(item.id);
            const actorName = item.actorUserName ?? item.actorGuestName ?? "?";
            const emoji = NOTIF_EMOJI[item.activityType] ?? "\uD83D\uDCCB";

            const destination = item.expenseId
              ? { pathname: `/edit-expense/${item.expenseId}` as const, params: { groupId: item.groupId } }
              : item.groupId
              ? { pathname: `/group/${item.groupId}` as const }
              : null;

            return (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setReadIds((prev) => new Set(prev).add(item.id));
                  if (destination) router.push(destination as any);
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

                {/* Avatar */}
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
                    {formatNotifMessage(item)}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8", marginTop: 2 }}>
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
