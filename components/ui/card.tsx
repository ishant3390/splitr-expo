import React from "react";
import { View, type ViewProps } from "react-native";
import { clsx } from "clsx";

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, style, children, ...props }: CardProps) {
  return (
    <View
      className={clsx(
        "bg-card rounded-xl border border-border",
        className
      )}
      style={[{ borderCurve: "continuous" as any }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
