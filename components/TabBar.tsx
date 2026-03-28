import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { BlurView } from "expo-blur";
import { Plus } from "lucide-react-native";
import { hapticSelection, hapticMedium } from "@/lib/haptics";
import { useRouter } from "expo-router";
import {
  HomeIcon,
  GroupsIcon,
  ActivityIcon,
  ProfileIcon,
} from "@/components/icons/tab-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";

// Tab bar height: paddingTop(8) + icon(24) + gap(4) + label(10) + paddingVertical(4) ≈ 50 + insets.bottom
// Screens should use this + insets.bottom for bottom padding
export const TAB_BAR_HEIGHT = 56;

const ICON_MAP: Record<string, typeof HomeIcon> = {
  index: HomeIcon,
  groups: GroupsIcon,
  activity: ActivityIcon,
  profile: ProfileIcon,
};

const LABEL_MAP: Record<string, string> = {
  index: "Home",
  groups: "Groups",
  activity: "Activity",
  profile: "Profile",
};

const ACTIVE_COLOR = palette.teal600;
const INACTIVE_COLOR = palette.slate400;

const SPRING_BOUNCY = { damping: 10, stiffness: 200, mass: 0.6 };
const SPRING_SMOOTH = { damping: 14, stiffness: 150, mass: 0.8 };

/**
 * Airbnb-style animated tab icon:
 * - Outline when inactive, filled when active
 * - Overshoot bounce on selection (scale 1 -> 1.3 -> 1.1)
 * - Subtle lift (translateY) when active
 * - Crossfade between outline/filled via opacity
 */
function TabIcon({ name, isFocused }: { name: string; isFocused: boolean }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const filledOpacity = useSharedValue(isFocused ? 1 : 0);
  const outlineOpacity = useSharedValue(isFocused ? 0 : 1);

  useEffect(() => {
    if (isFocused) {
      // Overshoot bounce: 1 -> 1.08 -> 1.02 (subtle, not distracting on repeat)
      scale.value = withSequence(
        withSpring(1.08, { damping: 10, stiffness: 250, mass: 0.5 }),
        withSpring(1.02, SPRING_SMOOTH)
      );
      translateY.value = withSpring(-3, SPRING_SMOOTH);
      filledOpacity.value = withTiming(1, { duration: 150 });
      outlineOpacity.value = withTiming(0, { duration: 100 });
    } else {
      scale.value = withSpring(1, SPRING_SMOOTH);
      translateY.value = withSpring(0, SPRING_SMOOTH);
      filledOpacity.value = withTiming(0, { duration: 200 });
      outlineOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isFocused]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const filledStyle = useAnimatedStyle(() => ({
    opacity: filledOpacity.value,
    position: "absolute" as const,
  }));

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: outlineOpacity.value,
  }));

  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;

  return (
    <Animated.View style={[containerStyle, { width: 24, height: 24 }]}>
      {/* Outline (inactive) layer */}
      <Animated.View style={outlineStyle}>
        <IconComponent size={22} color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR} filled={false} />
      </Animated.View>
      {/* Filled (active) layer - overlaid on top */}
      <Animated.View style={filledStyle}>
        <IconComponent size={22} color={ACTIVE_COLOR} filled={true} />
      </Animated.View>
    </Animated.View>
  );
}

function TabLabel({ name, isFocused }: { name: string; isFocused: boolean }) {
  const opacity = useSharedValue(isFocused ? 1 : 0.6);
  const scale = useSharedValue(isFocused ? 1 : 0.95);

  useEffect(() => {
    opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 200 });
    scale.value = withSpring(isFocused ? 1 : 0.95, SPRING_SMOOTH);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        styles.label,
        {
          color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontFamily: isFocused ? ff.semibold : ff.medium,
        },
        animatedStyle,
      ]}
    >
      {LABEL_MAP[name] ?? name}
    </Animated.Text>
  );
}

function FABButton() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    hapticMedium();
    scale.value = withSequence(
      withSpring(0.95, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    router.push("/(tabs)/add");
  };

  const handleLongPress = () => {
    hapticMedium();
    scale.value = withSequence(
      withSpring(0.95, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    router.push({ pathname: "/(tabs)/add", params: { quick: "true" } });
  };

  return (
    <View style={styles.fabContainer}>
      <Animated.View style={[styles.fabShadow, animatedStyle]}>
        <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={400} style={styles.fab} accessibilityLabel="Add Expense" accessibilityRole="button">
          <Plus size={24} color={palette.white} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Sliding indicator
  const { width: screenWidth } = useWindowDimensions();
  const realTabs = state.routes.filter((r) => r.name !== "add");
  const tabWidth = screenWidth / (realTabs.length + 1);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(20);

  useEffect(() => {
    const activeRoute = state.routes[state.index];
    const realIndex = realTabs.findIndex((r) => r.name === activeRoute.name);
    if (realIndex === -1) return;
    const posIndex = realIndex < 2 ? realIndex : realIndex + 1;
    // Center of the tab slot
    indicatorX.value = withSpring(posIndex * tabWidth + tabWidth / 2, SPRING_BOUNCY);
    // Brief stretch on move
    indicatorWidth.value = withSequence(
      withSpring(28, { damping: 8, stiffness: 250 }),
      withSpring(20, SPRING_SMOOTH)
    );
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    // Subtract half the current width so the pill is always centered
    transform: [{ translateX: indicatorX.value - indicatorWidth.value / 2 }],
    width: indicatorWidth.value,
  }));

  const blurTint = isDark ? "dark" : "light";

  return (
    <View style={styles.wrapper}>
      {/* Frosted glass tab bar */}
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 0}
        tint={blurTint}
        style={[
          styles.blurContainer,
          {
            paddingBottom: insets.bottom || 16,
            // Fallback for Android (BlurView doesn't work on Android)
            ...(Platform.OS !== "ios" && {
              backgroundColor: isDark ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.92)",
            }),
          },
        ]}
      >
        {/* Semi-transparent overlay for better contrast */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)",
            },
          ]}
          pointerEvents="none"
        />

        {/* Subtle top border */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          }}
          pointerEvents="none"
        />

        {/* Active indicator pill */}
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <View style={[styles.indicatorPill, { backgroundColor: ACTIVE_COLOR, width: 28 }]} />
        </Animated.View>

        {/* Tab items */}
        <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          if (route.name === "add") {
            return <FABButton key="add" />;
          }

          const isFocused = state.index === index;

          const onPress = () => {
            hapticSelection();
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              navigation.navigate(route.name, { screen: "index" });
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={LABEL_MAP[route.name]}
            >
              <TabIcon name={route.name} isFocused={isFocused} />
              <TabLabel name={route.name} isFocused={isFocused} />
            </Pressable>
          );
        })}
      </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    paddingTop: 8,
    overflow: "hidden",
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
  },
  fabContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fabShadow: {
    shadowColor: palette.teal600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: radius.lg,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: palette.teal600,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    top: 0,
    height: 3,
    zIndex: 1,
  },
  indicatorPill: {
    width: "100%",
    height: 3,
    borderRadius: 1.5,
  },
});
