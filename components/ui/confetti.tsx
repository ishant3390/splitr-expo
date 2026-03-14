import React, { useEffect, useMemo } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PARTICLE_COUNT = 40;
const COLORS = ["#0d9488", "#14b8a6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];

function Particle({ index, total }: { index: number; total: number }) {
  const startX = useMemo(() => SCREEN_WIDTH * 0.2 + Math.random() * SCREEN_WIDTH * 0.6, []);
  const endX = useMemo(() => startX + (Math.random() - 0.5) * SCREEN_WIDTH * 0.8, []);
  const endY = useMemo(() => SCREEN_HEIGHT * 0.3 + Math.random() * SCREEN_HEIGHT * 0.5, []);
  const rotation = useMemo(() => Math.random() * 720 - 360, []);
  const size = useMemo(() => 6 + Math.random() * 8, []);
  const color = useMemo(() => COLORS[index % COLORS.length], [index]);
  const isSquare = useMemo(() => Math.random() > 0.5, []);
  const delay = useMemo(() => Math.random() * 400, []);

  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const x = startX + (endX - startX) * t;
    const y = -20 + endY * t;
    return {
      position: "absolute" as const,
      left: x,
      top: y,
      width: size,
      height: isSquare ? size : size * 0.4,
      borderRadius: isSquare ? 2 : size * 0.2,
      backgroundColor: color,
      opacity: opacity.value,
      transform: [{ rotate: `${rotation * t}deg` }],
    };
  });

  return <Animated.View style={animatedStyle} />;
}

export function Confetti({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} total={PARTICLE_COUNT} />
      ))}
    </View>
  );
}
