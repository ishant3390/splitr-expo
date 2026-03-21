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
import { SHADOWS } from "@/lib/shadows";

import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useUserActivity, useGroups, useUserProfile, useGroupCurrencyMap } from "@/lib/hooks";
import { cn, formatCents, formatDate, formatRelativeTime } from "@/lib/utils";
import { formatActivityTitle, formatActivityInvolvement, formatCentsForInvolvement, resolveActivityGroupName } from "@/lib/screen-helpers";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import type { ActivityLogDto } from "@/lib/types";

type ActivityFilter = "all" | "expenses" | "settlements";

const EXPENSE_TYPES = new Set(["expense_created", "expense_updated", "expense_deleted"]);
const SETTLEMENT_TYPES = new Set(["settlement_created", "settlement_deleted"]);

const TABULAR_NUMS_STYLE = { fontVariant: ["tabular-nums"] as const };

const FILTER_CHIPS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All Activity" },
  { key: "expenses", label: "Expenses" },
  { key: "settlements", label: "Settlements" },
];

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { data: backendUser } = useUserProfile();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
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
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");

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

  const typeFiltered = useMemo(() => {
    if (activeFilter === "all") return filtered;
    const typeSet = activeFilter === "expenses" ? EXPENSE_TYPES : SETTLEMENT_TYPES;
    return filtered.filter((item) => typeSet.has(item.activityType));
  }, [filtered, activeFilter]);

  const sections = useMemo(() => {
    const grouped = typeFiltered.reduce<Record<string, ActivityLogDto[]>>((acc, item) => {
      const label = item.createdAt ? formatDate(item.createdAt) : "Recent";
      if (!acc[label]) acc[label] = [];
      acc[label].push(item);
      return acc;
    }, {});
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [typeFiltered]);

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
          <Clock size={160} color={palette.white} strokeWidth={1} />
        </View>

        {/* Decorative orb */}
        <View
          style={{
            position: "absolute", top: -30, left: -30,
            width: 100, height: 100, borderRadius: radius.full,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
          pointerEvents="none"
        />

        {/* Title + subtitle + search */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: fs["3xl"], fontFamily: ff.bold, color: palette.white }}>
              Activity
            </Text>
            <Text style={{ fontSize: fs.sm, fontFamily: ff.regular, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              Keep track of your group's shared journey.
            </Text>
          </View>
          <Pressable
            testID="search-toggle"
            accessibilityRole="button"
            accessibilityLabel={showSearch ? "Close search" : "Open search"}
            onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: showSearch ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }}
            >
              <Search size={20} color={palette.white} />
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
              style={{ flex: 1, fontSize: fs.md, fontFamily: ff.regular, color: palette.white }}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
            {searchQuery.length > 0 && (
              <Pressable testID="search-clear" onPress={() => setSearchQuery("")}>
                <X size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 16 }} />
      </LinearGradient>

      {/* Filter Chips */}
      <View className="flex-row px-5 pt-3 pb-1 gap-2">
        {FILTER_CHIPS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <Pressable
              key={key}
              testID={`filter-chip-${key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
              onPress={() => setActiveFilter(key)}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: radius.full,
                  backgroundColor: isActive ? c.primary : "transparent",
                  borderWidth: isActive ? 0 : 1,
                  borderColor: c.border,
                }}
              >
                <Text
                  style={{
                    fontSize: fs.sm,
                    fontFamily: isActive ? ff.semibold : ff.medium,
                    color: isActive ? palette.white : c.mutedForeground,
                  }}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {activityError && sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={AlertTriangle}
            iconColor={c.destructive}
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
            iconColor={c.mutedForeground}
            title={activeFilter === "expenses" ? "No expenses found" : activeFilter === "settlements" ? "No settlements found" : "No activity yet"}
            subtitle={activeFilter === "all" ? "Your expense and settlement activity will appear here" : `No ${activeFilter} match your current filters`}
          />
        </View>
      ) : (
        <SectionList
          testID="activity-section-list"
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={c.primary} />
              </View>
            ) : null
          }
          renderSectionHeader={({ section: { title } }) => (
            <View className="flex-row items-center gap-3 mt-5 mb-2">
              <Text style={{ fontSize: fs.xs, fontFamily: ff.semibold, color: c.mutedForeground, letterSpacing: 1 }}>
                {title.toUpperCase()}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            </View>
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
            const involvedCount = item.details?.involvedCount as number | undefined;

            const destination = item.groupId
              ? { pathname: `/(tabs)/groups/${item.groupId}` as const }
              : null;

            return (
              <Pressable
                onPress={() => destination && router.push(destination as any)}
                disabled={!destination}
                className="active:opacity-70 mb-2"
              >
                <View style={SHADOWS.card}>
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
                          {groupName && (
                            <Text style={{ fontFamily: ff.regular, fontStyle: "italic", color: c.mutedForeground }}>
                              {" "}in {groupName}
                            </Text>
                          )}
                        </Text>
                        {/* Metadata line */}
                        <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground, marginTop: 2 }}>
                          {formatRelativeTime(item.createdAt)}
                          {involvedCount != null && involvedCount > 1 && ` · Shared with ${involvedCount} people`}
                        </Text>
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
                          <Text className={cn(
                            "text-sm font-sans-bold",
                            involvement.color === "success" ? "text-emerald-600"
                              : involvement.color === "destructive" ? "text-red-500"
                              : "text-foreground"
                          )} style={TABULAR_NUMS_STYLE}>
                            {involvement.color === "success" ? "+" : involvement.color === "destructive" ? "-" : ""}
                            {formatCents(displayAmount, itemCurrency)}
                          </Text>
                        )}
                        {involvement.text != null && (
                          <View className={cn(
                            "px-2 py-0.5 rounded-full mt-1",
                            involvement.color === "success" ? "bg-emerald-50 dark:bg-emerald-950/40"
                              : involvement.color === "destructive" ? "bg-red-50 dark:bg-red-950/40"
                              : "bg-muted"
                          )}>
                            <Text className={cn(
                              "text-xs font-sans-semibold",
                              involvement.color === "success" ? "text-emerald-600"
                                : involvement.color === "destructive" ? "text-red-500"
                                : "text-muted-foreground"
                            )}>
                              {involvement.text}{involvement.amountCents != null ? ` ${formatCentsForInvolvement(involvement.amountCents, itemCurrency)}` : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Card>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
