import React from "react";
import { Switch as RNSwitch, type SwitchProps } from "react-native";
import { useColorScheme } from "nativewind";

interface ThemedSwitchProps extends Omit<SwitchProps, "onValueChange"> {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export function ThemedSwitch({ checked, onCheckedChange, ...props }: ThemedSwitchProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const falseTrackColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <RNSwitch
      value={checked}
      onValueChange={onCheckedChange}
      trackColor={{ false: falseTrackColor, true: "#0d9488" }}
      thumbColor="#ffffff"
      ios_backgroundColor={falseTrackColor}
      {...props}
    />
  );
}
