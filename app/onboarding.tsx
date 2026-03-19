import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Users, Receipt, HandCoins, Sparkles } from "lucide-react-native";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { SHADOWS } from "@/lib/shadows";
import { radius, palette } from "@/lib/tokens";

export const ONBOARDING_KEY = "@splitr/onboarding_complete";

interface OnboardingStep {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
}

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
  const [activeIndex, setActiveIndex] = useState(0);

  const step = STEPS[activeIndex];
  const Icon = step.icon;
  const isLast = activeIndex === STEPS.length - 1;

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
