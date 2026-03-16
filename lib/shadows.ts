import { Platform, ViewStyle } from "react-native";

/** Shared shadow constants — NativeWind doesn't support boxShadow on native */
export const SHADOWS = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 3 },
    default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
  })!,
  elevated: Platform.select<ViewStyle>({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24 },
    android: { elevation: 8 },
    default: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24 },
  })!,
  glowTeal: Platform.select<ViewStyle>({
    ios: { shadowColor: "#0d9488", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16 },
    android: { elevation: 6 },
    default: { shadowColor: "#0d9488", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16 },
  })!,
};
