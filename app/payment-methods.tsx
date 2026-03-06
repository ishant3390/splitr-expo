import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Shield,
  Sparkles,
  Bell,
  CheckCircle2,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

const FEATURES = [
  {
    icon: CreditCard,
    title: "Link Cards & Banks",
    description: "Add your debit or credit card for instant settlements",
    color: "#0d9488",
    bg: "bg-primary/10",
  },
  {
    icon: Smartphone,
    title: "Pay Friends Instantly",
    description: "Send money directly from the app with one tap",
    color: "#8b5cf6",
    bg: "bg-violet-100 dark:bg-violet-900",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "256-bit encryption with PCI DSS compliance",
    color: "#2563eb",
    bg: "bg-blue-100 dark:bg-blue-900",
  },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [notified, setNotified] = useState(false);

  const handleNotify = () => {
    hapticSuccess();
    setNotified(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-3 pb-4 border-b border-border">
        <Pressable
          onPress={() => { hapticLight(); router.back(); }}
          className="w-10 h-10 rounded-full bg-muted items-center justify-center"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-xl font-sans-bold text-foreground">Payment Methods</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-6 gap-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <Card className="p-6 bg-primary border-0 overflow-hidden">
            <View className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <View className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

            {/* Coming Soon Badge */}
            <View className="flex-row items-center gap-1.5 mb-5">
              <View className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-white/20">
                <Sparkles size={12} color="#ffffff" />
                <Text className="text-xs font-sans-semibold text-white">Coming Soon</Text>
              </View>
            </View>

            {/* Faux Card Visual */}
            <View className="bg-white/15 rounded-2xl p-5 mb-4">
              <View className="flex-row justify-between items-start mb-8">
                <View className="w-10 h-7 rounded bg-white/30" />
                <Text className="text-xs font-sans-semibold text-white/60">SPLITR</Text>
              </View>
              <Text className="text-lg font-sans-medium text-white/50 tracking-[4px] mb-3">
                XXXX  XXXX  XXXX  XXXX
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-xs text-white/40 font-sans">YOUR NAME</Text>
                <Text className="text-xs text-white/40 font-sans">XX/XX</Text>
              </View>
            </View>

            <Text className="text-base font-sans-bold text-white">
              Payments are on the way
            </Text>
            <Text className="text-sm text-white/70 font-sans mt-1">
              Soon you'll be able to settle up instantly, right from Splitr.
            </Text>
          </Card>
        </Animated.View>

        {/* Feature Preview */}
        <View className="gap-3">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Animated.View
                key={idx}
                entering={FadeInDown.delay(200 + idx * 100).duration(400).springify()}
              >
                <Card className="p-4">
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full ${feature.bg} items-center justify-center`}>
                      <Icon size={20} color={feature.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-sans-semibold text-card-foreground">
                        {feature.title}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {feature.description}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>

        {/* Notify CTA */}
        <Animated.View entering={FadeInDown.delay(550).duration(400).springify()}>
          {notified ? (
            <Animated.View entering={FadeIn.duration(300)}>
              <Card className="p-5 items-center gap-3 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={32} color="#10b981" />
                <Text className="text-sm font-sans-semibold text-emerald-800 dark:text-emerald-200">
                  You're on the list!
                </Text>
                <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-sans text-center">
                  We'll notify you as soon as payments are available.
                </Text>
              </Card>
            </Animated.View>
          ) : (
            <Pressable
              onPress={handleNotify}
              className="items-center gap-2 py-4 rounded-2xl bg-primary active:opacity-80"
            >
              <View className="flex-row items-center gap-2">
                <Bell size={18} color="#ffffff" />
                <Text className="text-base font-sans-semibold text-primary-foreground">
                  Notify Me When Available
                </Text>
              </View>
              <Text className="text-xs text-primary-foreground/60 font-sans">
                Be the first to know
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
