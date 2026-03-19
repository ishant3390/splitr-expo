import React from "react";
import { Switch as RNSwitch, type SwitchProps } from "react-native";
import { useColorScheme } from "nativewind";
import { colors, palette } from "@/lib/tokens";

interface ThemedSwitchProps extends Omit<SwitchProps, "onValueChange"> {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export function ThemedSwitch({ checked, onCheckedChange, ...props }: ThemedSwitchProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const falseTrackColor = c.border;

  return (
    <RNSwitch
      value={checked}
      onValueChange={onCheckedChange}
      trackColor={{ false: falseTrackColor, true: c.primary }}
      thumbColor={palette.white}
      ios_backgroundColor={falseTrackColor}
      {...props}
    />
  );
}
