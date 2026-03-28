import React from "react";
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, palette } from "@/lib/tokens";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  keyboardAvoiding?: boolean;
  modalTestID?: string;
}

/**
 * Bottom sheet modal rendered via native RN Modal for reliable iOS layering.
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  keyboardAvoiding = false,
  modalTestID = "bottom-sheet-modal",
}: BottomSheetModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxContentHeight = Math.max(260, screenHeight * 0.85 - insets.top);
  const contentMaxHeight = Math.max(180, maxContentHeight - 48);

  if (!visible) return null;

  const content = (
    <View
      style={{
        backgroundColor: c.card,
        borderTopLeftRadius: radius["2xl"],
        borderTopRightRadius: radius["2xl"],
        minHeight: 120,
        maxHeight: maxContentHeight,
        width: "100%",
        alignSelf: "stretch",
        overflow: "hidden",
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
      }}
    >
      {/* Drag handle pill */}
      <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 12 }}>
        <View
          testID={`${modalTestID}-handle`}
          style={{
            width: 40,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: isDark ? palette.slate600 : palette.slate300,
          }}
        />
      </View>
      <View style={{ maxHeight: contentMaxHeight }}>
        <ScrollView
          testID={`${modalTestID}-scroll`}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );

  const sheet = (
    <Pressable
      onPress={(e) => e?.stopPropagation?.()}
      testID={`${modalTestID}-sheet`}
      style={{ width: "100%", alignSelf: "stretch" }}
    >
      {content}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View
        style={StyleSheet.absoluteFill}
        accessibilityViewIsModal
        testID={`${modalTestID}-root`}
      >
        <View className={isDark ? "dark" : ""} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            accessibilityLabel="Dismiss modal backdrop"
            onPress={onClose}
            testID={`${modalTestID}-backdrop`}
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          />
          {keyboardAvoiding ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1, justifyContent: "flex-end" }}
              pointerEvents="box-none"
            >
              {sheet}
            </KeyboardAvoidingView>
          ) : (
            sheet
          )}
        </View>
      </View>
    </Modal>
  );
}
