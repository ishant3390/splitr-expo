import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { ArrowLeft, Save } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { usersApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { getInitials } from "@/lib/utils";
import type { UserDto, UpdateUserRequest } from "@/lib/types";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"];

export default function EditProfileScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");

  const goBack = () => {
    router.canGoBack() ? router.back() : router.replace("/(tabs)/profile");
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const me = await usersApi.me(token!);
        setName(me.name ?? "");
        setPhone(me.phone ?? "");
        setCurrency(me.defaultCurrency ?? "USD");
      } catch {
        // use clerk defaults
        setName(clerkUser?.fullName ?? "");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\+?[\d\s\-()]{7,20}$/.test(trimmedPhone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const data: UpdateUserRequest = {
        name: name.trim(),
        phone: trimmedPhone || undefined,
        defaultCurrency: currency,
      };
      await usersApi.updateMe(data, token!);
      toast.success("Your profile has been updated.");
      goBack();
    } catch (err: any) {
      toast.error("Something went wrong. Try again later.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0d9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-5 py-3 gap-3">
          <Pressable onPress={goBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
          </Pressable>
          <Text className="text-xl font-sans-bold text-foreground flex-1">
            Edit Profile
          </Text>
          <Pressable onPress={handleSave} disabled={saving} className="p-2">
            <Save size={22} color={saving ? "#94a3b8" : "#0d9488"} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 gap-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View className="items-center py-4">
            <Avatar
              src={clerkUser?.imageUrl}
              fallback={getInitials(name || "?")}
              size="lg"
            />
            <Text className="text-sm text-muted-foreground mt-2 font-sans">
              Photo managed by Clerk
            </Text>
          </View>

          {/* Form */}
          <Card className="p-4 gap-4">
            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">Name</Text>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">Email</Text>
              <View className="bg-muted rounded-xl px-4 py-3">
                <Text className="text-sm text-muted-foreground font-sans">
                  {clerkUser?.primaryEmailAddress?.emailAddress ?? "—"}
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground font-sans">
                Email is managed by your auth provider
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">Phone</Text>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-sans-medium text-foreground">
                Default Currency
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCurrency(c)}
                    className={`px-4 py-2 rounded-lg border ${
                      currency === c
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-sans-medium ${
                        currency === c ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          <Button onPress={handleSave} disabled={saving} className="mt-2">
            <Text className="text-base font-sans-semibold text-primary-foreground">
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
