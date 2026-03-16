import React from "react";
import { View, type ViewProps } from "react-native";
import { useColorScheme } from "nativewind";
import { clsx } from "clsx";
import { SHADOWS } from "@/lib/shadows";

type CardVariant = "default" | "elevated";

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
  variant?: CardVariant;
}

export function Card({ className, style, children, variant = "default", ...props }: CardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const shadow = variant === "elevated" ? SHADOWS.elevated : SHADOWS.card;

  return (
    <View
      className={clsx(
        "bg-card rounded-2xl",
        isDark && "border border-white/[0.06]",
        className
      )}
      style={[
        { borderCurve: "continuous" as any },
        !isDark && shadow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
