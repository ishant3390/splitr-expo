import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { Users, Receipt, HandCoins, Sparkles, Coins } from "lucide-react-native";
import { hapticLight, hapticSuccess, hapticSelection } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { SHADOWS } from "@/lib/shadows";
import { colors, radius, palette } from "@/lib/tokens";
import { useColorScheme } from "nativewind";
import { CURRENCIES, detectDefaultCurrency } from "@/lib/currencies";
import { usersApi } from "@/lib/api";

export const ONBOARDING_KEY = "@splitr/onboarding_complete";

interface OnboardingStep {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
}

/** Index of the currency selection step. */
const CURRENCY_STEP_INDEX = 1;

const STEPS: OnboardingStep[] = [
  {
    icon: Sparkles,
    iconColor: palette.teal600,
    iconBg: palette.teal100,
    title: "Welcome to Splitr",
    subtitle:
      "The easiest way to split expenses with friends, roommates, and travel buddies. No more awkward money conversations.",
  },
  {
    icon: Coins,
    iconColor: palette.teal600,
    iconBg: palette.teal100,
    title: "Your Currency",
    subtitle:
      "We detected your default currency. You can change it anytime in your profile.",
  },
  {
    icon: Users,
    iconColor: palette.indigo500,
    iconBg: "#e0e7ff",
    title: "Create a Group",
    subtitle:
      "Start by creating a group for your trip, apartment, or any shared expense. Invite friends with a simple link.",
  },
  {
    icon: Receipt,
    iconColor: palette.amber500,
    iconBg: "#fef3c7",
    title: "Add Expenses",
    subtitle:
      "Log expenses as they happen. Choose who paid, split evenly or by custom amounts — Splitr handles the math.",
  },
  {
    icon: HandCoins,
    iconColor: palette.emerald500,
    iconBg: "#d1fae5",
    title: "Settle Up",
    subtitle:
      "See exactly who owes whom. Settle debts with one tap. Everyone stays on the same page.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState(() => detectDefaultCurrency());

  const step = STEPS[activeIndex];
  const Icon = step.icon;
  const isLast = activeIndex === STEPS.length - 1;
  const isCurrencyStep = activeIndex === CURRENCY_STEP_INDEX;

  const handleNext = () => {
    hapticLight();
    if (isLast) {
      completeOnboarding();
    } else {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleSkip = () => {
    hapticLight();
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    hapticSuccess();
    // Save selected currency to backend
    try {
      const token = await getToken();
      if (token) {
        await usersApi.updateMe({ defaultCurrency: selectedCurrency }, token);
      }
    } catch {
      // non-fatal — currency can be set later in profile
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={[`${step.iconBg}`, "transparent"] as string[]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        {/* Skip button */}
        <View className="flex-row justify-end px-5 pt-2">
          {!isLast ? (
            <Pressable onPress={handleSkip} testID="onboarding-skip">
              <Text className="text-sm font-sans-semibold text-muted-foreground">Skip</Text>
            </Pressable>
          ) : (
            <View style={{ height: 20 }} />
          )}
        </View>

        {/* Current step content */}
        <View className="flex-1 items-center justify-center px-8" key={activeIndex}>
          <Animated.View entering={FadeInDown.delay(100).duration(350).springify()}>
            <LinearGradient
              colors={[step.iconBg, `${step.iconColor}20`] as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: radius["2xl"],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 32,
                alignSelf: "center",
              }}
            >
              <Icon size={40} color={step.iconColor} />
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(350).springify()}>
            <Text className="text-2xl font-sans-bold text-foreground text-center mb-3">
              {step.title}
            </Text>
            <Text className="text-base font-sans text-muted-foreground text-center leading-relaxed max-w-xs">
              {step.subtitle}
            </Text>
          </Animated.View>

          {/* Currency picker for the currency step */}
          {isCurrencyStep && (
            <Animated.View entering={FadeInUp.delay(350).duration(350).springify()} className="mt-8 w-full max-w-xs">
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
                <View className="flex-row flex-wrap justify-center gap-2.5">
                  {CURRENCIES.map((curr) => {
                    const isSelected = curr.code === selectedCurrency;
                    return (
                      <Pressable
                        key={curr.code}
                        onPress={() => { hapticSelection(); setSelectedCurrency(curr.code); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${curr.code}`}
                        testID={`currency-${curr.code}`}
                        className="rounded-xl px-4 py-3 items-center"
                        style={{
                          backgroundColor: isSelected ? palette.teal600 : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                          minWidth: 90,
                        }}
                      >
                        <Text className="text-lg mb-0.5">{curr.flag}</Text>
                        <Text
                          className="text-sm font-sans-bold"
                          style={{ color: isSelected ? palette.white : c.foreground }}
                        >
                          {curr.code}
                        </Text>
                        <Text
                          className="text-xs font-sans"
                          style={{ color: isSelected ? "rgba(255,255,255,0.7)" : c.mutedForeground }}
                        >
                          {curr.symbol}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </View>

        {/* Bottom controls */}
        <View className="px-8 pb-6">
          {/* Dots */}
          <View className="flex-row items-center justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <View
                key={i}
                testID={`onboarding-dot-${i}`}
                className={`rounded-full ${
                  i === activeIndex ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30"
                }`}
                style={i === activeIndex ? SHADOWS.glowTeal : undefined}
              />
            ))}
          </View>

          {/* Next / Get Started */}
          <Pressable
            onPress={handleNext}
            testID="onboarding-next"
            className="w-full rounded-xl bg-primary py-4 items-center"
          >
            <Text className="text-base font-sans-semibold text-primary-foreground">
              {isLast ? "Get Started" : "Next"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
