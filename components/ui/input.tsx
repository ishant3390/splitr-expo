import React, { useState } from "react";
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
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const [focused, setFocused] = useState(false);

  return (
    <View className={clsx("w-full", containerClassName)}>
      {label && (
        <Text className="text-sm font-sans-medium text-foreground mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        className={clsx(
          "w-full bg-card rounded-xl px-4 py-3.5 text-base text-foreground font-sans",
          className
        )}
        style={{
          borderWidth: 1.5,
          borderColor: error
            ? c.destructive
            : focused
            ? c.primary
            : isDark
            ? c.border
            : "#cbd5e1",
        }}
        placeholderTextColor={c.placeholder}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
      />
      {error && (
        <Text className="text-xs text-destructive mt-1 font-sans">{error}</Text>
      )}
    </View>
  );
}
