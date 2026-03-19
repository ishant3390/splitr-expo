import React from "react";
import { View, Text } from "react-native";
import { Button } from "./button";
import type { LucideIcon } from "lucide-react-native";
import { radius, palette } from "@/lib/tokens";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  iconColor = palette.slate400,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center py-12 px-6">
      <View
        style={{
          width: 72,
          height: 72,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {/* Outer ring decoration */}
        <View
          style={{
            position: "absolute",
            width: 84,
            height: 84,
            borderRadius: radius["2xl"],
            backgroundColor: `${iconColor}08`,
          }}
        />
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius["2xl"],
            backgroundColor: `${iconColor}15`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={30} color={iconColor} />
        </View>
      </View>
      <Text className="text-base font-sans-semibold text-foreground text-center mb-1">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-sm font-sans text-muted-foreground text-center mb-4 leading-5">
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="default" size="sm" onPress={onAction}>
          <Text className="text-sm font-sans-semibold text-primary-foreground">
            {actionLabel}
          </Text>
        </Button>
      )}
    </View>
  );
}
