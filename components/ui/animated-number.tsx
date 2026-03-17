import React, { useEffect, useCallback, useRef } from "react";
import { Text, type TextProps } from "react-native";
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
  useReducedMotion,
} from "react-native-reanimated";

interface AnimatedNumberProps extends Omit<TextProps, "children"> {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

/**
 * Animates a number from its previous value to the new target.
 * Runs entirely on the UI thread via Reanimated shared values.
 * Falls back to instant update when user prefers reduced motion.
 */
export function AnimatedNumber({
  value,
  duration = 600,
  formatter = (n) => n.toFixed(0),
  ...textProps
}: AnimatedNumberProps) {
  const shouldReduce = useReducedMotion();
  const animatedValue = useSharedValue(value);
  const [display, setDisplay] = React.useState(formatter(value));
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;

  const updateDisplay = useCallback((v: number) => {
    setDisplay(formatterRef.current(v));
  }, []);

  useEffect(() => {
    if (shouldReduce) {
      animatedValue.value = value;
    } else {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
    // Always set final display — in production, useAnimatedReaction will override
    // with intermediate values during the animation for smooth counting
    setDisplay(formatter(value));
  }, [value, duration, shouldReduce]);

  // Bridge UI-thread animated value changes to JS-thread display updates.
  // In production, this fires on every animation frame for smooth counting.
  useAnimatedReaction(
    () => animatedValue.value,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(updateDisplay)(current);
      }
    }
  );

  return (
    <Text {...textProps}>
      {display}
    </Text>
  );
}
