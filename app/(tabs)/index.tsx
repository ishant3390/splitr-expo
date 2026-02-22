import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
import { usersApi } from "@/lib/api";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

export default function HomeScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const data = await usersApi.activity(token!);
        setActivity(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch {
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
              {formatCurrency(0)}
            </Text>
            <View className="flex-row gap-6">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                  <ArrowDownLeft size={16} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xs text-primary-foreground/60 font-sans">You are owed</Text>
                  <Text className="text-sm font-sans-semibold text-primary-foreground">
                    {formatCurrency(0)}
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
                    {formatCurrency(0)}
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
                {activity.map((item: any) => (
                  <Card key={item.id} className="p-4">
                    <View className="flex-row items-center gap-3">
                      <Avatar
                        fallback={getInitials(item.paidBy?.name || item.performedBy?.name || "?")}
                        size="md"
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-sans-semibold text-card-foreground">
                          {item.description}
                        </Text>
                        <Text className="text-xs text-muted-foreground font-sans">
                          {item.groupName || item.group?.name || ""}
                        </Text>
                      </View>
                      <View className="items-end">
                        {item.amount != null && (
                          <Text className="text-sm font-sans-semibold text-foreground">
                            {formatCurrency(item.amount)}
                          </Text>
                        )}
                        <Text className="text-xs text-muted-foreground font-sans">
                          {item.date || item.createdAt ? formatDate(item.date || item.createdAt) : ""}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
