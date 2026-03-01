import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ScanLine,
  MessageCircle,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usersApi, groupsApi } from "@/lib/api";
import { formatCents, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { ActivityLogDto } from "@/lib/types";

export default function HomeScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [activity, setActivity] = useState<ActivityLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOwedCents, setTotalOwedCents] = useState(0);
  const [totalOwesCents, setTotalOwesCents] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const load = async () => {
        const token = await getToken();
        const currentEmail = user.primaryEmailAddress?.emailAddress;

        try {
          console.log("[HomeScreen] Fetching activity...");
          const data = await usersApi.activity(token!);
          console.log("[HomeScreen] Activity response:", JSON.stringify(data, null, 2));
          const sliced = Array.isArray(data) ? data.slice(0, 5) : [];
          console.log(`[HomeScreen] Showing ${sliced.length} of ${Array.isArray(data) ? data.length : 0} items`);
          setActivity(sliced);
        } catch (err) {
          console.error("[HomeScreen] Failed to fetch activity:", err);
          setActivity([]);
        } finally {
          setLoading(false);
        }

        try {
          console.log("[HomeScreen] Fetching balances for:", currentEmail);
          const groups = await groupsApi.list(token!);
          const groupList = Array.isArray(groups) ? groups : [];
          const memberResults = await Promise.all(
            groupList.map((g) => groupsApi.listMembers(g.id, token!))
          );
          let owed = 0;
          let owes = 0;
          memberResults.forEach((members) => {
            const list = Array.isArray(members) ? members : [];
            const me = list.find((m) => m.user?.email === currentEmail);
            if (me?.balance != null) {
              if (me.balance > 0) owed += me.balance;
              else if (me.balance < 0) owes += Math.abs(me.balance);
            }
          });
          console.log(`[HomeScreen] Balances — owed: ${owed}, owes: ${owes}`);
          setTotalOwedCents(owed);
          setTotalOwesCents(owes);
        } catch (err) {
          console.error("[HomeScreen] Failed to fetch balances:", err);
        }
      };
      load();
    }, [user])
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <View>
            <Text className="text-2xl font-sans-bold text-foreground">Splitr</Text>
            <Text className="text-sm text-muted-foreground font-sans">
              Welcome back, {user?.firstName || "there"}
            </Text>
          </View>
          <Pressable className="w-10 h-10 rounded-full bg-muted items-center justify-center">
            <Bell size={20} color="#64748b" />
          </Pressable>
        </View>

        <View className="px-5 gap-4">
          {/* Quick Actions */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              onPress={() => router.push("/receipt-scanner")}
              className="flex-1 h-auto py-4 flex-col items-center gap-2"
            >
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                <ScanLine size={20} color="#0d9488" />
              </View>
              <Text className="text-xs font-sans-medium text-foreground">Scan</Text>
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push("/chat")}
              className="flex-1 h-auto py-4 flex-col items-center gap-2"
            >
              <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center">
                <MessageCircle size={20} color="#14b8a6" />
              </View>
              <Text className="text-xs font-sans-medium text-foreground">Chat</Text>
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push("/(tabs)/add")}
              className="flex-1 h-auto py-4 flex-col items-center gap-2"
            >
              <View className="w-10 h-10 rounded-full bg-success/20 items-center justify-center">
                <PlusCircle size={20} color="#10b981" />
              </View>
              <Text className="text-xs font-sans-medium text-foreground">Add</Text>
            </Button>
          </View>

          {/* Balance Card */}
          <Card className="p-5 bg-primary border-0 overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <Text className="text-sm text-primary-foreground/70 font-sans-medium mb-1">
              Net Balance
            </Text>
            <Text className="text-3xl font-sans-bold text-primary-foreground mb-4">
              {formatCents(totalOwedCents - totalOwesCents)}
            </Text>
            <View className="flex-row gap-6">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <ArrowDownLeft size={16} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xs text-primary-foreground/60 font-sans">You are owed</Text>
                  <Text className="text-sm font-sans-semibold text-primary-foreground">
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
                  <Text className="text-sm font-sans-semibold text-primary-foreground">
                    {formatCents(totalOwesCents)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Recent Activity */}
          <View>
            <Text className="text-lg font-sans-semibold text-foreground mb-3">
              Recent Activity
            </Text>
            {loading ? (
              <ActivityIndicator color="#0d9488" />
            ) : activity.length === 0 ? (
              <Card className="p-6 items-center">
                <Text className="text-sm text-muted-foreground font-sans">No recent activity</Text>
              </Card>
            ) : (
              <View className="gap-2">
                {activity.map((item) => {
                  const actorName = item.actorUserName ?? item.actorGuestName ?? "?";
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
                  const createdAmountCents = item.details?.amountCents as number | undefined;
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
                      key={item.id}
                      onPress={() => destination && router.push(destination as any)}
                      disabled={!destination}
                      className="active:opacity-70"
                    >
                      <Card className="p-4">
                        <View className="flex-row items-center gap-3">
                          <Avatar
                            fallback={getInitials(actorName)}
                            size="md"
                          />
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
                                {formatCents(oldAmount!)} → {formatCents(newAmount!)}
                              </Text>
                            ) : null}
                            {isExpenseUpdated && descChanged ? (
                              <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                "{oldDesc}" → "{newDesc}"
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
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
