import React from "react";
import { Switch as RNSwitch, type SwitchProps } from "react-native";

interface ThemedSwitchProps extends Omit<SwitchProps, "onValueChange"> {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export function ThemedSwitch({ checked, onCheckedChange, ...props }: ThemedSwitchProps) {
  return (
    <RNSwitch
      value={checked}
      onValueChange={onCheckedChange}
      trackColor={{ false: "#e2e8f0", true: "#0d9488" }}
      thumbColor="#ffffff"
      ios_backgroundColor="#e2e8f0"
      {...props}
    />
  );
}
