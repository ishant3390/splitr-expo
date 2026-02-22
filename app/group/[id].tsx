import React from "react";
import { View, Text, ScrollView, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
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
import { groups, currentUser } from "@/lib/mock-data";
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
  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-lg text-muted-foreground font-sans">Group not found</Text>
      </SafeAreaView>
    );
  }

  const totalSpent = group.expenses.reduce((sum, e) => sum + e.amount, 0);

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
        <View className="py-4">
          <Text className="text-sm font-sans-semibold text-muted-foreground mb-3">
            MEMBERS ({group.members.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
            <View className="flex-row gap-3">
              {group.members.map((member) => {
                const memberExpenses = group.expenses
                  .filter((e) => e.paidBy === member.id)
                  .reduce((sum, e) => sum + e.amount, 0);
                const isYou = member.id === currentUser.id;

                return (
                  <Card key={member.id} className="p-3 items-center w-24">
                    <Avatar
                      src={member.avatar}
                      fallback={getInitials(member.name)}
                      size="md"
                    />
                    <Text
                      className="text-xs font-sans-medium text-card-foreground mt-2 text-center"
                      numberOfLines={1}
                    >
                      {isYou ? "You" : member.name.split(" ")[0]}
                    </Text>
                    <Text className="text-xs font-sans-semibold text-success mt-0.5">
                      {formatCurrency(memberExpenses)}
                    </Text>
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        </View>

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
                {formatCurrency(totalSpent / group.members.length)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Expenses list */}
        <Text className="text-sm font-sans-semibold text-muted-foreground mb-3">
          EXPENSES ({group.expenses.length})
        </Text>
        <View className="gap-2">
          {group.expenses
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((expense) => {
              const Icon = iconMap[expense.category];
              const payer = group.members.find((m) => m.id === expense.paidBy);
              const isYou = expense.paidBy === currentUser.id;

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
                        {isYou ? "You" : payer?.name} paid {"\u00b7"} {formatDate(expense.date)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-sans-bold text-foreground">
                        {formatCurrency(expense.amount)}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans">
                        {expense.splitAmong.length} people
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
