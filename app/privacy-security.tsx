import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Fingerprint,
  Trash2,
  ExternalLink,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { hapticLight, hapticError } from "@/lib/haptics";

const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All data is encrypted in transit using TLS 1.3 and at rest with AES-256 encryption.",
    color: "#0d9488",
    bg: "bg-primary/10",
  },
  {
    icon: Fingerprint,
    title: "Biometric Authentication",
    description: "Secure your account with Face ID or fingerprint authentication via your device settings.",
    color: "#8b5cf6",
    bg: "bg-violet-100 dark:bg-violet-900",
  },
  {
    icon: Shield,
    title: "Secure Sign-In",
    description: "Powered by Clerk with industry-standard OAuth 2.0. We never store your passwords.",
    color: "#2563eb",
    bg: "bg-blue-100 dark:bg-blue-900",
  },
  {
    icon: Eye,
    title: "Privacy First",
    description: "We never sell your data to third parties. Your financial information stays private.",
    color: "#059669",
    bg: "bg-emerald-100 dark:bg-emerald-900",
  },
];

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const toast = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    hapticError();
    toast.info("Please email support@splitr.app to request account deletion. We'll process it within 48 hours.");
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-5 pt-3 pb-4 border-b border-border">
          <Pressable
            onPress={() => { hapticLight(); router.back(); }}
            className="w-10 h-10 rounded-full bg-muted items-center justify-center"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <Text className="text-xl font-sans-bold text-foreground">Privacy & Security</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-5 gap-6 pb-10"
          showsVerticalScrollIndicator={false}
        >
          {/* Security Features */}
          <View>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              How We Protect Your Data
            </Text>
            <View className="gap-3">
              {SECURITY_FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <Animated.View
                    key={idx}
                    entering={FadeInDown.delay(idx * 80).duration(400).springify()}
                  >
                    <Card className="p-4">
                      <View className="flex-row items-start gap-3">
                        <View className={`w-10 h-10 rounded-full ${feature.bg} items-center justify-center mt-0.5`}>
                          <Icon size={20} color={feature.color} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-sans-semibold text-card-foreground">
                            {feature.title}
                          </Text>
                          <Text className="text-xs text-muted-foreground font-sans mt-1 leading-4">
                            {feature.description}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* Links */}
          <Animated.View entering={FadeInDown.delay(350).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              Legal
            </Text>
            <Card className="overflow-hidden">
              <Pressable
                onPress={() => { hapticLight(); Linking.openURL("https://splitr.app/privacy"); }}
                className="flex-row items-center justify-between p-4 border-b border-border"
              >
                <Text className="text-sm font-sans-medium text-card-foreground">Privacy Policy</Text>
                <ExternalLink size={16} color="#94a3b8" />
              </Pressable>
              <Pressable
                onPress={() => { hapticLight(); Linking.openURL("https://splitr.app/terms"); }}
                className="flex-row items-center justify-between p-4"
              >
                <Text className="text-sm font-sans-medium text-card-foreground">Terms of Service</Text>
                <ExternalLink size={16} color="#94a3b8" />
              </Pressable>
            </Card>
          </Animated.View>

          {/* Danger Zone */}
          <Animated.View entering={FadeInDown.delay(450).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              Account
            </Text>
            <Card className="p-4 border-destructive/20">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-destructive/10 items-center justify-center">
                  <Trash2 size={18} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-semibold text-card-foreground">
                    Delete Account
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    Permanently delete your account and all data
                  </Text>
                </View>
                <Pressable
                  onPress={() => { hapticLight(); setShowDeleteModal(true); }}
                  className="px-4 py-2 rounded-lg bg-destructive/10"
                >
                  <Text className="text-xs font-sans-semibold text-destructive">Delete</Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Account"
        message="This action is irreversible. All your data, groups, and expense history will be permanently deleted. Are you sure?"
        confirmLabel="Yes, Delete My Account"
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
