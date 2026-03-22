/** Shared gradient color arrays for LinearGradient */
export const GRADIENTS = {
  heroTeal: ["#0d9488", "#0891b2"] as const,        // teal-600 → cyan-600
  heroDark: ["#042f2e", "#083344"] as const,        // OLED dark: teal-950 → cyan-950
  heroEmerald: ["#059669", "#0d9488"] as const,     // emerald-600 → teal-600
  heroEmeraldDark: ["#022c22", "#042f2e"] as const, // OLED dark: emerald-950 → teal-950
  primaryButton: ["#0d9488", "#0f766e"] as const,   // subtle teal depth
  shimmer: ["transparent", "rgba(255,255,255,0.12)", "transparent"] as const,
  tabBarLight: ["rgba(255,255,255,0)", "rgba(255,255,255,0.9)", "#ffffff"] as const,
  tabBarDark: ["rgba(0,0,0,0)", "rgba(0,0,0,0.9)", "#000000"] as const,
};
