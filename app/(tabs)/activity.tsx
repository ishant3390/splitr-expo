import React from "react";
import { View, Text, SectionList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { groups, currentUser } from "@/lib/mock-data";
import { formatCurrency, formatDate, categoryLabels } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

const iconMap: Record<ExpenseCategory, typeof Utensils> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  other: MoreHorizontal,
};

// Build sections grouped by date
const allExpenses = groups
  .flatMap((g) =>
    g.expenses.map((e) => ({
      ...e,
      groupName: g.name,
      payerName:
        g.members.find((m) => m.id === e.paidBy)?.name || "Unknown",
    }))
  )
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const grouped = allExpenses.reduce<Record<string, typeof allExpenses>>(
  (acc, expense) => {
    const label = formatDate(expense.date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(expense);
    return acc;
  },
  {}
);

const sections = Object.entries(grouped).map(([title, data]) => ({
  title,
  data,
}));

export default function ActivityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-4">
        <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="text-sm font-sans-semibold text-muted-foreground mb-2 mt-4">
            {title}
          </Text>
        )}
        renderItem={({ item: expense }) => {
          const Icon = iconMap[expense.category];
          const isYou = expense.paidBy === currentUser.id;

          return (
            <Card className="p-4 mb-2">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                  <Icon size={20} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-semibold text-card-foreground">
                    {expense.description}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans">
                    {isYou ? "You" : expense.payerName} paid{" "}
                    {"\u00b7"} {expense.groupName}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className={`text-sm font-sans-semibold ${
                      isYou ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isYou ? "+" : "-"}{formatCurrency(expense.amount)}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans">
                    {categoryLabels[expense.category]}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
