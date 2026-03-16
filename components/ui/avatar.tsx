import React, { useState } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { clsx } from "clsx";

interface AvatarProps {
  src?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8", text: "text-xs", image: 32 },
  md: { container: "w-10 h-10", text: "text-sm", image: 40 },
  lg: { container: "w-14 h-14", text: "text-lg", image: 56 },
};

export function Avatar({ src, fallback, size = "md", className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const s = sizeMap[size];

  return (
    <View
      className={clsx(
        "rounded-full bg-primary/10 items-center justify-center overflow-hidden",
        s.container,
        className
      )}
    >
      {src && !imageError ? (
        <Image
          source={{ uri: src }}
          style={{
            width: s.image,
            height: s.image,
            borderWidth: 2,
            borderColor: "#ffffff",
            borderRadius: s.image / 2,
          }}
          contentFit="cover"
          onError={() => setImageError(true)}
          accessibilityLabel={`Avatar for ${fallback}`}
        />
      ) : (
        <Text className={clsx("font-sans-semibold text-primary", s.text)}>
          {fallback}
        </Text>
      )}
    </View>
  );
}
