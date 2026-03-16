import React, { useState, useCallback, useMemo } from "react";
import { View, Text, SectionList, ActivityIndicator, Pressable, RefreshControl, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Clock, AlertTriangle, Search, X } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useUserActivity, useGroups, useUserProfile } from "@/lib/hooks";
import { formatCents, formatDate, formatRelativeTime, getInitials } from "@/lib/utils";
import { formatActivityTitle, formatActivityInvolvement, formatCentsForInvolvement, resolveActivityGroupName } from "@/lib/screen-helpers";
import type { ActivityLogDto } from "@/lib/types";

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { data: backendUser } = useUserProfile();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: activity = [], isLoading: loading, error: activityError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useUserActivity();
  const { data: groups = [] } = useGroups();
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return activity;
    const q = searchQuery.toLowerCase();
    return activity.filter((item) => {
      const actor = (item.actorUserName ?? item.actorGuestName ?? "").toLowerCase();
      const group = (item.groupName ?? "").toLowerCase();
      const desc = ((item.details?.description ?? item.details?.newDescription ?? "") as string).toLowerCase();
      const type = item.activityType.replace(/_/g, " ").toLowerCase();
      return actor.includes(q) || group.includes(q) || desc.includes(q) || type.includes(q);
    });
  }, [activity, searchQuery]);

  const sections = useMemo(() => {
    const grouped = filtered.reduce<Record<string, ActivityLogDto[]>>((acc, item) => {
      const label = item.createdAt ? formatDate(item.createdAt) : "Recent";
      if (!acc[label]) acc[label] = [];
      acc[label].push(item);
      return acc;
    }, {});
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [filtered]);

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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-3 pb-4">
          <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
        </View>
        <View className="px-5 pt-3">
          <SkeletonList count={6} type="activity" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
          <Pressable onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}>
            <View className="w-9 h-9 rounded-full bg-muted items-center justify-center">
              <Search size={18} color={showSearch ? "#0d9488" : (isDark ? "#94a3b8" : "#64748b")} />
            </View>
          </Pressable>
        </View>
        {showSearch && (
          <View className="mt-2 flex-row items-center bg-muted rounded-xl px-3 py-2 gap-2">
            <Search size={16} color={isDark ? "#94a3b8" : "#64748b"} />
            <TextInput
              placeholder="Search activity..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: isDark ? "#f1f5f9" : "#0f172a" }}
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <X size={16} color={isDark ? "#94a3b8" : "#64748b"} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {activityError && sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={AlertTriangle}
            iconColor="#ef4444"
            title="Couldn't load activity"
            subtitle="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={Clock}
            iconColor={isDark ? "#94a3b8" : "#64748b"}
            title="No activity yet"
            subtitle="Your expense and settlement activity will appear here"
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#0d9488" />
              </View>
            ) : null
          }
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-sm font-sans-semibold text-muted-foreground mb-2 mt-4">
              {title}
            </Text>
          )}
          renderItem={({ item }) => {
            const actorName = item.actorUserName ?? item.actorGuestName ?? "Someone";
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

            return (
              <Pressable
                onPress={() => destination && router.push(destination as any)}
                disabled={!destination}
                className="active:opacity-70 mb-2"
              >
                <Card className="p-4">
                  <View className="flex-row items-center gap-3">
                    <Avatar fallback={getInitials(actorName)} size="md" />
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
                          {formatCents(oldAmount!)} {"\u2192"} {formatCents(newAmount!)}
                        </Text>
                      ) : null}
                      {isExpenseUpdated && descChanged ? (
                        <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                          "{oldDesc}" {"\u2192"} "{newDesc}"
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
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
