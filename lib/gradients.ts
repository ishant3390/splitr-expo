/** Shared gradient color arrays for LinearGradient */
export const GRADIENTS = {
  heroTeal: ["#0d9488", "#0891b2"] as const,        // teal-600 → cyan-600
  heroDark: ["#134e4a", "#164e63"] as const,        // dark mode variant
  heroEmerald: ["#059669", "#0d9488"] as const,     // emerald-600 → teal-600
  heroEmeraldDark: ["#064e3b", "#134e4a"] as const, // dark mode variant
  primaryButton: ["#0d9488", "#0f766e"] as const,   // subtle teal depth
  shimmer: ["transparent", "rgba(255,255,255,0.12)", "transparent"] as const,
  tabBarLight: ["rgba(255,255,255,0)", "rgba(255,255,255,0.9)", "#ffffff"] as const,
  tabBarDark: ["rgba(15,23,42,0)", "rgba(15,23,42,0.9)", "#0f172a"] as const,
};
