import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  Plus,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { groupsApi } from "@/lib/api";
import { formatCents, formatDate, getInitials, cn } from "@/lib/utils";
import type { GroupDto, GroupMemberDto, ExpenseDto, ExpenseCategory } from "@/lib/types";

const iconMap: Record<ExpenseCategory, typeof Utensils> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  other: MoreHorizontal,
};

export default function GroupDetailScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/groups"));
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const [groupData, membersData, expensesResponse] = await Promise.all([
          groupsApi.get(id, token!),
          groupsApi.listMembers(id, token!),
          groupsApi.listExpenses(id, token!),
        ]);
        setGroup(groupData);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setExpenses(expensesResponse.data ?? []);
      } catch {
        setGroup(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#0d9488" />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <Text className="text-lg text-muted-foreground font-sans">Group not found</Text>
      </SafeAreaView>
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color="#0f172a" />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">{group.name}</Text>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.push("/(tabs)/add")}
        >
          <Plus size={24} color="#0d9488" />
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Members */}
        {members.length > 0 && (
          <View className="py-4">
            <Text className="text-sm font-sans-semibold text-muted-foreground mb-3">
              MEMBERS ({members.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {members.map((member) => {
                  const memberName = member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
                  const memberTotal = expenses
                    .filter((e) => e.payers?.some((p) => p.user?.id === member.user?.id || p.guestUser?.id === member.guestUser?.id))
                    .reduce((sum, e) => sum + (e.amountCents ?? 0), 0);

                  return (
                    <Card key={member.id} className="p-3 items-center w-24">
                      <Avatar
                        src={member.user?.avatarUrl}
                        fallback={getInitials(memberName)}
                        size="md"
                      />
                      <Text
                        className="text-xs font-sans-medium text-card-foreground mt-2 text-center"
                        numberOfLines={1}
                      >
                        {memberName.split(" ")[0]}
                      </Text>
                      <Text className="text-xs font-sans-semibold text-success mt-0.5">
                        {formatCents(memberTotal)}
                      </Text>
                    </Card>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Summary card */}
        <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-muted-foreground font-sans">Total Spent</Text>
              <Text className="text-xl font-sans-bold text-foreground">
                {formatCents(totalSpent)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground font-sans">Per Person (avg)</Text>
              <Text className="text-xl font-sans-bold text-primary">
                {formatCents(members.length > 0 ? totalSpent / members.length : 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Expenses list */}
        <Text className="text-sm font-sans-semibold text-muted-foreground mb-3">
          EXPENSES ({expenses.length})
        </Text>

        {expenses.length === 0 ? (
          <Card className="p-6 items-center">
            <Text className="text-sm text-muted-foreground font-sans">
              No expenses yet. Add one!
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            {[...expenses]
              .sort((a, b) => {
                const dateA = a.date || a.createdAt || "";
                const dateB = b.date || b.createdAt || "";
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              })
              .map((expense) => {
                const categoryKey = (expense.category?.icon ?? expense.category?.name ?? "other") as ExpenseCategory;
                const Icon = iconMap[categoryKey] ?? MoreHorizontal;
                const payerName =
                  expense.payers?.[0]?.user?.name ?? expense.payers?.[0]?.guestUser?.name ?? "Someone";
                const splitCount = expense.splits?.length ?? 1;
                const expenseDate = expense.date || expense.createdAt;

                return (
                  <Card key={expense.id} className="p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                        <Icon size={20} color="#0d9488" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-sans-semibold text-card-foreground">
                          {expense.description}
                        </Text>
                        <Text className="text-xs text-muted-foreground font-sans">
                          {payerName} paid
                          {expenseDate ? ` · ${formatDate(expenseDate)}` : ""}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-sans-bold text-foreground">
                          {formatCents(expense.amountCents)}
                        </Text>
                        <Text className="text-xs text-muted-foreground font-sans">
                          {splitCount} {splitCount === 1 ? "person" : "people"}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
