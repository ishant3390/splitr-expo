import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { useColorScheme } from "nativewind";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: c.card,
            borderRadius: radius.xl,
            borderCurve: "continuous" as any,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: fs.xl, fontFamily: ff.bold, color: c.foreground, marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: fs.md, fontFamily: ff.regular, color: c.mutedForeground, marginBottom: 24, lineHeight: 20 }}>
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: radius.md,
                backgroundColor: c.muted,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: fs.md, fontFamily: ff.semibold, color: c.mutedForeground }}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: radius.md,
                backgroundColor: destructive ? c.destructive : c.primary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: fs.md, fontFamily: ff.semibold, color: palette.white }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
