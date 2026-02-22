import React from "react";
import { View, Pressable, Text } from "react-native";
import { Tabs as ExpoTabs } from "expo-router";
import {
  Home,
  Users,
  Plus,
  Receipt,
  User,
  ScanLine,
} from "lucide-react-native";
import { useRouter } from "expo-router";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <ExpoTabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#0d9488",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <ExpoTabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => (
            <View className="flex-row items-center gap-1.5 -mt-4">
              <Pressable
                onPress={() => router.push("/receipt-scanner")}
                className="w-10 h-10 rounded-full bg-accent items-center justify-center shadow-md"
              >
                <ScanLine size={20} color="#ffffff" />
              </Pressable>
              <View className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg">
                <Plus size={26} color="#ffffff" />
              </View>
            </View>
          ),
        }}
      />
      <ExpoTabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </ExpoTabs>
  );
}
