import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { usersApi, groupsApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import {
  ArrowLeft,
  Users,
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
  Share2,
  Copy,
  Check,
  QrCode,
  type LucideIcon,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn, getInviteUrl } from "@/lib/utils";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";
import { invalidateAfterGroupChange } from "@/lib/query";
import type { GroupDto } from "@/lib/types";
import * as Clipboard from "expo-clipboard";

const GROUP_TYPES = [
  { key: "trip", label: "Trip", emoji: "\u2708\uFE0F", icon: Plane, color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "home", label: "Home", emoji: "\uD83C\uDFE0", icon: Home, color: "#8b5cf6", bg: "#ede9fe" },
  { key: "couple", label: "Couple", emoji: "\u2764\uFE0F", icon: Heart, color: palette.red500, bg: "#fee2e2" },
  { key: "food", label: "Dinners", emoji: "\uD83C\uDF55", icon: Utensils, color: palette.amber500, bg: "#fef3c7" },
  { key: "work", label: "Work", emoji: "\uD83D\uDCBC", icon: Briefcase, color: palette.slate500, bg: palette.slate100 },
  { key: "school", label: "School", emoji: "\uD83C\uDF93", icon: GraduationCap, color: "#06b6d4", bg: "#cffafe" },
  { key: "party", label: "Party", emoji: "\uD83C\uDF89", icon: PartyPopper, color: "#d946ef", bg: "#fae8ff" },
  { key: "roadtrip", label: "Road Trip", emoji: "\uD83D\uDE97", icon: Car, color: palette.emerald500, bg: "#d1fae5" },
  { key: "event", label: "Event", emoji: "\uD83C\uDFB5", icon: Music, color: palette.pink500, bg: "#fce7f3" },
  { key: "fitness", label: "Fitness", emoji: "\uD83D\uDCAA", icon: Dumbbell, color: palette.orange500, bg: "#ffedd5" },
] as const;

const GROUP_EMOJIS = [
  "\u2708\uFE0F", "\uD83C\uDFE0", "\u2764\uFE0F", "\uD83C\uDF55", "\uD83C\uDF89", "\uD83D\uDE97", "\u26F7\uFE0F", "\uD83C\uDFD6\uFE0F", "\uD83C\uDFAE", "\uD83C\uDF7A",
  "\u2615", "\uD83C\uDFB5", "\uD83C\uDFD5\uFE0F", "\uD83D\uDED2", "\uD83D\uDCBC", "\uD83C\uDF93", "\uD83C\uDFCB\uFE0F", "\uD83C\uDFAD", "\uD83C\uDFAA", "\u26BD",
  "\uD83C\uDF82", "\uD83C\uDF2E", "\uD83C\uDF63", "\uD83C\uDFAF", "\uD83C\uDFC4", "\u26FA", "\uD83C\uDFAC", "\uD83E\uDDD1\u200D\uD83C\uDF73", "\uD83C\uDFB8", "\uD83C\uDFE1",
];

import { CURRENCIES } from "@/lib/currencies";

export default function CreateGroupScreen() {
  const router = useRouter();
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/groups");
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const toast = useToast();

  const [groupName, setGroupName] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("\u2708\uFE0F");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [submitting, setSubmitting] = useState(false);

  // Post-creation share sheet state
  const [createdGroup, setCreatedGroup] = useState<GroupDto | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const namePlaceholder = (() => {
    switch (selectedType) {
      case "trip": return "e.g., Bali Trip 2026";
      case "home": return "e.g., Apartment 4B";
      case "couple": return "e.g., Us \u2764\uFE0F";
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

      invalidateAfterGroupChange();
      hapticSuccess();
      toast.success(`"${groupName}" created!`);
      setCreatedGroup(group);
      setShowShareSheet(true);
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Something went wrong. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdGroup?.inviteCode) return;
    const url = getInviteUrl(createdGroup.inviteCode);
    await Clipboard.setStringAsync(url);
    setCopied(true);
    hapticSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!createdGroup?.inviteCode) return;
    const url = getInviteUrl(createdGroup.inviteCode);
    try {
      await Share.share({
        message: `Join my group "${createdGroup.name}" on Splitr!\n${url}`,
        url: Platform.OS === "ios" ? url : undefined,
      });
    } catch {
      // User cancelled
    }
  };

  const handleDismissShare = () => {
    setShowShareSheet(false);
    if (createdGroup) {
      router.replace(`/(tabs)/groups/${createdGroup.id}`);
    }
  };

  const activeType = GROUP_TYPES.find((t) => t.key === selectedType);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: "hidden" }}
        >
          {/* Emoji watermark */}
          <View
            style={{ position: "absolute", top: -10, right: -15, opacity: 0.08 }}
            pointerEvents="none"
          >
            <Text style={{ fontSize: 140, lineHeight: 160 }}>{selectedEmoji}</Text>
          </View>

          {/* Decorative orb */}
          <View
            style={{
              position: "absolute", bottom: -30, left: -30,
              width: 100, height: 100, borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            pointerEvents="none"
          />

          {/* Nav bar */}
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
            <Pressable
              testID="back-button"
              onPress={goBack}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <ArrowLeft size={22} color={palette.white} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={submitting || !groupName.trim()}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: radius.md,
                backgroundColor: groupName.trim() ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Text
                  className="text-sm font-sans-semibold"
                  style={{ color: groupName.trim() ? palette.white : "rgba(255,255,255,0.4)" }}
                >
                  Create
                </Text>
              )}
            </Pressable>
          </View>

          {/* Title */}
          <View className="px-5 pt-1 pb-2">
            <Text className="text-2xl font-sans-bold" style={{ color: palette.white }}>
              New Group
            </Text>
            <Text className="text-sm font-sans mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
              Split expenses with friends
            </Text>
          </View>

          {/* Emoji avatar — centered on hero */}
          <View className="items-center pb-5 pt-2">
            <Pressable
              testID="emoji-avatar"
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: 80,
                height: 80,
                borderRadius: radius["2xl"],
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <Text style={{ fontSize: 36 }}>{selectedEmoji}</Text>
            </Pressable>
            <Text className="text-xs font-sans mt-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              Tap to change icon
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-6 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Group Avatar + Name */}
          <View className="items-center gap-4">

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
                        borderRadius: radius.DEFAULT,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          selectedEmoji === emoji ? `${c.primary}15` : "transparent",
                        borderWidth: selectedEmoji === emoji ? 1.5 : 0,
                        borderColor: c.primary,
                      }}
                    >
                      <Text style={{ fontSize: fs["2xl"] }}>{emoji}</Text>
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
                      borderRadius: radius.DEFAULT,
                      borderWidth: 1.5,
                      backgroundColor: isActive ? type.bg : c.card,
                      borderColor: isActive ? type.color : c.border,
                    }}
                  >
                    <Icon size={16} color={isActive ? type.color : palette.slate400} />
                    <Text
                      style={{
                        fontSize: fs.base,
                        fontFamily: ff.semibold,
                        color: isActive ? type.color : c.mutedForeground,
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
                    <Text style={{ fontSize: fs.lg }}>{curr.flag}</Text>
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

        </ScrollView>

        {/* Sticky Create button — always visible at bottom */}
        <View className="px-5 pb-4 pt-3 border-t border-border bg-background">
          <Button
            variant="default"
            onPress={handleCreate}
            disabled={submitting || !groupName.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <View className="flex-row items-center gap-2">
                <Users size={18} color={palette.white} />
                <Text className="text-base font-sans-semibold text-primary-foreground">
                  Create Group
                </Text>
              </View>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Post-Creation Share Sheet */}
      <BottomSheetModal visible={showShareSheet} onClose={handleDismissShare}>
        {/* Success header */}
        <View className="items-center gap-2">
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.xl,
              backgroundColor: "#10b98120",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={32} color={c.success} />
          </View>
          <Text style={{ fontSize: fs["2xl"], fontFamily: ff.bold, color: c.foreground }}>
            Group Created!
          </Text>
          <Text style={{ fontSize: fs.md, fontFamily: ff.regular, color: c.mutedForeground, textAlign: "center" }}>
            Share the link so others can join
          </Text>
        </View>

        {/* Invite link */}
        {createdGroup?.inviteCode && (
          <Pressable
            onPress={handleCopyLink}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: c.background,
              borderRadius: radius.DEFAULT,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              width: "100%",
            }}
          >
            <Text
              style={{ flex: 1, fontSize: fs.base, fontFamily: ff.medium, color: c.mutedForeground }}
              numberOfLines={1}
            >
              {getInviteUrl(createdGroup.inviteCode)}
            </Text>
            {copied ? (
              <Check size={18} color={c.success} />
            ) : (
              <Copy size={18} color={c.primary} />
            )}
          </Pressable>
        )}

        {/* QR Code — hidden by default */}
        {createdGroup?.inviteCode && (
          showQR ? (
            <View
              style={{
                padding: 16,
                backgroundColor: c.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                alignSelf: "center",
              }}
            >
              <QRCode
                value={getInviteUrl(createdGroup.inviteCode)}
                size={180}
                color={c.foreground}
                backgroundColor={c.card}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => { hapticLight(); setShowQR(true); }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.border,
                width: "100%",
              }}
            >
              <QrCode size={18} color={c.mutedForeground} />
              <Text style={{ fontSize: fs.md, fontFamily: ff.medium, color: c.mutedForeground }}>
                Show QR Code
              </Text>
            </Pressable>
          )
        )}

        {/* Action buttons */}
        <View style={{ width: "100%", gap: 10 }}>
          <Button variant="default" onPress={handleShare}>
            <View className="flex-row items-center gap-2">
              <Share2 size={18} color={palette.white} />
              <Text className="text-base font-sans-semibold text-primary-foreground">
                Share Invite Link
              </Text>
            </View>
          </Button>

          <Button variant="outline" onPress={handleDismissShare}>
            <Text className="text-base font-sans-semibold text-foreground">
              Go to Group
            </Text>
          </Button>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
