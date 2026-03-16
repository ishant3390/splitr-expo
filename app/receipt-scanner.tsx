import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Platform,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  ScanText,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  MessageSquare,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { expensesApi } from "@/lib/api";
import { hapticSuccess, hapticWarning } from "@/lib/haptics";
import type { ReceiptScanResultDto, ReceiptScanResponseDto } from "@/lib/types";

/** Animated scan line that sweeps vertically over the receipt image */
function ScanAnimation() {
  const translateY = useSharedValue(-10);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(180, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      false
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        lineStyle,
        {
          position: "absolute",
          left: 12,
          right: 12,
          height: 2,
          backgroundColor: "#0d9488",
          borderRadius: 1,
          shadowColor: "#0d9488",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
        },
      ]}
    />
  );
}

/** Pulsing dots for processing state */
function ProcessingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    dot2.value = withRepeat(withSequence(withTiming(0.3, { duration: 200 }), withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    dot3.value = withRepeat(withSequence(withTiming(0.3, { duration: 400 }), withTiming(0.3, { duration: 200 }), withTiming(1, { duration: 400 })), -1, false);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {([s1, s2, s3] as const).map((s, i) => (
        <Animated.View
          key={`dot-${i}`}
          style={[s, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0d9488" }]}
        />
      ))}
    </View>
  );
}

/** Confidence badge */
function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.9) return null; // High confidence — no badge needed
  const isLow = score < 0.7;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: isLow ? "#fef2f2" : "#fffbeb",
      }}
    >
      <AlertTriangle size={10} color={isLow ? "#ef4444" : "#f59e0b"} />
      <Text style={{ fontSize: 10, color: isLow ? "#ef4444" : "#f59e0b", fontFamily: "Inter_500Medium" }}>
        Verify
      </Text>
    </View>
  );
}

export default function ReceiptScannerScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceiptScanResultDto | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  const captureImage = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        toast.error("Please allow camera access to scan receipts.");
        return;
      }
      const photo = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        base64: true,
      });
      if (!photo.canceled && photo.assets[0]) {
        processImage(photo.assets[0].uri, photo.assets[0].base64!);
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.error("Please allow access to your photo library.");
        return;
      }
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        base64: true,
      });
      if (!pick.canceled && pick.assets[0]) {
        processImage(pick.assets[0].uri, pick.assets[0].base64!);
      }
    }
  };

  const processImage = async (uri: string, base64: string) => {
    setImageUri(uri);
    setResult(null);
    setScanError(null);
    setScanning(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const response: ReceiptScanResponseDto = await expensesApi.scanReceipt(base64, token);
      setResult(response.receipt);
      setQuota({ used: response.dailyScansUsed, limit: response.dailyScanLimit });
      hapticSuccess();
    } catch (err: any) {
      setScanError(err?.message || "Failed to scan receipt. Please try again.");
      hapticWarning();
    } finally {
      setScanning(false);
    }
  };

  const handleCreateExpense = () => {
    if (!result) return;
    const amount = result.totalCents / 100;
    router.push({
      pathname: "/(tabs)/add",
      params: {
        amount: amount.toString(),
        description: result.merchant || "Scanned Receipt",
        ...(result.date ? { date: result.date } : {}),
      },
    });
  };

  // B34: Build natural language message from receipt and open chat
  const handleSplitViaChat = () => {
    if (!result) return;
    const amount = (result.totalCents / 100).toFixed(2);
    const merchant = result.merchant || "a receipt";
    let msg = `Split $${amount} from ${merchant}`;
    if (result.date) msg += ` on ${result.date}`;
    if (result.lineItems && result.lineItems.length > 0) {
      const maxItems = 5;
      const items = result.lineItems.slice(0, maxItems).map(
        (item) => `${item.description} $${(item.amountCents / 100).toFixed(2)}`
      );
      msg += `. Items: ${items.join(", ")}`;
      if (result.lineItems.length > maxItems) {
        msg += ` and ${result.lineItems.length - maxItems} more`;
      }
    }
    router.push({ pathname: "/chat", params: { receiptMessage: msg } });
  };

  const handleReset = () => {
    setImageUri(null);
    setResult(null);
    setScanError(null);
  };

  const iconColor = isDark ? "#f1f5f9" : "#0f172a";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color={iconColor} />
        </Button>
        <Text className="flex-1 text-lg font-sans-semibold text-foreground">
          Scan Receipt
        </Text>
      </View>

      {!imageUri ? (
        /* ---- Capture Screen ---- */
        <View className="flex-1 items-center justify-center px-5 gap-6">
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
            <View className="w-24 h-24 rounded-3xl bg-primary/10 items-center justify-center">
              <ScanText size={48} color="#0d9488" />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
            <View className="items-center">
              <Text className="text-xl font-sans-bold text-foreground mb-2">
                Scan a Receipt
              </Text>
              <Text className="text-sm text-muted-foreground font-sans text-center max-w-[280px]">
                Take a photo or select from your gallery. We'll read the merchant, total, and line items automatically.
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} className="w-full gap-3 mt-4">
            {Platform.OS !== "web" && (
              <Button variant="default" size="lg" onPress={() => captureImage(true)} className="w-full">
                <View className="flex-row items-center gap-2">
                  <Camera size={20} color="#ffffff" />
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Take Photo
                  </Text>
                </View>
              </Button>
            )}
            <Button variant="outline" size="lg" onPress={() => captureImage(false)} className="w-full">
              <View className="flex-row items-center gap-2">
                <ImageIcon size={20} color={iconColor} />
                <Text className="text-base font-sans-semibold text-foreground">
                  Choose from Gallery
                </Text>
              </View>
            </Button>
          </Animated.View>
        </View>
      ) : (
        /* ---- Results Screen ---- */
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Receipt image with scan overlay */}
          <View className="rounded-xl overflow-hidden bg-muted mb-4" style={{ height: 200 }}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
            {scanning && <ScanAnimation />}
            {result && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "#10b981",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CheckCircle2 size={14} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                  Scanned
                </Text>
              </View>
            )}
          </View>

          {scanning && (
            /* ---- Scanning State ---- */
            <Animated.View entering={FadeInDown.duration(300).springify()} className="items-center py-6 gap-4">
              <ProcessingDots />
              <Text className="text-base font-sans-medium text-foreground">
                Reading receipt...
              </Text>
              <Text className="text-sm text-muted-foreground font-sans text-center">
                Extracting merchant, items, and total
              </Text>
            </Animated.View>
          )}

          {scanError && (
            /* ---- Error State ---- */
            <Animated.View entering={FadeInDown.duration(300).springify()}>
              <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 mb-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <AlertTriangle size={18} color="#ef4444" />
                  <Text className="text-sm font-sans-semibold text-red-800 dark:text-red-200">
                    Scan Failed
                  </Text>
                </View>
                <Text className="text-sm text-red-600 dark:text-red-400 font-sans">
                  {scanError}
                </Text>
              </Card>
              <View className="gap-3">
                <Button variant="default" size="lg" onPress={() => processImage(imageUri!, "")} className="w-full">
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Try Again
                  </Text>
                </Button>
                <Button variant="outline" size="lg" onPress={handleReset} className="w-full">
                  <View className="flex-row items-center gap-2">
                    <RotateCcw size={18} color={iconColor} />
                    <Text className="text-base font-sans-medium text-foreground">
                      New Photo
                    </Text>
                  </View>
                </Button>
              </View>
            </Animated.View>
          )}

          {result && (
            /* ---- Results ---- */
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              {/* Merchant & date header */}
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-sans-bold text-foreground">
                      {result.merchant || "Receipt"}
                    </Text>
                    {result.confidence.merchant < 0.9 && (
                      <ConfidenceBadge score={result.confidence.merchant} />
                    )}
                  </View>
                  {result.date && (
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-sm text-muted-foreground font-sans">
                        {result.date}
                      </Text>
                      {result.confidence.date < 0.9 && (
                        <ConfidenceBadge score={result.confidence.date} />
                      )}
                    </View>
                  )}
                </View>
                {result.currency && (
                  <View className="bg-muted rounded-lg px-2 py-1">
                    <Text className="text-xs font-sans-semibold text-muted-foreground">
                      {result.currency}
                    </Text>
                  </View>
                )}
              </View>

              {/* Line items */}
              {result.lineItems.length > 0 && (
                <Card className="p-4 gap-1 mb-3">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Receipt size={14} color="#94a3b8" />
                    <Text className="text-xs font-sans-semibold text-muted-foreground uppercase tracking-wide">
                      Items ({result.lineItems.length})
                    </Text>
                    {result.confidence.lineItems < 0.9 && (
                      <ConfidenceBadge score={result.confidence.lineItems} />
                    )}
                  </View>
                  {result.lineItems.map((item, idx) => (
                    <View
                      key={`${item.description}-${idx}`}
                      className={`flex-row items-center justify-between py-2 ${
                        idx < result.lineItems.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <Text className="flex-1 text-sm font-sans text-foreground mr-3" numberOfLines={1}>
                        {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ""}
                        {item.description}
                      </Text>
                      <Text className="text-sm font-sans-semibold text-foreground">
                        {formatCents(item.amountCents, result.currency || "USD")}
                      </Text>
                    </View>
                  ))}
                </Card>
              )}

              {/* Totals */}
              <Card className="p-4 mb-4">
                {result.subtotalCents != null && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-sm text-muted-foreground font-sans">Subtotal</Text>
                    <Text className="text-sm text-foreground font-sans">
                      {formatCents(result.subtotalCents, result.currency || "USD")}
                    </Text>
                  </View>
                )}
                {result.taxCents != null && result.taxCents > 0 && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-sm text-muted-foreground font-sans">Tax</Text>
                    <Text className="text-sm text-foreground font-sans">
                      {formatCents(result.taxCents, result.currency || "USD")}
                    </Text>
                  </View>
                )}
                {result.tipCents != null && result.tipCents > 0 && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-sm text-muted-foreground font-sans">Tip</Text>
                    <Text className="text-sm text-foreground font-sans">
                      {formatCents(result.tipCents, result.currency || "USD")}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center justify-between pt-2 mt-1 border-t-2 border-foreground/20">
                  <Text className="text-base font-sans-bold text-foreground">Total</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-sans-bold text-primary">
                      {formatCents(result.totalCents, result.currency || "USD")}
                    </Text>
                    {result.confidence.total < 0.9 && (
                      <ConfidenceBadge score={result.confidence.total} />
                    )}
                  </View>
                </View>
              </Card>

              {/* Overall confidence */}
              {result.confidence.overall < 0.8 && (
                <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-950 rounded-lg px-3 py-2 mb-4">
                  <AlertTriangle size={14} color="#f59e0b" />
                  <Text className="text-xs text-amber-700 dark:text-amber-300 font-sans flex-1">
                    Some fields have low confidence. Please verify the details before creating the expense.
                  </Text>
                </View>
              )}

              {/* Quota info */}
              {quota && (
                <View className="flex-row items-center justify-center mb-4">
                  <Text className="text-xs text-muted-foreground font-sans">
                    {quota.used} of {quota.limit} free scans used today
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View className="gap-3">
                <Button variant="default" size="lg" onPress={handleCreateExpense} className="w-full">
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Create Expense
                  </Text>
                </Button>
                <Button variant="outline" size="lg" onPress={handleSplitViaChat} className="w-full">
                  <View className="flex-row items-center gap-2">
                    <MessageSquare size={18} color={iconColor} />
                    <Text className="text-base font-sans-medium text-foreground">
                      Split via Chat
                    </Text>
                  </View>
                </Button>
                {quota && quota.used < quota.limit && (
                  <Button variant="outline" size="lg" onPress={handleReset} className="w-full">
                    <View className="flex-row items-center gap-2">
                      <RotateCcw size={18} color={iconColor} />
                      <Text className="text-base font-sans-medium text-foreground">
                        Scan Another
                      </Text>
                    </View>
                  </Button>
                )}
                {quota && quota.used >= quota.limit && (
                  <View className="items-center py-2">
                    <Text className="text-xs text-muted-foreground font-sans">
                      Daily scan limit reached. Resets tomorrow.
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
