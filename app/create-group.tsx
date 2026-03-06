import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { usersApi, groupsApi } from "@/lib/api";
import {
  ArrowLeft,
  X,
  UserPlus,
  Users,
  User,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";
import type { GroupDto } from "@/lib/types";
import * as Clipboard from "expo-clipboard";

const GROUP_TYPES = [
  { key: "trip", label: "Trip", emoji: "\u2708\uFE0F", icon: Plane, color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "home", label: "Home", emoji: "\uD83C\uDFE0", icon: Home, color: "#8b5cf6", bg: "#ede9fe" },
  { key: "couple", label: "Couple", emoji: "\u2764\uFE0F", icon: Heart, color: "#ef4444", bg: "#fee2e2" },
  { key: "food", label: "Dinners", emoji: "\uD83C\uDF55", icon: Utensils, color: "#f59e0b", bg: "#fef3c7" },
  { key: "work", label: "Work", emoji: "\uD83D\uDCBC", icon: Briefcase, color: "#64748b", bg: "#f1f5f9" },
  { key: "school", label: "School", emoji: "\uD83C\uDF93", icon: GraduationCap, color: "#06b6d4", bg: "#cffafe" },
  { key: "party", label: "Party", emoji: "\uD83C\uDF89", icon: PartyPopper, color: "#d946ef", bg: "#fae8ff" },
  { key: "roadtrip", label: "Road Trip", emoji: "\uD83D\uDE97", icon: Car, color: "#10b981", bg: "#d1fae5" },
  { key: "event", label: "Event", emoji: "\uD83C\uDFB5", icon: Music, color: "#ec4899", bg: "#fce7f3" },
  { key: "fitness", label: "Fitness", emoji: "\uD83D\uDCAA", icon: Dumbbell, color: "#f97316", bg: "#ffedd5" },
] as const;

const GROUP_EMOJIS = [
  "\u2708\uFE0F", "\uD83C\uDFE0", "\u2764\uFE0F", "\uD83C\uDF55", "\uD83C\uDF89", "\uD83D\uDE97", "\u26F7\uFE0F", "\uD83C\uDFD6\uFE0F", "\uD83C\uDFAE", "\uD83C\uDF7A",
  "\u2615", "\uD83C\uDFB5", "\uD83C\uDFD5\uFE0F", "\uD83D\uDED2", "\uD83D\uDCBC", "\uD83C\uDF93", "\uD83C\uDFCB\uFE0F", "\uD83C\uDFAD", "\uD83C\uDFAA", "\u26BD",
  "\uD83C\uDF82", "\uD83C\uDF2E", "\uD83C\uDF63", "\uD83C\uDFAF", "\uD83C\uDFC4", "\u26FA", "\uD83C\uDFAC", "\uD83E\uDDD1\u200D\uD83C\uDF73", "\uD83C\uDFB8", "\uD83C\uDFE1",
];

const CURRENCIES = [
  { code: "USD", symbol: "$", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "EUR", symbol: "\u20AC", flag: "\uD83C\uDDEA\uD83C\uDDFA" },
  { code: "GBP", symbol: "\u00A3", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "INR", symbol: "\u20B9", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { code: "CAD", symbol: "C$", flag: "\uD83C\uDDE8\uD83C\uDDE6" },
  { code: "AUD", symbol: "A$", flag: "\uD83C\uDDE6\uD83C\uDDFA" },
  { code: "JPY", symbol: "\u00A5", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
];

function getInviteUrl(inviteCode: string) {
  return `https://splitr.app/invite/${inviteCode}`;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/groups");
  const { getToken } = useAuth();
  const toast = useToast();

  const [groupName, setGroupName] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState("\u2708\uFE0F");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [memberName, setMemberName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
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

  const handleAddMember = () => {
    const name = memberName.trim();
    if (!name) {
      toast.error("Please enter a name.");
      return;
    }
    if (members.includes(name)) {
      toast.error("This person has already been added.");
      return;
    }
    hapticLight();
    setMembers((prev) => [...prev, name]);
    setMemberName("");
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

      // Add members by name as guests (no email required)
      await Promise.all(
        members.map((name) =>
          groupsApi.addGuestMember(group.id, { name }, token!)
        )
      );

      hapticSuccess();
      toast.success(`"${groupName}" created!`);
      setCreatedGroup(group);
      setShowShareSheet(true);
    } catch {
      hapticError();
      toast.error("Something went wrong. Try again later.");
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
      router.replace(`/group/${createdGroup.id}`);
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

          {/* Add People (by name) */}
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

            {/* Added members list */}
            {members.length > 0 && (
              <View className="gap-2 mb-3">
                {members.map((name, idx) => (
                  <View
                    key={`member-${idx}`}
                    className="flex-row items-center gap-3 bg-card rounded-xl border border-border px-3 py-2.5"
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: "#0d948815" }}
                    >
                      <User size={14} color="#0d9488" />
                    </View>
                    <Text
                      className="flex-1 text-sm font-sans-medium text-foreground"
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setMembers((prev) => prev.filter((_, i) => i !== idx))
                      }
                      hitSlop={8}
                    >
                      <X size={16} color="#94a3b8" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Name input */}
            <View className="flex-row gap-2">
              <Input
                placeholder="e.g., Alex, Sarah, Mike"
                value={memberName}
                onChangeText={setMemberName}
                autoCapitalize="words"
                containerClassName="flex-1"
                onSubmitEditing={handleAddMember}
                returnKeyType="done"
              />
              <Button
                variant="default"
                size="md"
                onPress={handleAddMember}
                disabled={!memberName.trim()}
              >
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  Add
                </Text>
              </Button>
            </View>
            <Text className="text-xs text-muted-foreground font-sans mt-2 leading-5">
              Just add names for now. Share the group link after to let them join.
            </Text>
          </View>

          {/* Create button */}
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

      {/* Post-Creation Share Sheet */}
      <Modal
        transparent
        visible={showShareSheet}
        animationType="slide"
        onRequestClose={handleDismissShare}
      >
        <Pressable
          onPress={handleDismissShare}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: Platform.OS === "ios" ? 40 : 24,
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* Success header */}
            <View className="items-center gap-2">
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: "#10b98120",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={32} color="#10b981" />
              </View>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#0f172a" }}>
                Group Created!
              </Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748b", textAlign: "center" }}>
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
                  backgroundColor: "#f8fafc",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  width: "100%",
                }}
              >
                <Text
                  style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#64748b" }}
                  numberOfLines={1}
                >
                  {getInviteUrl(createdGroup.inviteCode)}
                </Text>
                {copied ? (
                  <Check size={18} color="#10b981" />
                ) : (
                  <Copy size={18} color="#0d9488" />
                )}
              </Pressable>
            )}

            {/* QR Code — hidden by default */}
            {createdGroup?.inviteCode && (
              showQR ? (
                <View
                  style={{
                    padding: 16,
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    alignItems: "center",
                  }}
                >
                  <QRCode
                    value={getInviteUrl(createdGroup.inviteCode)}
                    size={180}
                    color="#0f172a"
                    backgroundColor="#ffffff"
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
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    width: "100%",
                  }}
                >
                  <QrCode size={18} color="#64748b" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#64748b" }}>
                    Show QR Code
                  </Text>
                </Pressable>
              )
            )}

            {/* Action buttons */}
            <View style={{ width: "100%", gap: 10 }}>
              <Button variant="default" onPress={handleShare}>
                <View className="flex-row items-center gap-2">
                  <Share2 size={18} color="#ffffff" />
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
