import React from "react";
import { View, Text } from "react-native";
import { useColorScheme } from "nativewind";
import QRCode from "react-native-qrcode-svg";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { radius, palette } from "@/lib/tokens";

interface UpiQrModalProps {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
  upiUri: string;
  creditorName: string;
  amount: string;
}

export function UpiQrModal({
  visible,
  onClose,
  onDone,
  upiUri,
  creditorName,
  amount,
}: UpiQrModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      {/* Drag handle */}
      <View className="items-center -mt-2 mb-4">
        <View
          style={{ width: 36, height: 4, borderRadius: 2 }}
          className="bg-border"
        />
      </View>

      <View className="items-center gap-4 pb-4">
        <Text className="text-lg font-sans-bold text-foreground">
          Scan to pay {creditorName}
        </Text>

        <View
          style={{
            padding: 16,
            borderRadius: radius.lg,
            backgroundColor: palette.white,
          }}
        >
          <QRCode value={upiUri} size={200} />
        </View>

        <Text className="text-2xl font-sans-bold text-foreground">
          {amount}
        </Text>

        <Text className="text-sm text-muted-foreground font-sans text-center px-6">
          Open any UPI app and scan this QR code to complete the payment
        </Text>

        <Button variant="default" size="lg" onPress={onDone} className="w-full mt-2">
          <Text className="text-base font-sans-bold text-primary-foreground">
            Done
          </Text>
        </Button>
      </View>
    </BottomSheetModal>
  );
}
