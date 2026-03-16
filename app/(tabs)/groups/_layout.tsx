import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function GroupsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "web" ? "fade" : "slide_from_right",
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen
        name="[id]"
        options={{
          animation: Platform.OS === "web" ? "fade" : "slide_from_right",
          animationDuration: 200,
        }}
      />
    </Stack>
  );
}
