import React from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableComponentProps extends PressableProps {
  scaleValue?: number;
  children: React.ReactNode;
}

export function AnimatedPressable({
  scaleValue = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedPressableComponentProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={(e) => {
        scale.value = withSpring(scaleValue, { damping: 10, stiffness: 200 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 8, stiffness: 150 });
        onPressOut?.(e);
      }}
      style={[animatedStyle, props.style as any]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
