import React from "react";
import { Tabs as ExpoTabs } from "expo-router";
import { TabBar } from "@/components/TabBar";

export default function TabsLayout() {
  return (
    <ExpoTabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <ExpoTabs.Screen name="index" />
      <ExpoTabs.Screen name="groups" />
      <ExpoTabs.Screen name="add" />
      <ExpoTabs.Screen name="activity" />
      <ExpoTabs.Screen name="profile" />
    </ExpoTabs>
  );
}
