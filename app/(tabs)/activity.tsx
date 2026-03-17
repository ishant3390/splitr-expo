import React, { useState, useCallback, useMemo } from "react";
import { View, Text, SectionList, ActivityIndicator, Pressable, RefreshControl, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Clock, AlertTriangle, Search, X } from "lucide-react-native";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getActivityIcon } from "@/lib/category-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { Card } from "@/components/ui/card";

import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useUserActivity, useGroups, useUserProfile, useGroupCurrencyMap } from "@/lib/hooks";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";
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
  const groupCurrencyMap = useGroupCurrencyMap();
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
      {/* Hero Section */}
      <LinearGradient
        colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ overflow: "hidden" }}
      >
        {/* Watermark */}
        <View
          style={{ position: "absolute", bottom: -20, right: -15, opacity: 0.06 }}
          pointerEvents="none"
        >
          <Clock size={160} color="#ffffff" strokeWidth={1} />
        </View>

        {/* Decorative orb */}
        <View
          style={{
            position: "absolute", top: -30, left: -30,
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
          pointerEvents="none"
        />

        {/* Title + search */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <Text className="text-2xl font-sans-bold" style={{ color: "#ffffff" }}>
            Activity
          </Text>
          <Pressable onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}>
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: showSearch ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }}
            >
              <Search size={18} color="#ffffff" />
            </View>
          </Pressable>
        </View>

        {/* Search bar */}
        {showSearch && (
          <View
            className="mx-5 mb-2 flex-row items-center rounded-xl px-3 py-2 gap-2"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <Search size={16} color="rgba(255,255,255,0.7)" />
            <TextInput
              placeholder="Search activity..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffff" }}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <X size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 12 }} />
      </LinearGradient>

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
                    <CategoryIcon
                      config={getActivityIcon(
                        item.activityType,
                        (item.details?.categoryName ?? item.details?.category) as string | undefined,
                        (item.details?.newDescription ?? item.details?.description) as string | undefined,
                        backendUser?.defaultCurrency,
                      )}
                    />
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
                          {formatCents(oldAmount!, itemCurrency)} {"\u2192"} {formatCents(newAmount!, itemCurrency)}
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
                          {formatCents(displayAmount, itemCurrency)}
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
                          {involvement.text}{involvement.amountCents != null ? ` ${formatCentsForInvolvement(involvement.amountCents, itemCurrency)}` : ""}
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
