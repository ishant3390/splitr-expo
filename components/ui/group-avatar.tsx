import React from "react";
import { View, Text } from "react-native";
import { useColorScheme } from "nativewind";

// Curated pastel palettes — light bg + accent color for text/letter
// Matches the CategoryIcon visual language (soft, breathable)
// All colors target WCAG AA 4.5:1+ contrast ratio against their bg
const PASTEL_PALETTES: { bg: string; darkBg: string; color: string }[] = [
  { bg: "#ccfbf1", darkBg: "rgba(13,148,136,0.15)", color: "#0f766e" },   // teal-700
  { bg: "#ede9fe", darkBg: "rgba(139,92,246,0.15)", color: "#6d28d9" },   // violet-700
  { bg: "#fef3c7", darkBg: "rgba(217,119,6,0.15)", color: "#92400e" },    // amber-800
  { bg: "#d1fae5", darkBg: "rgba(5,150,105,0.15)", color: "#047857" },    // emerald-700
  { bg: "#fce7f3", darkBg: "rgba(219,39,119,0.15)", color: "#be185d" },   // pink-700
  { bg: "#dbeafe", darkBg: "rgba(37,99,235,0.15)", color: "#1d4ed8" },    // blue-700
  { bg: "#ffedd5", darkBg: "rgba(234,88,12,0.15)", color: "#9a3412" },    // orange-800
  { bg: "#cffafe", darkBg: "rgba(8,145,178,0.15)", color: "#0e7490" },    // cyan-700
  { bg: "#f3e8ff", darkBg: "rgba(147,51,234,0.15)", color: "#7e22ce" },   // purple-700
  { bg: "#e0f2fe", darkBg: "rgba(2,132,199,0.15)", color: "#0369a1" },    // sky-700
  { bg: "#fee2e2", darkBg: "rgba(220,38,38,0.15)", color: "#b91c1c" },    // red-700
  { bg: "#ecfccb", darkBg: "rgba(101,163,13,0.15)", color: "#3f6212" },   // lime-800
];

// Deterministic hash from string to pick palette
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface GroupAvatarProps {
  name: string;
  emoji?: string;
  groupType?: string;
  /** Unique group ID — used for deterministic color to avoid collisions */
  id?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { wh: 36, emoji: 16, text: 14, radius: 10 },
  md: { wh: 44, emoji: 22, text: 16, radius: 14 },
  lg: { wh: 64, emoji: 32, text: 22, radius: 20 },
};

/**
 * Group avatar with deterministic pastel background.
 * Shows emoji if available, otherwise first letter of group name.
 */
export function GroupAvatar({ name, emoji, groupType, id, size = "md" }: GroupAvatarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const s = SIZE_MAP[size];
  // Prefer id for uniqueness; fall back to name + groupType
  const hash = hashString(id ?? (name + (groupType ?? "")));
  const pal = PASTEL_PALETTES[hash % PASTEL_PALETTES.length];

  return (
    <View
      style={{
        width: s.wh,
        height: s.wh,
        borderRadius: s.radius,
        backgroundColor: isDark ? pal.darkBg : pal.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: s.emoji, color: emoji ? undefined : pal.color }}>
        {emoji || (name ? name.charAt(0).toUpperCase() : "?")}
      </Text>
    </View>
  );
}
