import React from "react";
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  type ModalProps,
} from "react-native";
import { useColorScheme } from "nativewind";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { colors, radius, palette } from "@/lib/tokens";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  keyboardAvoiding?: boolean;
}

/**
 * Bottom sheet modal with spring-based slide animation.
 * Uses fade for backdrop + Reanimated spring for content.
 *
 * Wraps content in a View with explicit dark/light className so NativeWind
 * CSS variables (text-foreground, bg-muted, etc.) resolve correctly inside
 * the Modal's separate view tree.
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  keyboardAvoiding = false,
}: BottomSheetModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  const content = (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(180)}
      exiting={SlideOutDown.springify().damping(22).stiffness(220)}
      style={{
        backgroundColor: c.card,
        borderTopLeftRadius: radius["2xl"],
        borderTopRightRadius: radius["2xl"],
        padding: 24,
        paddingBottom: Platform.OS === "ios" ? 36 : 24,
        gap: 16,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
      }}
    >
      {/* Drag handle pill */}
      <View style={{ alignItems: "center", marginTop: -8, marginBottom: 4 }}>
        <View
          style={{
            width: 40,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: isDark ? palette.slate600 : palette.slate300,
          }}
        />
      </View>
      {children}
    </Animated.View>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className={isDark ? "dark" : ""} style={{ flex: 1 }}>
        <Pressable
          onPress={onClose}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          {keyboardAvoiding ? (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <Pressable onPress={(e) => e?.stopPropagation?.()}>
                {content}
              </Pressable>
            </KeyboardAvoidingView>
          ) : (
            <Pressable onPress={(e) => e?.stopPropagation?.()}>
              {content}
            </Pressable>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}
