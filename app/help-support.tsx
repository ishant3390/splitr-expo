import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Mail, Globe, MessageCircle, Star } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { AccordionItem } from "@/components/ui/accordion-item";
import { hapticLight } from "@/lib/haptics";
import Constants from "expo-constants";

const FAQ_ITEMS = [
  {
    question: "How do I split an expense?",
    answer:
      "Tap the + button at the bottom, enter the amount and description, choose the group and who paid, then select how to split (equal, percentage, or fixed amounts).",
  },
  {
    question: "How do I settle up with someone?",
    answer:
      "Go to a group, tap 'Settle Up' to see suggested payments. You can record a payment to mark a debt as settled. The balances will update automatically.",
  },
  {
    question: "How do I invite friends to a group?",
    answer:
      "Open the group, tap the share icon in the header. You can share an invite link or show a QR code for others to scan. Anyone with the link can join the group.",
  },
  {
    question: "Can I use Splitr offline?",
    answer:
      "Yes! If you're offline, your expenses are saved locally and will sync automatically when you reconnect. You'll see a pending banner on the home screen.",
  },
  {
    question: "How are balances calculated?",
    answer:
      "Splitr tracks who paid and how expenses are split. Your balance shows the net of what you're owed vs what you owe across all groups. Settling up reduces these balances.",
  },
  {
    question: "Can I edit or delete an expense?",
    answer:
      "Yes. Tap any expense in a group to open it, then use the edit or delete options. All members will see the updated balances immediately.",
  },
];

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    label: "Email Support",
    subtitle: "support@splitr.app",
    onPress: () => Linking.openURL("mailto:support@splitr.app"),
  },
  {
    icon: Globe,
    label: "Visit Website",
    subtitle: "splitr.app",
    onPress: () => Linking.openURL("https://splitr.app"),
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-3 pb-4 border-b border-border">
        <Pressable
          onPress={() => { hapticLight(); router.back(); }}
          className="w-10 h-10 rounded-full bg-muted items-center justify-center"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-xl font-sans-bold text-foreground">Help & Support</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-5 gap-6 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <Text className="text-base font-sans-semibold text-foreground mb-3">
            Frequently Asked Questions
          </Text>
          <View className="gap-2">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem
                key={idx}
                title={item.question}
                expanded={expandedFaq === idx}
                onToggle={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                {item.answer}
              </AccordionItem>
            ))}
          </View>
        </Animated.View>

        {/* Contact Section */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
          <Text className="text-base font-sans-semibold text-foreground mb-3">
            Get in Touch
          </Text>
          <Card className="overflow-hidden">
            {CONTACT_OPTIONS.map((option, idx) => {
              const Icon = option.icon;
              return (
                <Pressable
                  key={idx}
                  onPress={() => { hapticLight(); option.onPress(); }}
                  className={`flex-row items-center gap-3 p-4 ${
                    idx < CONTACT_OPTIONS.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                    <Icon size={18} color="#0d9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-medium text-card-foreground">{option.label}</Text>
                    <Text className="text-xs text-muted-foreground font-sans">{option.subtitle}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </Animated.View>

        {/* Rate Us */}
        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
          <Card className="p-5 items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center">
              <Star size={22} color="#f59e0b" />
            </View>
            <Text className="text-sm font-sans-semibold text-card-foreground">Enjoying Splitr?</Text>
            <Text className="text-xs text-muted-foreground font-sans text-center">
              Rate us on the App Store to help others discover Splitr
            </Text>
            <Pressable
              onPress={() => hapticLight()}
              className="px-6 py-2.5 rounded-full bg-primary"
            >
              <Text className="text-sm font-sans-semibold text-primary-foreground">Rate 5 Stars</Text>
            </Pressable>
          </Card>
        </Animated.View>

        {/* App Info */}
        <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
          <View className="items-center gap-1 pt-4">
            <View className="w-10 h-10 rounded-xl bg-primary items-center justify-center mb-2">
              <Text className="text-lg font-sans-bold text-primary-foreground">S</Text>
            </View>
            <Text className="text-xs text-muted-foreground font-sans">
              Splitr v{appVersion}
            </Text>
            <Text className="text-xs text-muted-foreground font-sans">
              Made with care in India
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
