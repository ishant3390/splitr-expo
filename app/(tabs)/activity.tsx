import React, { useState, useCallback } from "react";
import { View, Text, SectionList, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Clock } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { usersApi } from "@/lib/api";
import { formatCents, formatDate, getInitials } from "@/lib/utils";
import type { ActivityLogDto } from "@/lib/types";

export default function ActivityScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [sections, setSections] = useState<{ title: string; data: ActivityLogDto[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await usersApi.activity(token!);
      const list: ActivityLogDto[] = Array.isArray(data) ? data : [];

      const grouped = list.reduce<Record<string, ActivityLogDto[]>>((acc, item) => {
        const label = item.createdAt ? formatDate(item.createdAt) : "Recent";
        if (!acc[label]) acc[label] = [];
        acc[label].push(item);
        return acc;
      }, {});

      setSections(Object.entries(grouped).map(([title, data]) => ({ title, data })));
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-3 pb-4">
          <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-4">
        <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
      </View>

      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={Clock}
            iconColor="#94a3b8"
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
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-sm font-sans-semibold text-muted-foreground mb-2 mt-4">
              {title}
            </Text>
          )}
          renderItem={({ item }) => {
            const actorName = item.actorUserName ?? item.actorGuestName ?? "Someone";
            const description = item.activityType
              .replace(/_/g, " ")
              .replace(/^\w/, (c) => c.toUpperCase());
            const groupName = item.groupName ?? (item.details?.groupName as string) ?? "";

            const isExpenseUpdated = item.activityType === "expense_updated";
            const expenseName = (item.details?.newDescription ?? item.details?.description) as string | undefined;
            const oldAmount = item.details?.oldAmount as number | undefined;
            const newAmount = item.details?.newAmount as number | undefined;
            const amountChanged = oldAmount != null && newAmount != null && oldAmount !== newAmount;
            const oldDesc = item.details?.oldDescription as string | undefined;
            const newDesc = item.details?.newDescription as string | undefined;
            const descChanged = oldDesc != null && newDesc != null && oldDesc !== newDesc;

            const isExpenseCreated = item.activityType === "expense_created";
            const createdExpenseName = (item.details?.description) as string | undefined;
            const isMemberJoined = item.activityType === "member_joined";
            const memberRole = (item.details?.role as string) ?? "";
            const displayAmount = (item.details?.amount ?? item.details?.amountCents ?? item.details?.newAmount) as number | undefined;

            const destination = item.expenseId
              ? { pathname: `/edit-expense/${item.expenseId}` as const, params: { groupId: item.groupId } }
              : item.groupId
              ? { pathname: `/group/${item.groupId}` as const }
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
                        {description}
                      </Text>
                      {isExpenseUpdated && expenseName ? (
                        <Text className="text-xs text-foreground font-sans-medium mt-0.5">
                          {expenseName}
                        </Text>
                      ) : null}
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
                      {isExpenseCreated && createdExpenseName ? (
                        <Text className="text-xs text-foreground font-sans-medium mt-0.5">
                          {createdExpenseName}
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
                      <Text className="text-xs text-muted-foreground font-sans">
                        {formatDate(item.createdAt)}
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
