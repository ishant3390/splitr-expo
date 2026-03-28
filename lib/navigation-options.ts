import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/**
 * Keep settle-up on a stable push-style card presentation.
 * Avoid formSheet detents/grabber options, which were previously unreliable on iOS.
 */
export const SETTLE_UP_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animation: "slide_from_right",
  presentation: "card",
};

