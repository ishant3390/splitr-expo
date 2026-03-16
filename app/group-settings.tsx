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
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { ThemedSwitch } from "@/components/ui/themed-switch";
import { groupsApi, contactsApi, inviteApi } from "@/lib/api";
import { useArchiveGroup, useDeleteGroup, useCategories } from "@/lib/hooks";
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
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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

  const loadData = async () => {
    try {
      const token = await getToken();
      const [groupData, membersData, expensesResponse] = await Promise.all([
        groupsApi.get(groupId, token!),
        groupsApi.listMembers(groupId, token!),
        groupsApi.listExpenses(groupId, token!, { limit: "100" }),
      ]);
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
    if (!group) return;
    setTogglingSimplify(true);
    const newValue = !(group.simplifyDebts ?? false);
    const oldVersion = group.version;
    setGroup((prev) => (prev ? { ...prev, simplifyDebts: newValue } : prev));
    try {
      const token = await getToken();
      await groupsApi.update(groupId, { simplifyDebts: newValue, version: oldVersion }, token!);
      setGroup((prev) => (prev ? { ...prev, version: (prev.version ?? 0) + 1 } : prev));
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
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.includes("ERR-409") || msg.includes("INVITE_ALREADY_MEMBER")) {
        toast.error("This person is already in the group.");
      } else if (msg.includes("ERR-402") || msg.includes("GROUP_ARCHIVED")) {
        toast.error("This group is archived.");
      } else if (msg.includes("404") || msg.includes("ERR-300")) {
        toast.error("Group not found.");
      } else if (msg.includes("403") || msg.includes("ERR-201")) {
        toast.error("You're not a member of this group.");
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
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.includes("ERR-409") || msg.includes("INVITE_ALREADY_MEMBER")) {
        toast.error("This person is already in the group.");
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
            <ArrowLeft size={22} color="#0d9488" strokeWidth={2.5} />
          </Pressable>
          <Text className="text-lg font-sans-semibold text-foreground ml-3">
            Group Settings
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
  const catColors = ["#0d9488", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444"];
  const monthlyData = expenses.length > 0 ? aggregateByMonth(expenses) : [];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable
          onPress={goBack}
          className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80"
        >
          <ArrowLeft size={22} color="#0d9488" strokeWidth={2.5} />
        </Pressable>
        <Text className="text-lg font-sans-semibold text-foreground ml-3">
          Group Settings
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 gap-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* GROUP DETAILS */}
        <Text className="text-xs font-sans-semibold text-muted-foreground">GROUP DETAILS</Text>
        <Card className="p-4">
          <View className="flex-row items-center gap-3">
            <GroupAvatar name={group.name} emoji={group.emoji} groupType={group.groupType} id={group.id} size="lg" />
            <View className="flex-1">
              <Text className="text-lg font-sans-bold text-foreground">{group.name}</Text>
              {group.description ? (
                <Text className="text-sm text-muted-foreground font-sans mt-0.5" numberOfLines={2}>
                  {group.description}
                </Text>
              ) : null}
              <Text className="text-xs text-muted-foreground font-sans mt-1">
                {group.groupType ? `${group.groupType} \u00B7 ` : ""}{group.defaultCurrency ?? "USD"}
              </Text>
            </View>
          </View>
        </Card>

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
                <Share2 size={14} color="#64748b" />
                <Text className="text-xs font-sans-semibold text-muted-foreground">Invite Link</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowAddMember(true)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
              >
                <UserPlus size={14} color="#0d9488" />
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
                    <X size={14} color="#ef4444" />
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
                <Bell size={18} color={isDark ? "#94a3b8" : "#64748b"} />
              ) : (
                <BellOff size={18} color={isDark ? "#94a3b8" : "#64748b"} />
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
                <GitMerge size={18} color={isDark ? "#94a3b8" : "#64748b"} />
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
                onCheckedChange={() => toggleSimplifyDebts()}
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
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: catColors[i % catColors.length] }} />
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
              <RotateCcw size={20} color="#0d9488" />
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
              <Archive size={20} color="#f59e0b" />
              <Text className="text-sm font-sans-medium text-amber-600 dark:text-amber-400">Archive Group</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowDeleteConfirm(true)}
            className="flex-row items-center gap-3 px-4 py-3"
          >
            <Trash2 size={20} color="#ef4444" />
            <Text className="text-sm font-sans-medium text-destructive">Delete Group</Text>
          </Pressable>
        </Card>
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
          } catch (err: any) {
            const body = err?.message ?? "";
            if (body.includes("OUTSTANDING_BALANCES") || body.toLowerCase().includes("outstanding balance")) {
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
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            Add Member
          </Text>
          <Pressable onPress={() => { setShowAddMember(false); setAddMemberEmail(""); }}>
            <X size={22} color="#64748b" />
          </Pressable>
        </View>

        {contactsLoading ? (
          <ActivityIndicator color="#0d9488" />
        ) : contacts.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#64748b" }}>
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
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                    }}
                  >
                    <Avatar
                      src={contact.avatarUrl}
                      fallback={getInitials(contact.name)}
                      size="sm"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
                        {contact.name}
                        {contact.isGuest ? (
                          <Text style={{ fontFamily: "Inter_400Regular", color: "#94a3b8" }}> {"\u00B7"} Guest</Text>
                        ) : null}
                      </Text>
                      {contact.email ? (
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748b" }}>
                          {contact.email}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#0d9488", borderRadius: 6 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ffffff" }}>Add</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "#334155" : "#e2e8f0" }} />
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8" }}>OR ADD SOMEONE NEW</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "#334155" : "#e2e8f0" }} />
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

        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748b", lineHeight: 18 }}>
          Add an email to send them a direct invite. Without one, share the group link so they can join.
        </Text>

        <Button
          variant="default"
          onPress={handleAddMember}
          disabled={addingMember || !addMemberName.trim()}
        >
          {addingMember ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ffffff" }}>
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
            <Share2 size={16} color="#0d9488" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0d9488" }}>
              Or share invite link instead
            </Text>
          </Pressable>
        )}
      </BottomSheetModal>

      {/* Share / QR Modal */}
      <BottomSheetModal visible={showShareModal} onClose={() => { setShowShareModal(false); setShowQR(false); }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            Invite to {group.name}
          </Text>
          <Pressable onPress={() => { setShowShareModal(false); setShowQR(false); }}>
            <X size={22} color="#64748b" />
          </Pressable>
        </View>

        {group.inviteCode && (
          <Pressable
            onPress={handleCopyLink}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
              paddingHorizontal: 16,
              paddingVertical: 12,
              width: "100%",
            }}
          >
            <Text
              style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#64748b" }}
              numberOfLines={1}
            >
              {getInviteUrl(group.inviteCode)}
            </Text>
            {copied ? (
              <Check size={18} color="#10b981" />
            ) : (
              <Copy size={18} color="#0d9488" />
            )}
          </Pressable>
        )}

        {group.inviteCode && (
          showQR ? (
            <View
              style={{
                padding: 16,
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#e2e8f0",
                alignItems: "center",
                alignSelf: "center",
              }}
            >
              <QRCode
                value={getInviteUrl(group.inviteCode)}
                size={180}
                color={isDark ? "#f1f5f9" : "#0f172a"}
                backgroundColor={isDark ? "#0f172a" : "#ffffff"}
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
                borderColor: isDark ? "#334155" : "#e2e8f0",
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

        <View style={{ width: "100%", gap: 10 }}>
          <Button variant="default" onPress={handleShare}>
            <View className="flex-row items-center gap-2">
              <Share2 size={18} color="#ffffff" />
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
            <RefreshCw size={14} color="#94a3b8" />
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#94a3b8" }}>
              {regenerating ? "Regenerating..." : "Regenerate invite link"}
            </Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
