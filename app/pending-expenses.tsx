import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { hapticLight, hapticError } from "@/lib/haptics";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Clock, Trash2, RefreshCw, WifiOff } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/ui/toast";
import { getQueuedExpenses, removeFromQueue, clearQueue, type QueuedExpense } from "@/lib/offline";
import { formatCents } from "@/lib/utils";

export default function PendingExpensesScreen() {
  const router = useRouter();
  const { isOnline, pendingCount, refreshPendingCount } = useNetwork();
  const toast = useToast();
  const [items, setItems] = useState<QueuedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const queue = await getQueuedExpenses();
    setItems(queue);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const handleDiscard = (item: QueuedExpense) => {
    Alert.alert(
      "Discard expense?",
      `"${item.description}" (${formatCents(item.amountCents)}) will be permanently removed and will NOT be synced.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            hapticError();
            await removeFromQueue(item.clientId);
            await refreshPendingCount();
            await loadItems();
            toast.success("Expense discarded");
          },
        },
      ]
    );
  };

  const handleDiscardAll = () => {
    if (items.length === 0) return;
    Alert.alert(
      "Discard all pending expenses?",
      `${items.length} expense${items.length > 1 ? "s" : ""} will be permanently removed and will NOT be synced.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard All",
          style: "destructive",
          onPress: async () => {
            hapticError();
            await clearQueue();
            await refreshPendingCount();
            await loadItems();
            toast.success("All pending expenses discarded");
          },
        },
      ]
    );
  };

  const formatTimeAgo = (isoDate: string): string => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-border">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => { hapticLight(); router.back(); }}
            className="w-10 h-10 rounded-full bg-muted items-center justify-center"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <View>
            <Text className="text-xl font-sans-bold text-foreground">Pending Expenses</Text>
            <Text className="text-xs text-muted-foreground font-sans">
              {items.length} item{items.length !== 1 ? "s" : ""} waiting to sync
            </Text>
          </View>
        </View>
        {items.length > 1 && (
          <Pressable
            onPress={handleDiscardAll}
            className="px-3 py-2 rounded-lg bg-destructive/10"
          >
            <Text className="text-xs font-sans-medium text-destructive">Clear All</Text>
          </Pressable>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4 gap-3 pb-8">
        {/* Status Banner */}
        {!isOnline && (
          <Card className="p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <View className="flex-row items-center gap-2">
              <WifiOff size={16} color="#ef4444" />
              <Text className="text-xs font-sans-medium text-red-700 dark:text-red-300">
                You're offline. Expenses will sync automatically when connected.
              </Text>
            </View>
          </Card>
        )}

        {isOnline && items.length > 0 && (
          <Card className="p-3 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
            <View className="flex-row items-center gap-2">
              <RefreshCw size={16} color="#10b981" />
              <Text className="text-xs font-sans-medium text-emerald-700 dark:text-emerald-300">
                You're back online! Expenses are syncing automatically.
              </Text>
            </View>
          </Card>
        )}

        {/* Pending Items */}
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Clock}
            iconColor="#0d9488"
            title="All caught up!"
            subtitle="No pending expenses to sync"
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        ) : (
          items.map((item, idx) => (
            <Animated.View
              key={item.clientId}
              entering={FadeInDown.delay(Math.min(idx, 5) * 60).duration(300).springify()}
            >
              <Card className="p-4">
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center mt-0.5">
                    <Clock size={18} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-semibold text-card-foreground">
                      {item.description}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                      {item.groupName}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-xs text-muted-foreground font-sans">
                        {formatTimeAgo(item.queuedAt)}
                      </Text>
                      {item.attempts > 0 && (
                        <View className="px-1.5 py-0.5 rounded bg-destructive/10">
                          <Text className="text-[10px] font-sans-medium text-destructive">
                            {item.attempts} failed attempt{item.attempts > 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.lastError && (
                      <Text className="text-[10px] text-destructive font-sans mt-1" numberOfLines={2}>
                        {item.lastError}
                      </Text>
                    )}
                  </View>
                  <View className="items-end gap-2">
                    <Text className="text-sm font-sans-semibold text-foreground">
                      {formatCents(item.amountCents)}
                    </Text>
                    <Pressable
                      onPress={() => handleDiscard(item)}
                      className="w-8 h-8 rounded-full bg-destructive/10 items-center justify-center"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
