import React from "react";
import { View, Pressable, Text } from "react-native";
import { clsx } from "clsx";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <View
      className={clsx("flex-row bg-muted rounded-xl p-1", className)}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          className={clsx(
            "flex-1 items-center justify-center py-2.5 rounded-lg",
            activeTab === tab.id && "bg-card shadow-sm"
          )}
        >
          <Text
            className={clsx(
              "text-sm font-sans-medium",
              activeTab === tab.id ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
