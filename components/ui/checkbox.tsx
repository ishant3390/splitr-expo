import React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { clsx } from "clsx";
import { palette } from "@/lib/tokens";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onCheckedChange(!checked)}
      className={clsx(
        "w-5 h-5 rounded border-2 items-center justify-center",
        checked ? "bg-primary border-primary" : "bg-transparent border-border",
        disabled && "opacity-50",
        className
      )}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked && <Check size={14} color={palette.white} strokeWidth={3} />}
    </Pressable>
  );
}
