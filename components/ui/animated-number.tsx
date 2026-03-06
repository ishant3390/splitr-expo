import React, { useEffect, useState, useRef } from "react";
import { Text, type TextProps } from "react-native";

interface AnimatedNumberProps extends Omit<TextProps, "children"> {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

/**
 * Animates a number from its previous value to the new target.
 * Uses JS-based requestAnimationFrame with cubic ease-out.
 */
export function AnimatedNumber({
  value,
  duration = 600,
  formatter = (n) => n.toFixed(0),
  ...textProps
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(formatter(value));
  const prevValue = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = value;

    // Skip animation if no change
    if (from === to) {
      setDisplay(formatter(to));
      return;
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      const current = from + (to - from) * eased;
      setDisplay(formatter(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, formatter]);

  return (
    <Text {...textProps}>
      {display}
    </Text>
  );
}
