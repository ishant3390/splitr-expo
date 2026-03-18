/**
 * Design tokens — single source of truth for all visual constants.
 *
 * SYNC NOTE: Light/dark semantic values must stay in sync with global.css
 * (:root / .dark) and tailwind.config.js. When updating tokens here,
 * update the CSS vars and Tailwind config to match.
 */
import { useColorScheme } from "nativewind";

// ---------------------------------------------------------------------------
// Palette — raw color primitives
// ---------------------------------------------------------------------------
export const palette = {
  white: "#ffffff",
  black: "#000000",

  // Slate scale (Tailwind)
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  slate950: "#020617",

  // Brand — Teal
  teal50: "#f0fdfa",
  teal100: "#ccfbf1",
  teal200: "#99f6e4",
  teal300: "#5eead4",
  teal400: "#2dd4bf",
  teal500: "#14b8a6",
  teal600: "#0d9488",
  teal700: "#0f766e",
  teal800: "#115e59",
  teal900: "#134e4a",
  teal950: "#042f2e",

  // Emerald
  emerald500: "#10b981",
  emerald600: "#059669",

  // Cyan
  cyan600: "#0891b2",

  // Red
  red500: "#ef4444",

  // Amber
  amber500: "#f59e0b",

  // Blue
  blue500: "#3b82f6",

  // Purple
  purple500: "#a855f7",

  // Pink
  pink500: "#ec4899",

  // Orange
  orange500: "#f97316",

  // Indigo
  indigo500: "#6366f1",
} as const;

// ---------------------------------------------------------------------------
// Semantic colors — light / dark
// ---------------------------------------------------------------------------
export interface SemanticColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  secondary: string;
  secondaryForeground: string;
  surfaceTint: string;
  borderSubtle: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  success: string;
  successForeground: string;
  destructive: string;
  destructiveForeground: string;
  warning: string;
  warningForeground: string;
  ring: string;
}

const lightColors: SemanticColors = {
  background: "#f8fafb",
  foreground: palette.slate900,      // #0f172a
  card: palette.white,               // #ffffff
  cardForeground: palette.slate900,  // #0f172a
  muted: palette.slate100,           // #f1f5f9
  mutedForeground: palette.slate500, // #64748b
  border: palette.slate200,          // #e2e8f0
  input: palette.slate200,           // #e2e8f0
  secondary: palette.slate100,       // #f1f5f9
  secondaryForeground: palette.slate800, // #1e293b
  surfaceTint: palette.teal50,       // #f0fdfa
  borderSubtle: palette.slate100,    // #f1f5f9
  primary: palette.teal600,          // #0d9488
  primaryForeground: palette.white,  // #ffffff
  accent: palette.teal500,           // #14b8a6
  accentForeground: palette.white,
  success: palette.emerald500,       // #10b981
  successForeground: palette.white,
  destructive: palette.red500,       // #ef4444
  destructiveForeground: palette.white,
  warning: palette.amber500,         // #f59e0b
  warningForeground: "#1a1a1a",
  ring: palette.teal600,             // #0d9488
};

const darkColors: SemanticColors = {
  background: palette.slate900,      // #0f172a
  foreground: palette.slate100,      // #f1f5f9
  card: palette.slate800,            // #1e293b
  cardForeground: palette.slate100,  // #f1f5f9
  muted: palette.slate700,           // #334155
  mutedForeground: palette.slate400, // #94a3b8
  border: palette.slate700,          // #334155
  input: palette.slate700,           // #334155
  secondary: palette.slate800,       // #1e293b
  secondaryForeground: palette.slate200, // #e2e8f0
  surfaceTint: palette.teal950,      // #042f2e
  borderSubtle: "rgba(255,255,255,0.06)",
  primary: palette.teal600,          // #0d9488
  primaryForeground: palette.white,
  accent: palette.teal500,           // #14b8a6
  accentForeground: palette.white,
  success: palette.emerald500,       // #10b981
  successForeground: palette.white,
  destructive: palette.red500,       // #ef4444
  destructiveForeground: palette.white,
  warning: palette.amber500,         // #f59e0b
  warningForeground: "#1a1a1a",
  ring: palette.teal600,             // #0d9488
};

/** Returns semantic color tokens for the given color scheme. */
export function colors(isDark: boolean): SemanticColors {
  return isDark ? darkColors : lightColors;
}

/** Convenience hook: resolves theme colors in one call. */
export function useThemeColors(): SemanticColors {
  const { colorScheme } = useColorScheme();
  return colors(colorScheme === "dark");
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  "2xl": 20,
  "3xl": 24,
  "4xl": 28,
  "5xl": 34,
} as const;

export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

// ---------------------------------------------------------------------------
// Spacing (multiples of 4, with 2 and 6 for fine-tuning)
// ---------------------------------------------------------------------------
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------
export const radius = {
  none: 0,
  sm: 6,
  md: 8,
  DEFAULT: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Z-index
// ---------------------------------------------------------------------------
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 50,
  toast: 100,
} as const;

// ---------------------------------------------------------------------------
// Animation durations (ms)
// ---------------------------------------------------------------------------
export const duration = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// ---------------------------------------------------------------------------
// Opacity presets
// ---------------------------------------------------------------------------
export const opacity = {
  disabled: 0.5,
  hover: 0.08,
  pressed: 0.12,
  overlay: 0.5,
  watermark: 0.08,
} as const;

// ---------------------------------------------------------------------------
// Chart colors — 5 distinct hues for pie/bar charts
// ---------------------------------------------------------------------------
export const chartColors = [
  palette.teal600,
  palette.emerald500,
  palette.blue500,
  palette.amber500,
  palette.purple500,
] as const;
