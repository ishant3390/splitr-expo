import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ChevronRight, Plus } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { groupsApi } from "@/lib/api";
import { formatCurrency, getInitials } from "@/lib/utils";

export default function GroupsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await groupsApi.list(token!);
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, []);

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

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-6 gap-3"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Card className="p-6 items-center">
              <Text className="text-sm text-muted-foreground font-sans">
                No groups yet. Create one!
              </Text>
            </Card>
          }
          renderItem={({ item: group }) => {
            const members: any[] = group.members ?? [];
            const totalAmount = group.totalAmount ?? group.totalSpent ?? 0;
            const myBalance = group.myBalance ?? 0;

            return (
              <Pressable onPress={() => router.push(`/group/${group.id}`)}>
                <Card className="p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-base font-sans-semibold text-card-foreground">
                        {group.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {group.memberCount ?? members.length} members
                        {" \u00b7 "}
                        {group.expenseCount ?? 0} expenses
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#94a3b8" />
                  </View>

                  {/* Member avatars */}
                  {members.length > 0 && (
                    <View className="flex-row items-center mb-3">
                      {members.slice(0, 4).map((member: any, idx: number) => (
                        <View
                          key={member.id}
                          style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 10 - idx }}
                        >
                          <Avatar
                            src={member.imageUrl ?? member.avatar}
                            fallback={getInitials(member.name)}
                            size="sm"
                            className="border-2 border-card"
                          />
                        </View>
                      ))}
                      {members.length > 4 && (
                        <View className="w-8 h-8 rounded-full bg-muted items-center justify-center -ml-2">
                          <Text className="text-xs font-sans-medium text-muted-foreground">
                            +{members.length - 4}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Balance summary */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-border">
                    <View>
                      <Text className="text-xs text-muted-foreground font-sans">Total spent</Text>
                      <Text className="text-sm font-sans-semibold text-foreground">
                        {formatCurrency(totalAmount)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-muted-foreground font-sans">Your balance</Text>
                      <Text
                        className={`text-sm font-sans-semibold ${
                          myBalance >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {myBalance >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(myBalance))}
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
