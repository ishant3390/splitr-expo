import React from "react";
import { View, Text, Pressable, Modal } from "react-native";

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
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#0f172a", marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748b", marginBottom: 24, lineHeight: 20 }}>
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#f1f5f9",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#64748b" }}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: destructive ? "#ef4444" : "#0d9488",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#ffffff" }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
