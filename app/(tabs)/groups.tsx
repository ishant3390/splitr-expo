import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { groups, currentUser } from "@/lib/mock-data";
import { formatCurrency, getInitials } from "@/lib/utils";

export default function GroupsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Text className="text-2xl font-sans-bold text-foreground">Groups</Text>
        <Button
          variant="default"
          size="sm"
          onPress={() => router.push("/create-group")}
        >
          <View className="flex-row items-center gap-1.5">
            <Plus size={16} color="#ffffff" />
            <Text className="text-sm font-sans-semibold text-primary-foreground">New</Text>
          </View>
        </Button>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-6 gap-3"
        showsVerticalScrollIndicator={false}
        renderItem={({ item: group }) => {
          const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);
          const myExpenses = group.expenses.filter((e) => e.paidBy === currentUser.id);
          const myTotal = myExpenses.reduce((sum, e) => sum + e.amount, 0);

          return (
            <Pressable onPress={() => router.push(`/group/${group.id}`)}>
              <Card className="p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-base font-sans-semibold text-card-foreground">
                      {group.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                      {group.members.length} members {"\u00b7"} {group.expenses.length} expenses
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </View>

                {/* Member avatars */}
                <View className="flex-row items-center mb-3">
                  {group.members.slice(0, 4).map((member, idx) => (
                    <View
                      key={member.id}
                      style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 10 - idx }}
                    >
                      <Avatar
                        src={member.avatar}
                        fallback={getInitials(member.name)}
                        size="sm"
                        className="border-2 border-card"
                      />
                    </View>
                  ))}
                  {group.members.length > 4 && (
                    <View className="w-8 h-8 rounded-full bg-muted items-center justify-center -ml-2">
                      <Text className="text-xs font-sans-medium text-muted-foreground">
                        +{group.members.length - 4}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Balance summary */}
                <View className="flex-row items-center justify-between pt-3 border-t border-border">
                  <View>
                    <Text className="text-xs text-muted-foreground font-sans">Total spent</Text>
                    <Text className="text-sm font-sans-semibold text-foreground">
                      {formatCurrency(totalExpenses)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-muted-foreground font-sans">You paid</Text>
                    <Text className="text-sm font-sans-semibold text-success">
                      {formatCurrency(myTotal)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
