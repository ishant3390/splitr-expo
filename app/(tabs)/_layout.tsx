import React from "react";
import { View, Pressable, Text } from "react-native";
import { Tabs as ExpoTabs } from "expo-router";
import {
  Home,
  Users,
  Plus,
  Receipt,
  User,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { hapticMedium } from "@/lib/haptics";

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
          tabBarButton: () => (
            <View className="flex-1 items-center justify-center">
              <Pressable
                onPress={() => { hapticMedium(); router.push("/(tabs)/add"); }}
                className="w-12 h-12 rounded-full bg-primary items-center justify-center"
              >
                <Plus size={22} color="#ffffff" />
              </Pressable>
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
