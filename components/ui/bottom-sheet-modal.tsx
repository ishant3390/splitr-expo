import React from "react";
import {
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  type ModalProps,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  keyboardAvoiding?: boolean;
}

/**
 * Bottom sheet modal with spring-based slide animation.
 * Uses fade for backdrop + Reanimated spring for content.
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  keyboardAvoiding = false,
}: BottomSheetModalProps) {
  const isDark = useColorScheme() === "dark";

  const content = (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(140)}
      exiting={SlideOutDown.springify().damping(20).stiffness(160)}
      style={{
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: Platform.OS === "ios" ? 36 : 24,
        gap: 16,
      }}
    >
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
    </Modal>
  );
}
