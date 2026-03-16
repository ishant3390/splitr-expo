import React, { useEffect } from "react";
import { View, type ViewProps } from "react-native";
import { useColorScheme } from "nativewind";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
  ...props
}: SkeletonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      {...props}
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? "#334155" : "#e2e8f0",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Balance card skeleton for home screen */
export function SkeletonBalanceCard() {
  return (
    <View className="p-5 rounded-xl bg-primary/80" style={{ gap: 12 }}>
      <Skeleton width={80} height={12} borderRadius={6} />
      <Skeleton width={160} height={36} borderRadius={8} />
      <View style={{ flexDirection: "row", gap: 24, marginTop: 8 }}>
        <View style={{ gap: 6 }}>
          <Skeleton width={60} height={10} borderRadius={4} />
          <Skeleton width={80} height={16} borderRadius={6} />
        </View>
        <View style={{ gap: 6 }}>
          <Skeleton width={50} height={10} borderRadius={4} />
          <Skeleton width={70} height={16} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

/** Activity item skeleton */
export function SkeletonActivityItem() {
  return (
    <View
      className="p-4 rounded-xl bg-card border border-border"
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="70%" height={14} borderRadius={6} />
        <Skeleton width="40%" height={10} borderRadius={4} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Skeleton width={50} height={14} borderRadius={6} />
        <Skeleton width={30} height={10} borderRadius={4} />
      </View>
    </View>
  );
}

/** Group list item skeleton */
export function SkeletonGroupItem() {
  return (
    <View
      className="p-4 rounded-xl bg-card border border-border"
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <Skeleton width={44} height={44} borderRadius={16} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={16} borderRadius={6} />
        <Skeleton width="35%" height={10} borderRadius={4} />
      </View>
      <Skeleton width={20} height={20} borderRadius={10} />
    </View>
  );
}

/** List of skeleton items */
export function SkeletonList({ count = 4, type = "activity" }: { count?: number; type?: "activity" | "group" }) {
  const Item = type === "group" ? SkeletonGroupItem : SkeletonActivityItem;
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </View>
  );
}
