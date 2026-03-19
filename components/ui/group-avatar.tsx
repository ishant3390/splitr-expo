import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette } from "@/lib/tokens";

// Curated gradient pairs — warm, cool, earthy, vibrant
const GRADIENT_PAIRS: [string, string][] = [
  ["#0d9488", "#06b6d4"], // teal -> cyan
  ["#8b5cf6", "#6366f1"], // violet -> indigo
  ["#f59e0b", "#ef4444"], // amber -> red
  ["#10b981", "#059669"], // emerald -> green
  ["#ec4899", "#f43f5e"], // pink -> rose
  ["#3b82f6", "#6366f1"], // blue -> indigo
  ["#f97316", "#f59e0b"], // orange -> amber
  ["#14b8a6", "#22d3ee"], // teal -> cyan light
  ["#a855f7", "#ec4899"], // purple -> pink
  ["#06b6d4", "#3b82f6"], // cyan -> blue
  ["#ef4444", "#f97316"], // red -> orange
  ["#84cc16", "#10b981"], // lime -> emerald
];

// Deterministic hash from string to pick gradient
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
  /** Unique group ID — used for deterministic gradient to avoid collisions */
  id?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { wh: 36, emoji: 16, text: 12, radius: 10 },
  md: { wh: 44, emoji: 22, text: 14, radius: 14 },
  lg: { wh: 64, emoji: 32, text: 20, radius: 20 },
};

/**
 * Group avatar with deterministic gradient background.
 * Shows emoji if available, otherwise first letter of group name.
 */
export function GroupAvatar({ name, emoji, groupType, id, size = "md" }: GroupAvatarProps) {
  const s = SIZE_MAP[size];
  // Prefer id for uniqueness; fall back to name + groupType
  const hash = hashString(id ?? (name + (groupType ?? "")));
  const [from, to] = GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: s.wh,
        height: s.wh,
        borderRadius: s.radius,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: s.emoji, color: palette.white }}>
        {emoji || name.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}
