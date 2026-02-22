import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
import { groups, currentUser } from "@/lib/mock-data";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

export default function HomeScreen() {
  const router = useRouter();

  const totalOwed = 145.5;
  const totalOwe = 67.25;
  const netBalance = totalOwed - totalOwe;

  const recentExpenses = groups
    .flatMap((g) =>
      g.expenses.map((e) => ({
        ...e,
        groupName: g.name,
        groupId: g.id,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
              Welcome back, {currentUser.name.split(" ")[0]}
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
              {formatCurrency(netBalance)}
            </Text>
            <View className="flex-row gap-6">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <ArrowDownLeft size={16} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xs text-primary-foreground/60 font-sans">You are owed</Text>
                  <Text className="text-sm font-sans-semibold text-primary-foreground">
                    {formatCurrency(totalOwed)}
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
                    {formatCurrency(totalOwe)}
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
            <View className="gap-2">
              {recentExpenses.map((expense) => {
                const payer = groups
                  .flatMap((g) => g.members)
                  .find((m) => m.id === expense.paidBy);
                const isYou = expense.paidBy === currentUser.id;

                return (
                  <Card key={expense.id} className="p-4">
                    <View className="flex-row items-center gap-3">
                      <Avatar
                        src={payer?.avatar}
                        fallback={getInitials(payer?.name || "?")}
                        size="md"
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-sans-semibold text-card-foreground">
                          {expense.description}
                        </Text>
                        <Text className="text-xs text-muted-foreground font-sans">
                          {isYou ? "You" : payer?.name} paid {formatCurrency(expense.amount)}{" "}
                          {"\u00b7"} {expense.groupName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-sm font-sans-semibold ${
                            isYou ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isYou ? "+" : "-"}
                          {formatCurrency(expense.amount / expense.splitAmong.length)}
                        </Text>
                        <Text className="text-xs text-muted-foreground font-sans">
                          {formatDate(expense.date)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
