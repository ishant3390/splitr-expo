import React, { useState } from "react";
import { View, Text, ActivityIndicator, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, ImageIcon, ScanLine, RotateCcw } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function ReceiptScannerScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const toast = useToast();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Please allow access to your photo library.");
      return;
    }

    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (!pick.canceled && pick.assets[0]) {
      setImageUri(pick.assets[0].uri);
      setResult(null);
      if (pick.assets[0].base64) {
        scanReceipt(pick.assets[0].base64);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      toast.error("Please allow camera access to scan receipts.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!photo.canceled && photo.assets[0]) {
      setImageUri(photo.assets[0].uri);
      setResult(null);
      if (photo.assets[0].base64) {
        scanReceipt(photo.assets[0].base64);
      }
    }
  };

  const scanReceipt = async (base64: string) => {
    setScanning(true);
    try {
      // TODO: integrate real receipt scanning API when available
      await new Promise((resolve) => setTimeout(resolve, 1500)); // simulate processing
      setResult({
        items: [
          { name: "Burger", amount: 12.99 },
          { name: "Fries", amount: 4.99 },
          { name: "Soda", amount: 2.49 },
          { name: "Tax", amount: 1.64 },
        ],
        total: 22.11,
        merchant: "Joe's Diner",
        date: new Date().toISOString().split("T")[0],
      });
    } finally {
      setScanning(false);
    }
  };

  const handleCreateExpense = () => {
    if (result) {
      router.push({
        pathname: "/(tabs)/add",
        params: {
          amount: result.total?.toString(),
          description: result.merchant || "Scanned Receipt",
        },
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
        </Button>
        <Text className="flex-1 text-lg font-sans-semibold text-foreground">
          Scan Receipt
        </Text>
      </View>

      <View className="flex-1 px-5 pt-6">
        {!imageUri ? (
          // Capture options
          <View className="flex-1 items-center justify-center gap-6">
            <View className="w-24 h-24 rounded-3xl bg-primary/10 items-center justify-center">
              <ScanLine size={48} color="#0d9488" />
            </View>
            <View className="items-center">
              <Text className="text-xl font-sans-bold text-foreground mb-2">
                Scan a receipt
              </Text>
              <Text className="text-sm text-muted-foreground font-sans text-center max-w-[260px]">
                Take a photo or select from gallery and we will extract the items and total.
              </Text>
            </View>

            <View className="w-full gap-3 mt-4">
              <Button variant="default" size="lg" onPress={takePhoto} className="w-full">
                <View className="flex-row items-center gap-2">
                  <Camera size={20} color="#ffffff" />
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Take Photo
                  </Text>
                </View>
              </Button>
              <Button variant="outline" size="lg" onPress={pickImage} className="w-full">
                <View className="flex-row items-center gap-2">
                  <ImageIcon size={20} color={isDark ? "#f1f5f9" : "#0f172a"} />
                  <Text className="text-base font-sans-semibold text-foreground">
                    Choose from Gallery
                  </Text>
                </View>
              </Button>
            </View>
          </View>
        ) : (
          // Image preview + results
          <View className="flex-1 gap-4">
            <View className="h-48 rounded-xl overflow-hidden bg-muted">
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </View>

            {scanning ? (
              <View className="items-center py-8 gap-3">
                <ActivityIndicator size="large" color="#0d9488" />
                <Text className="text-base font-sans-medium text-foreground">
                  Scanning receipt...
                </Text>
                <Text className="text-sm text-muted-foreground font-sans">
                  Extracting items and amounts
                </Text>
              </View>
            ) : result ? (
              <View className="flex-1 gap-4">
                {/* Merchant & date */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-sans-bold text-foreground">
                    {result.merchant || "Receipt"}
                  </Text>
                  <Text className="text-sm text-muted-foreground font-sans">
                    {result.date}
                  </Text>
                </View>

                {/* Items */}
                <Card className="p-4 gap-2">
                  {result.items?.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      className={`flex-row items-center justify-between py-2 ${
                        idx < result.items.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <Text className="text-sm font-sans text-foreground">{item.name}</Text>
                      <Text className="text-sm font-sans-semibold text-foreground">
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}
                  <View className="flex-row items-center justify-between pt-3 border-t-2 border-foreground/20">
                    <Text className="text-base font-sans-bold text-foreground">Total</Text>
                    <Text className="text-base font-sans-bold text-primary">
                      {formatCurrency(result.total)}
                    </Text>
                  </View>
                </Card>

                {/* Actions */}
                <View className="gap-3 mt-auto pb-4">
                  <Button variant="default" size="lg" onPress={handleCreateExpense} className="w-full">
                    <Text className="text-base font-sans-semibold text-primary-foreground">
                      Create Expense from Receipt
                    </Text>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onPress={() => {
                      setImageUri(null);
                      setResult(null);
                    }}
                    className="w-full"
                  >
                    <View className="flex-row items-center gap-2">
                      <RotateCcw size={18} color={isDark ? "#f1f5f9" : "#0f172a"} />
                      <Text className="text-base font-sans-medium text-foreground">
                        Scan Another
                      </Text>
                    </View>
                  </Button>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
