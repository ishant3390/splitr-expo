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
import { formatCurrency, formatDate, getInitials, categoryLabels, cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const [groupData, membersData, expensesData] = await Promise.all([
          groupsApi.get(id, token!),
          groupsApi.listMembers(id, token!),
          groupsApi.listExpenses(id, token!),
        ]);
        setGroup(groupData);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
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

  const totalSpent = expenses.reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={() => router.back()}>
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
                {members.map((member: any) => {
                  const memberTotal = expenses
                    .filter((e: any) => e.paidBy?.id === member.id || e.paidById === member.id)
                    .reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);

                  return (
                    <Card key={member.id} className="p-3 items-center w-24">
                      <Avatar
                        src={member.imageUrl ?? member.avatar}
                        fallback={getInitials(member.name)}
                        size="md"
                      />
                      <Text
                        className="text-xs font-sans-medium text-card-foreground mt-2 text-center"
                        numberOfLines={1}
                      >
                        {member.name?.split(" ")[0] ?? "Member"}
                      </Text>
                      <Text className="text-xs font-sans-semibold text-success mt-0.5">
                        {formatCurrency(memberTotal)}
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
                {formatCurrency(totalSpent)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground font-sans">Per Person (avg)</Text>
              <Text className="text-xl font-sans-bold text-primary">
                {formatCurrency(members.length > 0 ? totalSpent / members.length : 0)}
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
              .map((expense: any) => {
                const category: ExpenseCategory = expense.category ?? "other";
                const Icon = iconMap[category] ?? MoreHorizontal;
                const payerName =
                  expense.paidBy?.name ?? expense.paidByName ?? "Someone";
                const splitCount =
                  expense.splitAmong?.length ?? expense.splitCount ?? 1;
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
                          {formatCurrency(expense.amount ?? 0)}
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
