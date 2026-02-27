import React, { useState, useEffect } from "react";
import { View, Text, SectionList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import {
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { usersApi } from "@/lib/api";
import { formatCents, formatDate, categoryLabels } from "@/lib/utils";
import type { ActivityLogDto, ExpenseCategory } from "@/lib/types";

const iconMap: Record<ExpenseCategory, typeof Utensils> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  other: MoreHorizontal,
};

export default function ActivityScreen() {
  const { getToken } = useAuth();
  const [sections, setSections] = useState<{ title: string; data: ActivityLogDto[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const data = await usersApi.activity(token!);
        const list: ActivityLogDto[] = Array.isArray(data) ? data : [];

        // Group by date label
        const grouped = list.reduce<Record<string, ActivityLogDto[]>>((acc, item) => {
          const label = item.createdAt
            ? formatDate(item.createdAt)
            : "Recent";
          if (!acc[label]) acc[label] = [];
          acc[label].push(item);
          return acc;
        }, {});

        setSections(
          Object.entries(grouped).map(([title, data]) => ({ title, data }))
        );
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-3 pb-4">
          <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-4">
        <Text className="text-2xl font-sans-bold text-foreground">Activity</Text>
      </View>

      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Card className="p-6 items-center w-full">
            <Text className="text-sm text-muted-foreground font-sans">No activity yet</Text>
          </Card>
        </View>
      ) : (
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
          renderItem={({ item }) => {
            const categoryKey = ((item.details?.categoryIcon as string) ?? "other") as ExpenseCategory;
            const Icon = iconMap[categoryKey] ?? MoreHorizontal;
            const actorName = item.actorUserName ?? item.actorGuestName ?? "Someone";
            const description = item.activityType
              .replace(/_/g, " ")
              .replace(/^\w/, (c) => c.toUpperCase());
            const groupName = (item.details?.groupName as string) ?? "";

            return (
              <Card className="p-4 mb-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                    <Icon size={20} color="#0d9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-semibold text-card-foreground">
                      {description}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-sans">
                      {actorName} {groupName ? `· ${groupName}` : ""}
                    </Text>
                  </View>
                  <View className="items-end">
                    {item.details?.amount != null && (
                      <Text className="text-sm font-sans-semibold text-foreground">
                        {formatCents(item.details.amount as number)}
                      </Text>
                    )}
                    {categoryLabels[categoryKey] && (
                      <Text className="text-xs text-muted-foreground font-sans">
                        {categoryLabels[categoryKey]}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
