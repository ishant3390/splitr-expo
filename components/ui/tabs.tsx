import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useColorScheme } from "nativewind";
import { clsx } from "clsx";
import { colors, fontSize as fs, fontFamily as ff, radius } from "@/lib/tokens";

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  return (
    <View
      className={clsx("flex-row bg-muted rounded-xl p-1", className)}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[
              styles.tab,
              isActive && {
                backgroundColor: c.card,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? c.foreground : c.mutedForeground },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  tabText: {
    fontSize: fs.md,
    fontFamily: ff.medium,
  },
});
