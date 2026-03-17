import React from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { getCategoryIcon, type CategoryIconConfig } from "@/lib/category-icons";

const SIZES = {
  sm: { box: 28, icon: 14 },
  md: { box: 40, icon: 20 },
  lg: { box: 48, icon: 24 },
} as const;

interface CategoryIconProps {
  /** Backend icon name string — resolved via getCategoryIcon() */
  iconName?: string;
  /** Direct config override — takes precedence over iconName */
  config?: CategoryIconConfig;
  /** sm=28px, md=40px (default), lg=48px */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CategoryIcon({
  iconName,
  config,
  size = "md",
  className,
}: CategoryIconProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const resolved = config ?? getCategoryIcon(iconName);
  const { box, icon: iconSize } = SIZES[size];
  const IconComponent = resolved.icon;

  // Brand icons (bg=transparent) render their own background — use full box size
  const isBrandIcon = resolved.bg === "transparent";

  return (
    <View
      className={className}
      style={{
        width: box,
        height: box,
        borderRadius: isBrandIcon ? box * 0.2 : box * 0.3,
        backgroundColor: isBrandIcon
          ? "transparent"
          : isDark
            ? (resolved.darkBg ?? resolved.bg)
            : resolved.bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <IconComponent size={isBrandIcon ? box : iconSize} color={resolved.color} />
    </View>
  );
}
