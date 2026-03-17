import { useReducedMotion } from "react-native-reanimated";

/**
 * Central hook for reduced-motion support.
 * Returns animation-safe values: if the user has enabled "Reduce Motion"
 * in their OS accessibility settings, durations collapse to near-zero
 * and spring configs become critically damped (no bounce).
 *
 * Usage:
 *   const { shouldReduce, duration, spring } = useMotionPreference();
 *   // duration(300) → duration(shouldReduce ? 0 : 300)
 *   // spring configs get overridden with high damping
 */
export function useMotionPreference() {
  const shouldReduce = useReducedMotion();

  return {
    shouldReduce,
    /** Return 0 or the given duration based on preference */
    duration: (ms: number) => (shouldReduce ? 0 : ms),
    /** Return critically-damped spring or the given config */
    spring: (config: { damping: number; stiffness: number; mass?: number }) =>
      shouldReduce
        ? { damping: 100, stiffness: config.stiffness, mass: config.mass ?? 1 }
        : config,
  };
}
