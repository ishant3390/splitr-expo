import React, { useEffect, useState, useRef } from "react";
import { Text, type TextProps } from "react-native";

interface AnimatedNumberProps extends Omit<TextProps, "children"> {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

/**
 * Animates a number counting up from 0 (or previous value) to the target value.
 * Uses JS-based requestAnimationFrame for smooth animation.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  formatter = (n) => n.toFixed(0),
  ...textProps
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(formatter(0));
  const rafRef = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      const current = value * eased;
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
