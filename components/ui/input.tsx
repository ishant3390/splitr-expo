import React from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";
import { useColorScheme } from "nativewind";
import { clsx } from "clsx";
import { colors } from "@/lib/tokens";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
}

export function Input({
  label,
  error,
  containerClassName,
  className,
  ...props
}: InputProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  return (
    <View className={clsx("w-full", containerClassName)}>
      {label && (
        <Text className="text-sm font-sans-medium text-foreground mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        className={clsx(
          "w-full bg-muted rounded-xl px-4 py-3.5 text-base text-foreground font-sans",
          error && "border border-destructive",
          className
        )}
        placeholderTextColor={c.placeholder}
        {...props}
      />
      {error && (
        <Text className="text-xs text-destructive mt-1 font-sans">{error}</Text>
      )}
    </View>
  );
}
