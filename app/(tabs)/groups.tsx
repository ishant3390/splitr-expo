import React, { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight } from "@/lib/haptics";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { ChevronRight, Plus } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { groupsApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { GroupDto } from "@/lib/types";

export default function GroupsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<GroupDto[]>([]);
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

  useFocusEffect(loadGroups);

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
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <Card className="p-6 items-center">
              <Text className="text-sm text-muted-foreground font-sans">
                No groups yet. Create one!
              </Text>
            </Card>
          }
          renderItem={({ item: group, index }: { item: GroupDto; index: number }) => {
            const emoji = group.emoji ?? "👥";
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(300).springify()}>
              <Pressable onPress={() => { hapticLight(); router.push(`/group/${group.id}`); }}>
                <Card className="p-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-sans-semibold text-card-foreground">
                        {group.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {group.memberCount ?? 0} members
                        {group.defaultCurrency ? ` · ${group.defaultCurrency}` : ""}
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#94a3b8" />
                  </View>
                </Card>
              </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
