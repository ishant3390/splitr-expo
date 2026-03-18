import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Wallet, ChevronDown, ChevronUp } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useToast } from "@/components/ui/toast";
import { useUserProfile } from "@/lib/hooks";
import { usersApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { invalidateAfterProfileUpdate } from "@/lib/query";
import { hapticLight, hapticSuccess, hapticError, hapticSelection } from "@/lib/haptics";
import { getPaymentMethodIcon } from "@/lib/category-icons";
import {
  CURRENCY_PROVIDERS,
  PROVIDER_INFO,
  validatePaymentHandle,
  normalizeHandle,
  type PaymentProvider,
} from "@/lib/payment-links";
import { colors, radius, palette } from "@/lib/tokens";
import type { PaymentHandles } from "@/lib/types";

const ALL_PROVIDERS: PaymentProvider[] = [
  "venmo", "paypal", "cashapp", "zelle", "upi", "revolut", "monzo",
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const { data: currentUser } = useUserProfile();

  const userCurrency = currentUser?.defaultCurrency?.toUpperCase() ?? "USD";
  const regionProviders = CURRENCY_PROVIDERS[userCurrency] ?? CURRENCY_PROVIDERS.USD;

  const [handles, setHandles] = useState<PaymentHandles>({});
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<PaymentProvider, string>>>({});

  // Pre-fill from user profile
  useEffect(() => {
    if (currentUser?.paymentHandles) {
      setHandles(currentUser.paymentHandles);
    }
  }, [currentUser?.paymentHandles]);

  const otherProviders = ALL_PROVIDERS.filter(
    (p) => !regionProviders.includes(p)
  );
  const visibleProviders = showAll
    ? [...regionProviders, ...otherProviders]
    : regionProviders;

  const updateHandle = (provider: PaymentProvider, value: string) => {
    const key = PROVIDER_INFO[provider].handleKey;
    setHandles((prev) => ({ ...prev, [key]: value }));
    // Clear error on edit
    if (errors[provider]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<PaymentProvider, string>> = {};
    // Only validate providers that have a non-empty value (covers hidden providers too)
    for (const provider of ALL_PROVIDERS) {
      const key = PROVIDER_INFO[provider].handleKey;
      const value = handles[key] ?? "";
      if (value.trim() && !validatePaymentHandle(provider, value)) {
        // If error is on a hidden provider, expand to show it
        if (!visibleProviders.includes(provider) && !showAll) {
          setShowAll(true);
        }
        newErrors[provider] = `Invalid ${PROVIDER_INFO[provider].label} format`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      hapticError();
      toast.error("Please fix the errors above.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      // Normalize all handles before saving
      const normalized: PaymentHandles = {};
      for (const provider of ALL_PROVIDERS) {
        const key = PROVIDER_INFO[provider].handleKey;
        const value = handles[key];
        if (value?.trim()) {
          (normalized as any)[key] = normalizeHandle(provider, value);
        }
      }
      await usersApi.updateMe({ paymentHandles: normalized }, token!);
      invalidateAfterProfileUpdate();
      hapticSuccess();
      toast.success("Payment methods saved!");
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to save payment methods.");
    } finally {
      setSaving(false);
    }
  };

  const renderProviderRow = (provider: PaymentProvider, idx: number) => {
    const info = PROVIDER_INFO[provider];
    const iconConfig = getPaymentMethodIcon(provider);
    const key = info.handleKey;
    const value = handles[key] ?? "";
    const error = errors[provider];

    return (
      <Animated.View
        key={provider}
        entering={FadeInDown.delay(100 + idx * 50).duration(300).springify()}
      >
        <Card className="p-4">
          <View className="flex-row items-center gap-3 mb-2">
            <CategoryIcon config={iconConfig} size="sm" />
            <Text className="text-sm font-sans-semibold text-card-foreground">
              {info.label}
            </Text>
          </View>
          <Input
            value={value}
            onChangeText={(v: string) => updateHandle(provider, v)}
            placeholder={info.placeholder}
            error={error}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={
            (isDark ? GRADIENTS.heroEmeraldDark : GRADIENTS.heroEmerald) as unknown as string[]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: "hidden" }}
        >
          {/* Watermark */}
          <View
            style={{
              position: "absolute",
              bottom: -30,
              right: -20,
              opacity: 0.06,
            }}
            pointerEvents="none"
          >
            <Wallet size={200} color={palette.white} strokeWidth={1} />
          </View>

          {/* Decorative orb */}
          <View
            style={{
              position: "absolute",
              top: -40,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            pointerEvents="none"
          />

          {/* Navigation */}
          <View className="flex-row items-center px-4 pt-3 pb-2">
            <Pressable
              onPress={() => {
                hapticLight();
                router.back();
              }}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={palette.white} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Title */}
          <View className="px-5 pt-1 pb-5">
            <Text
              className="text-2xl font-sans-bold"
              style={{ color: palette.white }}
            >
              Payment Methods
            </Text>
            <Text
              className="text-sm font-sans mt-1"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Add your handles so friends can pay you directly
            </Text>
          </View>
        </LinearGradient>

        {/* Provider rows */}
        <View className="px-5 pt-4 gap-3">
          <Text className="text-xs font-sans-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {userCurrency} Region
          </Text>
          {regionProviders.map((p, idx) => renderProviderRow(p, idx))}

          {/* Show all toggle */}
          {otherProviders.length > 0 && (
            <Pressable
              onPress={() => {
                hapticSelection();
                setShowAll(!showAll);
              }}
              className="flex-row items-center justify-center gap-1.5 py-3"
              accessibilityRole="button"
            >
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {showAll ? "Show fewer" : "Show all payment methods"}
              </Text>
              {showAll ? (
                <ChevronUp
                  size={14}
                  color={c.mutedForeground}
                />
              ) : (
                <ChevronDown
                  size={14}
                  color={c.mutedForeground}
                />
              )}
            </Pressable>
          )}

          {/* Other region providers */}
          {showAll && (
            <>
              <Text className="text-xs font-sans-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Other Regions
              </Text>
              {otherProviders.map((p, idx) =>
                renderProviderRow(p, regionProviders.length + idx)
              )}
            </>
          )}

          {/* Save button */}
          <Button
            variant="default"
            size="lg"
            onPress={handleSave}
            disabled={saving}
            className="mt-2"
          >
            {saving ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <Text className="text-base font-sans-bold text-primary-foreground">
                Save Payment Methods
              </Text>
            )}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
