import React from "react";
import { Pressable, Text, View, type PressableProps, ActivityIndicator } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { clsx } from "clsx";
import { useColorScheme } from "nativewind";
import { GRADIENTS } from "@/lib/gradients";
import { SHADOWS } from "@/lib/shadows";
import { colors, palette } from "@/lib/tokens";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "accent";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "overflow-hidden active:opacity-90",
  outline: "bg-transparent border border-border active:bg-muted",
  ghost: "bg-transparent active:bg-muted",
  destructive: "bg-destructive active:bg-destructive/90",
  accent: "bg-accent active:bg-accent/90",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  default: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  destructive: "text-destructive-foreground",
  accent: "text-accent-foreground",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 rounded-lg",
  md: "px-4 py-3 rounded-xl",
  lg: "px-6 py-4 rounded-xl",
  icon: "w-10 h-10 rounded-xl items-center justify-center",
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  icon: "text-base",
};

export function Button({
  variant = "default",
  size = "md",
  children,
  loading,
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Extract flex-1 to outer Animated.View so layout sizing works in flex parents
  const hasFlexOne = className?.includes("flex-1");
  const innerClassName = hasFlexOne ? className!.replace(/flex-1/g, "").trim() : className;

  const isDefault = variant === "default";

  const content = (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? c.primary : palette.white}
          className="mr-2"
        />
      )}
      {typeof children === "string" ? (
        <Text
          className={clsx(
            "font-sans-semibold",
            variantTextStyles[variant],
            sizeTextStyles[size],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  return (
    <Animated.View
      style={[animatedStyle, isDefault && SHADOWS.glowTeal]}
      className={hasFlexOne ? "flex-1" : undefined}
    >
      <Pressable
        className={clsx(
          "flex-row items-center justify-center",
          variantStyles[variant],
          sizeStyles[size],
          disabled && "opacity-50",
          innerClassName
        )}
        disabled={disabled || loading}
        onPressIn={(e) => {
          scale.value = withSpring(0.97, { damping: 10, stiffness: 200 });
          props.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, { damping: 8, stiffness: 150 });
          props.onPressOut?.(e);
        }}
        accessibilityRole="button"
        {...props}
      >
        {isDefault ? (
          <LinearGradient
            colors={GRADIENTS.primaryButton as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: size === "sm" ? 8 : 12,
            }}
          />
        ) : null}
        {content}
      </Pressable>
    </Animated.View>
  );
}
