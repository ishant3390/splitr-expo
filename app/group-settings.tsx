import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Share,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  UserPlus,
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  Bell,
  BellOff,
  Archive,
  RotateCcw,
  Trash2,
  GitMerge,
  Settings,
  Camera as CameraIcon,
  ImageIcon,
  Pencil,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { ThemedSwitch } from "@/components/ui/themed-switch";
import { Image } from "expo-image";
import { groupsApi, contactsApi, inviteApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { useArchiveGroup, useDeleteGroup, useCategories, useUploadGroupBanner, useDeleteGroupBanner } from "@/lib/hooks";
import { pickImage, validateImage, buildImageFormDataAsync, compressImage, sanitizeImageUrl } from "@/lib/image-utils";
import { invalidateAfterGroupChange, invalidateAfterMemberChange } from "@/lib/query";
import { formatCents, getInitials, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticLight, hapticSuccess, hapticWarning, hapticError } from "@/lib/haptics";
import {
  dedupeMembers,
  aggregateByPerson,
  aggregateByCategory,
  aggregateByMonth,
  hasUnsettledBalances,
} from "@/lib/screen-helpers";
import * as Clipboard from "expo-clipboard";
import { SkeletonList } from "@/components/ui/skeleton";
import type { GroupDto, GroupMemberDto, ExpenseDto, ContactDto } from "@/lib/types";

function getInviteUrl(inviteCode: string) {
  return `https://splitr.ai/invite/${inviteCode}`;
}

export default function GroupSettingsScreen() {
  const router = useRouter();
  const { groupId, autoAddMember } = useLocalSearchParams<{ groupId: string; autoAddMember?: string }>();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/groups"));

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberName, setAddMemberName] = useState("");
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Share / QR state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState<GroupMemberDto | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Group action state
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveHasBalances, setArchiveHasBalances] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const archiveMutation = useArchiveGroup();
  const deleteMutation = useDeleteGroup();
  const { data: categoriesList = [] } = useCategories();

  // Notification toggle
  const [groupNotificationsEnabled, setGroupNotificationsEnabled] = useState(true);
  const [togglingNotifications, setTogglingNotifications] = useState(false);

  // Simplify debts toggle
  const [togglingSimplify, setTogglingSimplify] = useState(false);

  // Banner upload
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const uploadBannerMutation = useUploadGroupBanner(groupId);
  const deleteBannerMutation = useDeleteGroupBanner(groupId);

  const handleBannerUpload = async (source: "camera" | "gallery") => {
    const asset = await pickImage(source, { aspect: [16, 9] });
    if (!asset) return;
    const error = validateImage(asset);
    if (error) { toast.error(error); return; }
    setUploadingBanner(true);
    try {
      const compressed = await compressImage(asset.uri, asset.fileSize ?? undefined);
      const mime = compressed.uri !== asset.uri ? "image/jpeg" : (asset.mimeType ?? "image/jpeg");
      const formData = await buildImageFormDataAsync(compressed.uri, mime);
      const updated = await uploadBannerMutation.mutateAsync(formData);
      // Sanitize double-protocol URLs (BE-6) and cache-bust
      if (updated.bannerImageUrl) {
        updated.bannerImageUrl = `${sanitizeImageUrl(updated.bannerImageUrl)}?t=${Date.now()}`;
      }
      setGroup(updated);
      toast.success("Banner updated.");
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to upload banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerRemove = async () => {
    setUploadingBanner(true);
    try {
      await deleteBannerMutation.mutateAsync();
      setGroup((prev) => prev ? { ...prev, bannerImageUrl: undefined } : prev);
      toast.success("Banner removed.");
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to remove banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const loadData = async () => {
    try {
      const token = await getToken();
      const [groupData, membersData, expensesResponse] = await Promise.all([
        groupsApi.get(groupId, token!),
        groupsApi.listMembers(groupId, token!),
        groupsApi.listExpenses(groupId, token!, { limit: "100" }),
      ]);
      // Sanitize double-protocol URLs (BE-6 safety net)
      if (groupData.bannerImageUrl) groupData.bannerImageUrl = sanitizeImageUrl(groupData.bannerImageUrl);
      setGroup(groupData);
      const dedupedMembers = dedupeMembers(membersData);
      setMembers(dedupedMembers);
      setExpenses(expensesResponse.data ?? []);

      // Initialize per-group notification preference
      const myEmail = clerkUser?.primaryEmailAddress?.emailAddress;
      if (myEmail) {
        const myMember = dedupedMembers.find(
          (m) => m.user?.email?.toLowerCase() === myEmail.toLowerCase()
        );
        if (myMember && myMember.notificationsEnabled !== undefined) {
          setGroupNotificationsEnabled(myMember.notificationsEnabled);
        }
      }
    } catch {
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [groupId])
  );

  // Toggle per-group notification preference
  const toggleGroupNotifications = async () => {
    const myEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!myEmail) return;
    const myMember = members.find(
      (m) => m.user?.email?.toLowerCase() === myEmail.toLowerCase()
    );
    if (!myMember) return;

    setTogglingNotifications(true);
    const newValue = !groupNotificationsEnabled;
    setGroupNotificationsEnabled(newValue);
    try {
      const token = await getToken();
      await groupsApi.updateMember(groupId, myMember.id, { notificationsEnabled: newValue }, token!);
      hapticSuccess();
    } catch {
      setGroupNotificationsEnabled(!newValue);
      hapticWarning();
      toast.error("Failed to update notification preference");
    } finally {
      setTogglingNotifications(false);
    }
  };

  // Toggle simplify debts
  const toggleSimplifyDebts = async () => {
    if (!group || togglingSimplify) return;
    setTogglingSimplify(true);
    const newValue = !(group.simplifyDebts ?? false);
    setGroup((prev) => (prev ? { ...prev, simplifyDebts: newValue } : prev));
    try {
      const token = await getToken();
      // version omitted — optional for PATCH groups, avoids stale-version 409s
      const updated = await groupsApi.update(groupId, { simplifyDebts: newValue }, token!);
      setGroup(updated);
      invalidateAfterGroupChange();
      hapticSuccess();
      toast.success(newValue ? "Debt simplification enabled" : "Debt simplification disabled");
    } catch {
      setGroup((prev) => (prev ? { ...prev, simplifyDebts: !newValue } : prev));
      hapticError();
      toast.error("Failed to update simplify debts setting");
    } finally {
      setTogglingSimplify(false);
    }
  };

  // Auto-open Add Member modal when navigated with autoAddMember param
  useEffect(() => {
    if (autoAddMember === "true" && !loading && group) {
      setShowAddMember(true);
    }
  }, [autoAddMember, loading, group]);

  // Load contacts when add member modal opens
  useEffect(() => {
    if (!showAddMember) return;
    const load = async () => {
      setContactsLoading(true);
      try {
        const token = await getToken();
        const allContacts = await contactsApi.list(token!);
        const currentIds = new Set(
          members.map((m) => m.user?.id ?? m.guestUser?.id).filter(Boolean)
        );
        setContacts(
          allContacts.filter((c) => {
            const cId = c.userId ?? c.guestUserId;
            return cId && !currentIds.has(cId);
          })
        );
      } catch {
        setContacts([]);
      } finally {
        setContactsLoading(false);
      }
    };
    load();
  }, [showAddMember]);

  const handleAddMember = async () => {
    const name = addMemberName.trim();
    const email = addMemberEmail.trim().toLowerCase();
    if (!name) {
      toast.error("Please enter a name.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setAddingMember(true);
    try {
      const token = await getToken();
      if (email) {
        await groupsApi.inviteByEmail(groupId, { email }, token!);
        hapticSuccess();
        toast.success(`Invite sent to ${email}`);
      } else {
        await groupsApi.addGuestMember(groupId, { name }, token!);
        hapticSuccess();
        toast.success(`${name} added to group.`);
      }
      setAddMemberName("");
      setAddMemberEmail("");
      setShowAddMember(false);
      const updated = await groupsApi.listMembers(groupId, token!);
      setMembers(dedupeMembers(updated));
      invalidateAfterMemberChange(groupId);
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      if (apiErr) {
        toast.error(getUserMessage(apiErr));
      } else {
        toast.error("Failed to add member. They may already be in the group.");
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddContact = async (contact: ContactDto) => {
    setAddingMember(true);
    try {
      const token = await getToken();
      if (contact.email) {
        await groupsApi.inviteByEmail(groupId, { email: contact.email }, token!);
      } else {
        await groupsApi.addGuestMember(groupId, { name: contact.name }, token!);
      }
      hapticSuccess();
      toast.success(
        contact.email
          ? `Invite sent to ${contact.name}.`
          : `${contact.name} added to group.`
      );
      setShowAddMember(false);
      const updated = await groupsApi.listMembers(groupId, token!);
      setMembers(dedupeMembers(updated));
      invalidateAfterMemberChange(groupId);
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      if (apiErr) {
        toast.error(getUserMessage(apiErr));
      } else {
        toast.error("Failed to add member. Try again later.");
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      const token = await getToken();
      await groupsApi.removeMember(groupId, memberToRemove.id, token!);
      toast.success("Member removed from group.");
      const updated = await groupsApi.listMembers(groupId, token!);
      setMembers(dedupeMembers(updated));
      invalidateAfterMemberChange(groupId);
    } catch {
      toast.error("Failed to remove member. Try again.");
    } finally {
      setRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  const handleCopyLink = async () => {
    if (!group?.inviteCode) return;
    await Clipboard.setStringAsync(getInviteUrl(group.inviteCode));
    setCopied(true);
    hapticSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!group?.inviteCode) return;
    try {
      await Share.share({
        message: `Join "${group.name}" on Splitr!\n${getInviteUrl(group.inviteCode)}`,
        url: Platform.OS === "ios" ? getInviteUrl(group.inviteCode) : undefined,
      });
    } catch {
      // User cancelled
    }
  };

  const handleRegenerateLink = async () => {
    setRegenerating(true);
    try {
      const token = await getToken();
      const updated = await inviteApi.regenerate(groupId, token!);
      setGroup(updated);
      hapticSuccess();
      toast.success("Invite link regenerated.");
    } catch {
      toast.error("Failed to regenerate link.");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-6">
          <SkeletonList count={5} type="activity" />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={goBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80"
          >
            <ArrowLeft size={22} color={c.primary} strokeWidth={2.5} />
          </Pressable>
          <Text className="text-lg font-sans-semibold text-foreground ml-3">
            Settings
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-muted-foreground font-sans">Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isArchived = group.isArchived === true;

  // Insights data
  const personList = expenses.length > 0 ? aggregateByPerson(expenses) : [];
  const maxSpent = personList[0]?.total || 1;
  const catList = expenses.length > 0 ? aggregateByCategory(expenses, 5) : [];
  const catTotal = catList.reduce((s, [, v]) => s + v, 0) || 1;
  const catColors = [c.primary, "#0ea5e9", "#8b5cf6", c.warning, c.destructive];
  const monthlyData = expenses.length > 0 ? aggregateByMonth(expenses) : [];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: "hidden" }}
        >
          {/* Banner image background */}
          {group.bannerImageUrl ? (
            <Image
              source={{ uri: group.bannerImageUrl }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
            />
          ) : (
            /* Watermark */
            <View
              style={{ position: "absolute", top: -20, right: -20, opacity: 0.08 }}
              pointerEvents="none"
            >
              <Text style={{ fontSize: 160, lineHeight: 180 }}>
                {group.emoji || group.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Dark overlay for text contrast when banner exists */}
          {group.bannerImageUrl && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />
          )}

          {/* Decorative orb */}
          <View
            style={{
              position: "absolute", bottom: -30, left: -30,
              width: 100, height: 100, borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            pointerEvents="none"
          />

          {/* Navigation */}
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
            <Pressable
              onPress={goBack}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <ArrowLeft size={22} color={palette.white} strokeWidth={2.5} />
            </Pressable>
            <Text className="text-base font-sans-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
              Settings
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Group identity */}
          <View className="items-center px-5 pt-2 pb-5">
            <View
              style={{
                width: 72, height: 72, borderRadius: radius.full,
                borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
                overflow: "hidden",
              }}
            >
              <GroupAvatar name={group.name} emoji={group.emoji} groupType={group.groupType} id={group.id} size="lg" />
            </View>
            <Text
              className="text-xl font-sans-bold mt-3"
              style={{ color: palette.white }}
            >
              {group.name}
            </Text>
            {group.description ? (
              <Text
                className="text-sm font-sans mt-1 text-center"
                style={{ color: "rgba(255,255,255,0.7)" }}
                numberOfLines={2}
              >
                {group.description}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-4 mt-3">
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: radius.DEFAULT,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text className="text-xs font-sans-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {group.groupType ?? "Group"} · {group.defaultCurrency ?? "USD"}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: radius.DEFAULT,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text className="text-xs font-sans-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {members.length} {members.length === 1 ? "member" : "members"}
                </Text>
              </View>
            </View>

            {/* Banner upload controls */}
            {!isArchived && (
              <View className="flex-row items-center gap-2 mt-3">
                {uploadingBanner ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleBannerUpload("gallery")}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderRadius: radius.full,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ImageIcon size={14} color={palette.white} />
                      <Text className="text-xs font-sans-medium" style={{ color: palette.white }}>
                        {group.bannerImageUrl ? "Change Banner" : "Add Banner"}
                      </Text>
                    </Pressable>
                    {Platform.OS !== "web" && (
                      <Pressable
                        onPress={() => handleBannerUpload("camera")}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.15)",
                          borderRadius: radius.full,
                          padding: 6,
                        }}
                      >
                        <CameraIcon size={14} color={palette.white} />
                      </Pressable>
                    )}
                    {group.bannerImageUrl && (
                      <Pressable
                        onPress={handleBannerRemove}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.15)",
                          borderRadius: radius.full,
                          padding: 6,
                        }}
                      >
                        <X size={14} color={palette.white} />
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </LinearGradient>

      <View className="px-5 gap-4 pt-4">

        {/* MEMBERS */}
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-sans-semibold text-muted-foreground">
            MEMBERS ({members.length})
          </Text>
          {!isArchived && (
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setShowShareModal(true)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted"
              >
                <Share2 size={14} color={c.mutedForeground} />
                <Text className="text-xs font-sans-semibold text-muted-foreground">Invite Link</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowAddMember(true)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
              >
                <UserPlus size={14} color={c.primary} />
                <Text className="text-xs font-sans-semibold text-primary">Add</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Card className="overflow-hidden">
          {members.map((member, index) => {
            const memberName = member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
            const memberEmail = member.user?.email ?? member.guestUser?.email;
            const balance = member.balance ?? 0;

            return (
              <View
                key={member.id}
                className={cn(
                  "flex-row items-center px-4 py-3",
                  index < members.length - 1 ? "border-b border-border" : ""
                )}
              >
                <Avatar
                  src={member.user?.avatarUrl}
                  fallback={getInitials(memberName)}
                  size="md"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-sans-medium text-foreground">{memberName}</Text>
                  {memberEmail && (
                    <Text className="text-xs text-muted-foreground font-sans">{memberEmail}</Text>
                  )}
                </View>
                <Text
                  className={cn(
                    "text-sm font-sans-semibold mr-2",
                    balance > 0 ? "text-success" : balance < 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {balance > 0 ? "+" : ""}{formatCents(balance, group?.defaultCurrency)}
                </Text>
                {!isArchived && (
                  <Pressable
                    onPress={() => { hapticWarning(); setMemberToRemove(member); }}
                    className="w-7 h-7 rounded-full bg-destructive/10 items-center justify-center"
                  >
                    <X size={14} color={c.destructive} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </Card>

        {/* PREFERENCES */}
        <Text className="text-xs font-sans-semibold text-muted-foreground mt-2">PREFERENCES</Text>
        <Card className="overflow-hidden">
          {/* Notification toggle */}
          <Pressable
            onPress={toggleGroupNotifications}
            disabled={togglingNotifications}
            className="flex-row items-center justify-between px-4 py-3 border-b border-border"
          >
            <View className="flex-row items-center gap-3 flex-1">
              {groupNotificationsEnabled ? (
                <Bell size={18} color={c.mutedForeground} />
              ) : (
                <BellOff size={18} color={c.mutedForeground} />
              )}
              <View className="flex-1">
                <Text className="text-sm font-sans-medium text-foreground">
                  Group Notifications
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">
                  {groupNotificationsEnabled ? "You'll be notified about this group" : "Notifications muted for this group"}
                </Text>
              </View>
            </View>
            <ThemedSwitch
              checked={groupNotificationsEnabled}
              onCheckedChange={() => toggleGroupNotifications()}
            />
          </Pressable>

          {/* Simplify debts toggle */}
          {!isArchived && (
            <Pressable
              onPress={toggleSimplifyDebts}
              disabled={togglingSimplify}
              className="flex-row items-center justify-between px-4 py-3"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <GitMerge size={18} color={c.mutedForeground} />
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-foreground">
                    Simplify debts
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans">
                    Reduces the number of transactions needed to settle up
                  </Text>
                </View>
              </View>
              <ThemedSwitch
                checked={group?.simplifyDebts ?? false}
                onCheckedChange={toggleSimplifyDebts}
                disabled={togglingSimplify}
                pointerEvents="none"
              />
            </Pressable>
          )}
        </Card>

        {/* INSIGHTS */}
        {expenses.length > 0 && (
          <>
            <Text className="text-xs font-sans-semibold text-muted-foreground mt-2">INSIGHTS</Text>
            <Card className="p-4 gap-4">
              {/* By Person */}
              <View>
                <Text className="text-xs font-sans-semibold text-muted-foreground mb-2">BY PERSON</Text>
                <View className="gap-2">
                  {personList.map((p) => (
                    <View key={p.name} className="gap-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-sans-medium text-foreground">{p.name}</Text>
                        <Text className="text-xs font-sans-semibold text-foreground">{formatCents(p.total, group?.defaultCurrency)}</Text>
                      </View>
                      <View className="h-2 rounded-full bg-muted overflow-hidden">
                        <View
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(p.total / maxSpent) * 100}%` }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* By Category */}
              {catList.length > 0 && (
                <View>
                  <Text className="text-xs font-sans-semibold text-muted-foreground mb-2">BY CATEGORY</Text>
                  <View className="flex-row h-3 rounded-full overflow-hidden mb-2">
                    {catList.map(([cat, amount], i) => (
                      <View
                        key={cat}
                        style={{
                          width: `${(amount / catTotal) * 100}%`,
                          backgroundColor: catColors[i % catColors.length],
                          height: "100%",
                        }}
                      />
                    ))}
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {catList.map(([cat, amount], i) => (
                      <View key={cat} className="flex-row items-center gap-1.5">
                        <View style={{ width: 8, height: 8, borderRadius: radius.sm, backgroundColor: catColors[i % catColors.length] }} />
                        <Text className="text-xs font-sans text-muted-foreground">
                          {cat} ({formatCents(amount, group?.defaultCurrency)})
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Monthly Breakdown */}
              {monthlyData.length >= 2 && (() => {
                const maxMonthly = Math.max(...monthlyData.map((m) => m.total));
                return (
                  <View>
                    <Text className="text-xs font-sans-semibold text-muted-foreground mb-2">MONTHLY SPENDING</Text>
                    <View className="flex-row items-end gap-1" style={{ height: 80 }}>
                      {monthlyData.slice(-6).map((m) => {
                        const [, monthNum] = m.month.split("-");
                        const label = MONTH_NAMES[parseInt(monthNum, 10) - 1] ?? m.month;
                        const barHeight = maxMonthly > 0 ? (m.total / maxMonthly) * 60 + 4 : 4;
                        return (
                          <View key={m.month} className="flex-1 items-center gap-1">
                            <Text className="text-[8px] font-sans text-muted-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                              {formatCents(m.total, group?.defaultCurrency)}
                            </Text>
                            <View
                              className="w-full rounded-t bg-primary"
                              style={{ height: barHeight, maxWidth: 32 }}
                            />
                            <Text className="text-[9px] font-sans-medium text-muted-foreground">{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}
            </Card>
          </>
        )}

        {/* DANGER ZONE */}
        <Text className="text-xs font-sans-semibold text-muted-foreground mt-2">DANGER ZONE</Text>
        <Card className="overflow-hidden">
          {isArchived ? (
            <Pressable
              onPress={() => {
                archiveMutation.mutateAsync({ groupId, version: group.version ?? 0, archive: false })
                  .then(() => { toast.success(`"${group.name}" restored.`); loadData(); })
                  .catch(() => toast.error("Failed to restore group."));
              }}
              className="flex-row items-center gap-3 px-4 py-3 border-b border-border"
            >
              <RotateCcw size={20} color={c.primary} />
              <Text className="text-sm font-sans-medium text-foreground">Restore Group</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setArchiveHasBalances(hasUnsettledBalances(members));
                setShowArchiveConfirm(true);
              }}
              className="flex-row items-center gap-3 px-4 py-3 border-b border-border"
            >
              <Archive size={20} color={c.warning} />
              <Text className="text-sm font-sans-medium text-amber-600 dark:text-amber-400">Archive Group</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowDeleteConfirm(true)}
            className="flex-row items-center gap-3 px-4 py-3"
          >
            <Trash2 size={20} color={c.destructive} />
            <Text className="text-sm font-sans-medium text-destructive">Delete Group</Text>
          </Pressable>
        </Card>
      </View>
      </ScrollView>

      {/* Remove Member Confirmation */}
      <ConfirmModal
        visible={!!memberToRemove}
        title="Remove Member"
        message={`Remove ${memberToRemove?.user?.name ?? memberToRemove?.guestUser?.name ?? "this member"} from the group? Their past expenses will remain.`}
        confirmLabel={removingMember ? "Removing..." : "Remove"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      {/* Archive Confirmation */}
      <ConfirmModal
        visible={showArchiveConfirm}
        title="Archive Group"
        message={
          archiveHasBalances
            ? `This group has outstanding balances. Archiving will prevent new expenses and settlements until you restore it.\n\nYou can restore the group at any time to settle up.`
            : `Archive "${group?.name}"? No new expenses can be added while archived. You can restore it anytime.`
        }
        confirmLabel={archiveHasBalances ? "Archive Anyway" : "Archive"}
        cancelLabel="Cancel"
        onConfirm={async () => {
          try {
            await archiveMutation.mutateAsync({ groupId, version: group.version ?? 0, archive: true });
            toast.success(`"${group?.name}" archived.`);
            loadData();
          } catch {
            toast.error("Failed to archive group.");
          } finally {
            setShowArchiveConfirm(false);
            setArchiveHasBalances(false);
          }
        }}
        onCancel={() => { setShowArchiveConfirm(false); setArchiveHasBalances(false); }}
      />

      {/* Delete Group Confirmation */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Group"
        message={`Permanently delete "${group?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(groupId);
            toast.success(`"${group?.name}" deleted.`);
            router.replace("/(tabs)/groups");
          } catch (err: unknown) {
            const apiErr = parseApiError(err);
            if (apiErr?.code === "ERR-400") {
              toast.error("Cannot delete — settle up all balances first.");
            } else {
              toast.error("Failed to delete group.");
            }
          } finally {
            setShowDeleteConfirm(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Add Member Modal */}
      <BottomSheetModal visible={showAddMember} onClose={() => { setShowAddMember(false); setAddMemberEmail(""); }} keyboardAvoiding>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fs.xl, fontFamily: ff.bold, color: c.foreground }}>
            Add Member
          </Text>
          <Pressable onPress={() => { setShowAddMember(false); setAddMemberEmail(""); }}>
            <X size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {contactsLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : contacts.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: fs.sm, fontFamily: ff.semibold, color: c.mutedForeground }}>
              FROM YOUR OTHER GROUPS
            </Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {contacts.map((contact, idx) => (
                  <Pressable
                    key={`contact-${contact.userId ?? contact.guestUserId ?? idx}`}
                    onPress={() => handleAddContact(contact)}
                    disabled={addingMember}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.background,
                    }}
                  >
                    <Avatar
                      src={contact.avatarUrl}
                      fallback={getInitials(contact.name)}
                      size="sm"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs.base, fontFamily: ff.semibold, color: c.foreground }}>
                        {contact.name}
                        {contact.isGuest ? (
                          <Text style={{ fontFamily: ff.regular, color: palette.slate400 }}> {"\u00B7"} Guest</Text>
                        ) : null}
                      </Text>
                      {contact.email ? (
                        <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground }}>
                          {contact.email}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: c.primary, borderRadius: radius.sm }}>
                      <Text style={{ fontSize: fs.sm, fontFamily: ff.semibold, color: c.primaryForeground }}>Add</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
              <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground }}>OR ADD SOMEONE NEW</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            </View>
          </View>
        ) : null}

        <Input
          label="Name"
          placeholder="e.g., Alex"
          value={addMemberName}
          onChangeText={setAddMemberName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Input
          label="Email (optional)"
          placeholder="e.g., alex@example.com"
          value={addMemberEmail}
          onChangeText={setAddMemberEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          onSubmitEditing={handleAddMember}
          returnKeyType="done"
        />

        <Text style={{ fontSize: fs.sm, fontFamily: ff.regular, color: c.mutedForeground, lineHeight: 18 }}>
          Add an email to send them a direct invite. Without one, share the group link so they can join.
        </Text>

        <Button
          variant="default"
          onPress={handleAddMember}
          disabled={addingMember || !addMemberName.trim()}
        >
          {addingMember ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text style={{ fontSize: fs.lg, fontFamily: ff.semibold, color: c.primaryForeground }}>
              Add to Group
            </Text>
          )}
        </Button>

        {group?.inviteCode && (
          <Pressable
            onPress={() => { setShowAddMember(false); setAddMemberEmail(""); setShowShareModal(true); }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 10,
            }}
          >
            <Share2 size={16} color={c.primary} />
            <Text style={{ fontSize: fs.md, fontFamily: ff.semibold, color: c.primary }}>
              Or share invite link instead
            </Text>
          </Pressable>
        )}
      </BottomSheetModal>

      {/* Share / QR Modal */}
      <BottomSheetModal visible={showShareModal} onClose={() => { setShowShareModal(false); setShowQR(false); }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Text style={{ fontSize: fs.xl, fontFamily: ff.bold, color: c.foreground }}>
            Invite to {group.name}
          </Text>
          <Pressable onPress={() => { setShowShareModal(false); setShowQR(false); }}>
            <X size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {group.inviteCode && (
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
              {getInviteUrl(group.inviteCode)}
            </Text>
            {copied ? (
              <Check size={18} color={c.success} />
            ) : (
              <Copy size={18} color={c.primary} />
            )}
          </Pressable>
        )}

        {group.inviteCode && (
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
                value={getInviteUrl(group.inviteCode)}
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

        <View style={{ width: "100%", gap: 10 }}>
          <Button variant="default" onPress={handleShare}>
            <View className="flex-row items-center gap-2">
              <Share2 size={18} color={palette.white} />
              <Text className="text-base font-sans-semibold text-primary-foreground">
                Share Invite Link
              </Text>
            </View>
          </Button>

          <Pressable
            onPress={handleRegenerateLink}
            disabled={regenerating}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 10,
            }}
          >
            <RefreshCw size={14} color={palette.slate400} />
            <Text style={{ fontSize: fs.base, fontFamily: ff.medium, color: palette.slate400 }}>
              {regenerating ? "Regenerating..." : "Regenerate invite link"}
            </Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
