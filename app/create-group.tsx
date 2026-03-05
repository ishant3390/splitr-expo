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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { usersApi } from "@/lib/api";
import {
  ArrowLeft,
  X,
  UserPlus,
  Users,
  Mail,
  Plane,
  Home,
  Heart,
  Utensils,
  Briefcase,
  GraduationCap,
  PartyPopper,
  Car,
  Music,
  Dumbbell,
  type LucideIcon,
} from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { groupsApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";
import type { CreateGroupRequest, AddGuestMemberRequest } from "@/lib/types";

// Group types — much richer than Splitwise's 4 icons
const GROUP_TYPES = [
  { key: "trip", label: "Trip", emoji: "✈️", icon: Plane, color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "home", label: "Home", emoji: "🏠", icon: Home, color: "#8b5cf6", bg: "#ede9fe" },
  { key: "couple", label: "Couple", emoji: "❤️", icon: Heart, color: "#ef4444", bg: "#fee2e2" },
  { key: "food", label: "Dinners", emoji: "🍕", icon: Utensils, color: "#f59e0b", bg: "#fef3c7" },
  { key: "work", label: "Work", emoji: "💼", icon: Briefcase, color: "#64748b", bg: "#f1f5f9" },
  { key: "school", label: "School", emoji: "🎓", icon: GraduationCap, color: "#06b6d4", bg: "#cffafe" },
  { key: "party", label: "Party", emoji: "🎉", icon: PartyPopper, color: "#d946ef", bg: "#fae8ff" },
  { key: "roadtrip", label: "Road Trip", emoji: "🚗", icon: Car, color: "#10b981", bg: "#d1fae5" },
  { key: "event", label: "Event", emoji: "🎵", icon: Music, color: "#ec4899", bg: "#fce7f3" },
  { key: "fitness", label: "Fitness", emoji: "💪", icon: Dumbbell, color: "#f97316", bg: "#ffedd5" },
] as const;

// Group emoji picker — user picks a fun avatar for the group
const GROUP_EMOJIS = [
  "✈️", "🏠", "❤️", "🍕", "🎉", "🚗", "⛷️", "🏖️", "🎮", "🍺",
  "☕", "🎵", "🏕️", "🛒", "💼", "🎓", "🏋️", "🎭", "🎪", "⚽",
  "🎂", "🌮", "🍣", "🎯", "🏄", "⛺", "🎬", "🧑‍🍳", "🎸", "🏡",
];

// Currency options
const CURRENCIES = [
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "INR", symbol: "₹", flag: "🇮🇳" },
  { code: "CAD", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵" },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/groups");
  const { getToken } = useAuth();
  const toast = useToast();

  const [groupName, setGroupName] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("✈️");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load user's default currency
  useEffect(() => {
    const loadUserCurrency = async () => {
      try {
        const token = await getToken();
        const user = await usersApi.me(token!);
        if (user.defaultCurrency) {
          setSelectedCurrency(user.defaultCurrency);
        }
      } catch {
        // Fall back to USD
      }
    };
    loadUserCurrency();
  }, []);

  // Auto-suggest name placeholders based on type
  const namePlaceholder = (() => {
    switch (selectedType) {
      case "trip": return "e.g., Bali Trip 2026";
      case "home": return "e.g., Apartment 4B";
      case "couple": return "e.g., Us ❤️";
      case "food": return "e.g., Friday Dinners";
      case "work": return "e.g., Team Lunch Fund";
      case "school": return "e.g., Study Group";
      case "party": return "e.g., Jake's Birthday";
      case "roadtrip": return "e.g., Coast to Coast";
      case "event": return "e.g., Concert Weekend";
      case "fitness": return "e.g., Gym Buddies";
      default: return "e.g., Beach Trip 2026";
    }
  })();

  const handleSelectType = (key: string) => {
    hapticSelection();
    setSelectedType(key);
    const type = GROUP_TYPES.find((t) => t.key === key);
    if (type) setSelectedEmoji(type.emoji);
  };

  const handleInviteByEmail = () => {
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (invitedEmails.includes(inviteEmail.trim())) {
      toast.error("This email has already been added.");
      return;
    }
    setInvitedEmails((prev) => [...prev, inviteEmail.trim()]);
    setInviteEmail("");
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Please give your group a name.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();

      const group = await groupsApi.create(
        {
          name: groupName.trim(),
          groupType: selectedType ?? undefined,
          emoji: selectedEmoji,
          defaultCurrency: selectedCurrency,
        },
        token!
      );

      // Invite members by email as guests
      await Promise.all(
        invitedEmails.map((email) =>
          groupsApi.addGuestMember(
            group.id,
            { name: email, email } as AddGuestMemberRequest,
            token!
          )
        )
      );

      hapticSuccess();
      toast.success(`"${groupName}" created!`);
      router.replace(`/group/${group.id}`);
    } catch {
      hapticError();
      toast.error("Something went wrong. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeType = GROUP_TYPES.find((t) => t.key === selectedType);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onPress={goBack}>
            <ArrowLeft size={24} color="#0f172a" />
          </Button>
          <Text className="text-lg font-sans-semibold text-foreground">
            New Group
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleCreate}
            disabled={submitting || !groupName.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#0d9488" />
            ) : (
              <Text
                className={cn(
                  "text-base font-sans-semibold",
                  groupName.trim() ? "text-primary" : "text-muted-foreground"
                )}
              >
                Create
              </Text>
            )}
          </Button>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-6 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Group Avatar + Name */}
          <View className="items-center gap-4">
            <Pressable
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: activeType?.bg ?? "#f1f5f9",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: activeType?.color ?? "#e2e8f0",
              }}
            >
              <Text style={{ fontSize: 36 }}>{selectedEmoji}</Text>
            </Pressable>
            <Text className="text-xs text-muted-foreground font-sans">
              Tap to change icon
            </Text>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <Card className="p-3 w-full">
                <View className="flex-row flex-wrap gap-2 justify-center">
                  {GROUP_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        hapticLight();
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          selectedEmoji === emoji ? "#0d948815" : "transparent",
                        borderWidth: selectedEmoji === emoji ? 1.5 : 0,
                        borderColor: "#0d9488",
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            )}

            <Input
              placeholder={namePlaceholder}
              value={groupName}
              onChangeText={setGroupName}
              className="text-center text-lg font-sans-semibold"
            />
          </View>

          {/* Group Type Selector */}
          <View>
            <Text className="text-sm font-sans-semibold text-foreground mb-3">
              What's this group for?
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GROUP_TYPES.map((type) => {
                const isActive = selectedType === type.key;
                const Icon = type.icon;
                return (
                  <Pressable
                    key={type.key}
                    onPress={() => handleSelectType(type.key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      backgroundColor: isActive ? type.bg : "#ffffff",
                      borderColor: isActive ? type.color : "#e2e8f0",
                    }}
                  >
                    <Icon size={16} color={isActive ? type.color : "#94a3b8"} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: isActive ? type.color : "#64748b",
                      }}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Currency */}
          <View>
            <Text className="text-sm font-sans-semibold text-foreground mb-3">
              Currency
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {CURRENCIES.map((curr) => {
                const isActive = selectedCurrency === curr.code;
                return (
                  <Pressable
                    key={curr.code}
                    onPress={() => { hapticSelection(); setSelectedCurrency(curr.code); }}
                    className={cn(
                      "flex-row items-center gap-2 px-4 py-2.5 rounded-xl border",
                      isActive
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    )}
                  >
                    <Text style={{ fontSize: 16 }}>{curr.flag}</Text>
                    <Text
                      className={cn(
                        "text-sm font-sans-semibold",
                        isActive ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {curr.code}
                    </Text>
                    <Text
                      className={cn(
                        "text-sm font-sans",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {curr.symbol}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Invite Members */}
          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <UserPlus size={18} color="#0d9488" />
              <Text className="text-sm font-sans-semibold text-foreground">
                Add People
              </Text>
              <Text className="text-xs text-muted-foreground font-sans">
                (optional)
              </Text>
            </View>

            {/* Invited list */}
            {invitedEmails.length > 0 && (
              <View className="gap-2 mb-3">
                {invitedEmails.map((email, idx) => (
                  <View
                    key={`inv-${idx}`}
                    className="flex-row items-center gap-3 bg-card rounded-xl border border-border px-3 py-2.5"
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: "#0d948815" }}
                    >
                      <Mail size={14} color="#0d9488" />
                    </View>
                    <Text
                      className="flex-1 text-sm font-sans-medium text-foreground"
                      numberOfLines={1}
                    >
                      {email}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setInvitedEmails((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      hitSlop={8}
                    >
                      <X size={16} color="#94a3b8" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Email input */}
            <View className="flex-row gap-2">
              <Input
                placeholder="friend@example.com"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerClassName="flex-1"
              />
              <Button
                variant="default"
                size="md"
                onPress={handleInviteByEmail}
                disabled={!inviteEmail.trim()}
              >
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  Add
                </Text>
              </Button>
            </View>
            <Text className="text-xs text-muted-foreground font-sans mt-2 leading-5">
              They'll get added as guests. They can claim their account later.
            </Text>
          </View>

          {/* Create button (bottom CTA for easy thumb reach) */}
          <Button
            variant="default"
            onPress={handleCreate}
            disabled={submitting || !groupName.trim()}
            className="mt-2"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Users size={18} color="#ffffff" />
                <Text className="text-base font-sans-semibold text-primary-foreground">
                  Create Group
                </Text>
              </View>
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
