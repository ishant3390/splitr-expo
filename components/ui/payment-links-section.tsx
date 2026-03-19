import React from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ExternalLink } from "lucide-react-native";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getPaymentMethodIcon } from "@/lib/category-icons";
import {
  buildPaymentLink,
  openPaymentLink,
  PROVIDER_INFO,
  type PaymentProvider,
} from "@/lib/payment-links";
import type { PaymentHandles } from "@/lib/types";
import { hapticSelection } from "@/lib/haptics";
import { useToast } from "@/components/ui/toast";
import { colors, radius } from "@/lib/tokens";

interface PaymentLinksSectionProps {
  providers: PaymentProvider[];
  creditorHandles: PaymentHandles;
  amount: number; // dollars
  currency: string;
  creditorName: string;
  onPaymentInitiated: (provider: PaymentProvider) => void;
  regionProviderCount?: number;
}

export function PaymentLinksSection({
  providers,
  creditorHandles,
  amount,
  currency,
  creditorName,
  onPaymentInitiated,
  regionProviderCount,
}: PaymentLinksSectionProps) {
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  if (providers.length === 0) return null;

  const handlePress = async (provider: PaymentProvider) => {
    hapticSelection();

    const result = buildPaymentLink(provider, creditorHandles, {
      amount,
      currency,
      creditorName,
    });

    // Show disclaimer for Cash App
    if (result.disclaimer && provider === "cashapp") {
      toast.info(result.disclaimer);
    }

    // Zelle: clipboard + toast
    if (provider === "zelle") {
      await openPaymentLink(result);
      toast.info("Copied! Open your banking app to send via Zelle.");
      onPaymentInitiated(provider);
      return;
    }

    const opened = await openPaymentLink(result);
    if (opened) {
      onPaymentInitiated(provider);
    }
  };

  const regionCount = regionProviderCount ?? providers.length;
  const regionProviders = providers.slice(0, regionCount);
  const otherProviders = providers.slice(regionCount);

  const renderPill = (provider: PaymentProvider) => {
    const info = PROVIDER_INFO[provider];
    const iconConfig = getPaymentMethodIcon(provider);
    return (
      <Pressable
        key={provider}
        onPress={() => handlePress(provider)}
        accessibilityRole="button"
        accessibilityLabel={`Pay with ${info.label}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.DEFAULT,
          borderWidth: 1.5,
          borderColor: c.border,
          backgroundColor: c.card,
        }}
      >
        <CategoryIcon config={iconConfig} size="sm" />
        <Text className="text-sm font-sans-medium text-foreground">
          {info.label}
        </Text>
        <ExternalLink
          size={12}
          color={c.mutedForeground}
        />
      </Pressable>
    );
  };

  // When no region providers match, show all providers flat under "Pay Directly"
  // (no misleading "Your other methods" separator above the only group)
  const showSeparator = regionCount > 0 && otherProviders.length > 0;

  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <Text className="text-xs font-sans-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Pay Directly
      </Text>
      {regionCount > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {regionProviders.map(renderPill)}
        </View>
      ) : null}
      {showSeparator ? (
        <Text className="text-xs font-sans text-muted-foreground mt-3 mb-2">
          Your other methods
        </Text>
      ) : null}
      {otherProviders.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {otherProviders.map(renderPill)}
        </View>
      ) : null}
    </Animated.View>
  );
}
