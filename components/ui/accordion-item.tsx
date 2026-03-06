import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ChevronDown } from "lucide-react-native";
import { hapticLight } from "@/lib/haptics";

interface AccordionItemProps {
  title: string;
  children: string;
}

export function AccordionItem({ title, children }: AccordionItemProps) {
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const toggleExpand = () => {
    hapticLight();
    const next = !expanded;
    setExpanded(next);
    rotation.value = withTiming(next ? 180 : 0, { duration: 250, easing: Easing.out(Easing.cubic) });
    height.value = withTiming(next ? 1 : 0, { duration: 250, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(next ? 1 : 0, { duration: 200 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: height.value * 200,
    opacity: opacity.value,
    overflow: "hidden" as const,
  }));

  return (
    <View className="bg-card rounded-xl border border-border overflow-hidden">
      <Pressable
        onPress={toggleExpand}
        className="flex-row items-center justify-between p-4"
      >
        <Text className="flex-1 text-sm font-sans-medium text-card-foreground pr-3">
          {title}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color="#94a3b8" />
        </Animated.View>
      </Pressable>
      <Animated.View style={contentStyle}>
        <View className="px-4 pb-4">
          <Text className="text-sm text-muted-foreground font-sans leading-5">
            {children}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
