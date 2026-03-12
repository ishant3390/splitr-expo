import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Share,
  RefreshControl,
  TextInput,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  Plus,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal,
  UserPlus,
  HandCoins,
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  User,
  Search,
  ArrowUpDown,
  PlusCircle,
  Receipt,
  Bell,
  BellOff,
  MoreVertical,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { groupsApi, contactsApi, inviteApi, expensesApi } from "@/lib/api";
import { useArchiveGroup, useDeleteGroup } from "@/lib/hooks";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCents, formatDate, getInitials, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticLight, hapticSuccess, hapticWarning, hapticSelection } from "@/lib/haptics";
import { dedupeMembers, aggregateByPerson, aggregateByCategory, aggregateByMonth, filterExpenses, sortExpenses, resolvePayerName } from "@/lib/screen-helpers";
import * as Clipboard from "expo-clipboard";
import { SkeletonList } from "@/components/ui/skeleton";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import type { GroupDto, GroupMemberDto, ExpenseDto, ExpenseCategory, ContactDto } from "@/lib/types";

const iconMap: Record<ExpenseCategory, typeof Utensils> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  other: MoreHorizontal,
};

function getInviteUrl(inviteCode: string) {
  return `https://splitr.ai/invite/${inviteCode}`;
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/groups"));
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  // Insights
  const [showInsights, setShowInsights] = useState(false);

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

  // Group action (archive/delete) state
  const [showGroupActions, setShowGroupActions] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const archiveMutation = useArchiveGroup();
  const deleteMutation = useDeleteGroup();

  // Delete expense state
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseDto | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  // Undo delete: holds the pending delete timer
  const pendingDeleteRef = useRef<{ expense: ExpenseDto; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Expense pagination
  const [expenseCursor, setExpenseCursor] = useState<string | undefined>(undefined);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false);
  const [loadingMoreExpenses, setLoadingMoreExpenses] = useState(false);

  // Notification toggle for current user in this group
  const [groupNotificationsEnabled, setGroupNotificationsEnabled] = useState(true);
  const [togglingNotifications, setTogglingNotifications] = useState(false);

  const loadData = async () => {
    try {
      const token = await getToken();
      const [groupData, membersData, expensesResponse] = await Promise.all([
        groupsApi.get(id, token!),
        groupsApi.listMembers(id, token!),
        groupsApi.listExpenses(id, token!, { limit: "20" }),
      ]);
      setGroup(groupData);
      const dedupedMembers = dedupeMembers(membersData);
      setMembers(dedupedMembers);
      setExpenses(expensesResponse.data ?? []);
      setExpenseCursor(expensesResponse.pagination?.nextCursor);
      setHasMoreExpenses(expensesResponse.pagination?.hasMore ?? false);

      // Initialize per-group notification preference from current user's member record
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

  const loadMoreExpenses = async () => {
    if (!hasMoreExpenses || loadingMoreExpenses || !expenseCursor) return;
    setLoadingMoreExpenses(true);
    try {
      const token = await getToken();
      const response = await groupsApi.listExpenses(id, token!, {
        cursor: expenseCursor,
        limit: "20",
      });
      setExpenses((prev) => [...prev, ...(response.data ?? [])]);
      setExpenseCursor(response.pagination?.nextCursor);
      setHasMoreExpenses(response.pagination?.hasMore ?? false);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingMoreExpenses(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
    setGroupNotificationsEnabled(newValue); // optimistic
    try {
      const token = await getToken();
      await groupsApi.updateMember(id, myMember.id, { notificationsEnabled: newValue }, token!);
      hapticSuccess();
    } catch {
      setGroupNotificationsEnabled(!newValue); // revert
      hapticWarning();
      toast.show("Failed to update notification preference", "error");
    } finally {
      setTogglingNotifications(false);
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
        // Filter out people already in this group
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
        await groupsApi.inviteByEmail(id, { email }, token!);
        hapticSuccess();
        toast.success(`Invite sent to ${email}`);
      } else {
        await groupsApi.addGuestMember(id, { name }, token!);
        hapticSuccess();
        toast.success(`${name} added to group.`);
      }
      setAddMemberName("");
      setAddMemberEmail("");
      setShowAddMember(false);
      const updated = await groupsApi.listMembers(id, token!);
      setMembers(dedupeMembers(updated));
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
      if (contact.userId && contact.email) {
        await groupsApi.addMember(id, { email: contact.email }, token!);
      } else {
        await groupsApi.addGuestMember(
          id,
          { name: contact.name, email: contact.email },
          token!
        );
      }
      hapticSuccess();
      toast.success(`${contact.name} added to group.`);
      setShowAddMember(false);
      const updated = await groupsApi.listMembers(id, token!);
      setMembers(dedupeMembers(updated));
    } catch {
      toast.error("Failed to add member. They may already be in the group.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      const token = await getToken();
      await groupsApi.removeMember(id, memberToRemove.id, token!);
      toast.success("Member removed from group.");
      const updated = await groupsApi.listMembers(id, token!);
      setMembers(dedupeMembers(updated));
    } catch {
      toast.error("Failed to remove member. Try again.");
    } finally {
      setRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  const handleDeleteExpenseWithUndo = (expense: ExpenseDto) => {
    // Cancel any previous pending delete
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      pendingDeleteRef.current = null;
    }

    // Optimistically remove from UI
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));

    // Set a timer to actually delete after 5 seconds
    const timer = setTimeout(async () => {
      pendingDeleteRef.current = null;
      try {
        const token = await getToken();
        await expensesApi.delete(expense.id, token!);
      } catch {
        // If API fails, restore the expense
        setExpenses((prev) => [...prev, expense]);
        toast.error("Failed to delete expense.");
      }
    }, 5000);

    pendingDeleteRef.current = { expense, timer };

    toast.info(`"${expense.description}" deleted`, {
      duration: 5000,
      action: {
        label: "Undo",
        onPress: () => {
          if (pendingDeleteRef.current?.expense.id === expense.id) {
            clearTimeout(pendingDeleteRef.current.timer);
            pendingDeleteRef.current = null;
          }
          setExpenses((prev) => [...prev, expense].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        },
      },
    });
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setExpenseToDelete(null);
    handleDeleteExpenseWithUndo(expenseToDelete);
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
      const updated = await inviteApi.regenerate(id, token!);
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
          <Button variant="ghost" size="icon" onPress={goBack}>
            <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
          </Button>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={Receipt}
            iconColor="#94a3b8"
            title="Group not found"
            subtitle="This group may have been deleted or is no longer available."
            actionLabel="Go Home"
            onAction={() => router.replace("/(tabs)")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);
  const isArchived = group.isArchived === true;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">
          {group.emoji ? `${group.emoji} ` : ""}{group.name}
        </Text>
        <View className="flex-row items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setShowShareModal(true)}
            accessibilityLabel="Share"
          >
            <Share2 size={22} color="#0d9488" />
          </Button>
          {!isArchived && (
            <Button
              variant="ghost"
              size="icon"
              onPress={() => router.push({ pathname: "/(tabs)/add", params: { returnGroupId: id } })}
            >
              <Plus size={24} color="#0d9488" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setShowGroupActions(true)}
            accessibilityLabel="More options"
          >
            <MoreVertical size={22} color={isDark ? "#94a3b8" : "#64748b"} />
          </Button>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
      >
        {/* Archived banner */}
        {isArchived && (
          <Card className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <Text className="text-sm font-sans-semibold text-amber-800 dark:text-amber-200">
              This group is archived
            </Text>
            <Text className="text-xs text-amber-600 dark:text-amber-400 font-sans mt-1">
              No new expenses or settlements can be added. You can still view history and balances.
            </Text>
          </Card>
        )}

        {/* Group Info */}
        <View className="flex-row items-center gap-3 pt-5 pb-3">
          <GroupAvatar name={group.name} emoji={group.emoji} groupType={group.groupType} id={group.id} size="lg" />
          <View className="flex-1">
            <Text className="text-xl font-sans-bold text-foreground">{group.name}</Text>
            {group.description ? (
              <Text className="text-sm text-muted-foreground font-sans mt-0.5" numberOfLines={2}>
                {group.description}
              </Text>
            ) : null}
            <Text className="text-xs text-muted-foreground font-sans mt-1">
              {members.length} {members.length === 1 ? "member" : "members"} {group.defaultCurrency ? `\u00B7 ${group.defaultCurrency}` : ""}
            </Text>
          </View>
        </View>

        {/* Members */}
        <View className="pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-sans-semibold text-muted-foreground">
              MEMBERS ({members.length})
            </Text>
            {!isArchived && (
              <Pressable
                onPress={() => setShowAddMember(true)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
              >
                <UserPlus size={14} color="#0d9488" />
                <Text className="text-xs font-sans-semibold text-primary">Add</Text>
              </Pressable>
            )}
          </View>

          {members.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingRight: 8 }}>
              <View className="flex-row gap-3" style={{ overflow: "visible" }}>
                {members.map((member) => {
                  const memberName =
                    member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
                  const balance = member.balance ?? 0;

                  return (
                    <View key={member.id} style={{ position: "relative", overflow: "visible" }}>
                      <Card className="p-3 items-center w-24">
                        <Avatar
                          src={member.user?.avatarUrl}
                          fallback={getInitials(memberName)}
                          size="md"
                        />
                        <Text
                          className="text-xs font-sans-medium text-card-foreground mt-2 text-center"
                          numberOfLines={1}
                        >
                          {memberName.split(" ")[0]}
                        </Text>
                        <Text
                          className={cn(
                            "text-xs font-sans-semibold mt-0.5",
                            balance > 0
                              ? "text-success"
                              : balance < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {balance > 0 ? "+" : ""}
                          {formatCents(balance)}
                        </Text>
                      </Card>
                      <Pressable
                        onPress={() => { hapticWarning(); setMemberToRemove(member); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive items-center justify-center"
                      >
                        <X size={11} color="#ffffff" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Summary card */}
        <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-muted-foreground font-sans">Total Spent</Text>
              <Text selectable className="text-xl font-sans-bold text-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                {formatCents(totalSpent)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground font-sans">Per Person (avg)</Text>
              <Text selectable className="text-xl font-sans-bold text-primary" style={{ fontVariant: ["tabular-nums"] }}>
                {formatCents(members.length > 0 ? totalSpent / members.length : 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Settle Up button */}
        {!isArchived && (
          <Pressable
            onPress={() => router.push({ pathname: "/settle-up", params: { groupId: id } })}
            className="mb-4"
          >
            <Card className="p-4 flex-row items-center justify-center gap-2 bg-success/10 border-success/20">
              <HandCoins size={20} color="#10b981" />
              <Text className="text-base font-sans-semibold text-success">
                Settle Up
              </Text>
            </Card>
          </Pressable>
        )}

        {/* Group notification toggle */}
        <Pressable onPress={toggleGroupNotifications} disabled={togglingNotifications} className="mb-4">
          <Card className="p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              {groupNotificationsEnabled ? (
                <Bell size={18} color={isDark ? "#94a3b8" : "#64748b"} />
              ) : (
                <BellOff size={18} color={isDark ? "#94a3b8" : "#64748b"} />
              )}
              <View>
                <Text className="text-sm font-sans-medium text-foreground">
                  Group Notifications
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">
                  {groupNotificationsEnabled ? "You'll be notified about this group" : "Notifications muted for this group"}
                </Text>
              </View>
            </View>
            <View
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: groupNotificationsEnabled ? "#0d9488" : (isDark ? "#334155" : "#cbd5e1"),
                justifyContent: "center",
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#ffffff",
                  alignSelf: groupNotificationsEnabled ? "flex-end" : "flex-start",
                }}
              />
            </View>
          </Card>
        </Pressable>

        {/* Insights */}
        {expenses.length > 0 && (
          <View className="mb-4">
            <Pressable
              onPress={() => { hapticLight(); setShowInsights(!showInsights); }}
              className="flex-row items-center justify-between mb-2"
            >
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                INSIGHTS
              </Text>
              <Text className="text-xs font-sans-medium text-primary">
                {showInsights ? "Hide" : "Show"}
              </Text>
            </Pressable>
            {showInsights && (() => {
              const personList = aggregateByPerson(expenses);
              const maxSpent = personList[0]?.total || 1;

              const catList = aggregateByCategory(expenses, 5);
              const catTotal = catList.reduce((s, [, v]) => s + v, 0) || 1;
              const catColors = ["#0d9488", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444"];

              return (
                <Card className="p-4 gap-4">
                  {/* By Person */}
                  <View>
                    <Text className="text-xs font-sans-semibold text-muted-foreground mb-2">BY PERSON</Text>
                    <View className="gap-2">
                      {personList.map((p) => (
                        <View key={p.name} className="gap-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-sans-medium text-foreground">{p.name}</Text>
                            <Text className="text-xs font-sans-semibold text-foreground">{formatCents(p.total)}</Text>
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
                              {cat} ({formatCents(amount)})
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Monthly Breakdown */}
                  {(() => {
                    const monthlyData = aggregateByMonth(expenses);
                    if (monthlyData.length < 2) return null;
                    const maxMonthly = Math.max(...monthlyData.map((m) => m.total));
                    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
                                  {formatCents(m.total)}
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
              );
            })()}
          </View>
        )}

        {/* Expenses header with search & sort */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-sans-semibold text-muted-foreground">
            EXPENSES ({expenses.length})
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => { hapticLight(); setShowSearch(!showSearch); }}>
              <Search size={16} color={showSearch ? "#0d9488" : "#94a3b8"} />
            </Pressable>
            <Pressable onPress={() => {
              hapticSelection();
              setSortBy(sortBy === "date" ? "amount" : "date");
            }}>
              <View className="flex-row items-center gap-1">
                <ArrowUpDown size={14} color="#94a3b8" />
                <Text className="text-xs font-sans text-muted-foreground">
                  {sortBy === "date" ? "Date" : "Amount"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Search input */}
        {showSearch && (
          <View className="mb-3 flex-row items-center bg-muted rounded-xl px-3 py-2 gap-2">
            <Search size={16} color="#94a3b8" />
            <TextInput
              placeholder="Search expenses..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: isDark ? "#f1f5f9" : "#0f172a" }}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <X size={16} color="#94a3b8" />
              </Pressable>
            )}
          </View>
        )}

        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            iconColor="#0d9488"
            title={isArchived ? "No expenses" : "No expenses yet"}
            subtitle={isArchived ? "This archived group has no expense history" : "Add your first expense to start tracking"}
            actionLabel={isArchived ? undefined : "Add Expense"}
            onAction={isArchived ? undefined : () => router.push({ pathname: "/(tabs)/add", params: { returnGroupId: id } })}
          />
        ) : (() => {
          const filtered = filterExpenses(expenses, searchQuery) as ExpenseDto[];

          if (filtered.length === 0) {
            return (
              <EmptyState
                icon={Search}
                iconColor="#64748b"
                title={`No results for "${searchQuery}"`}
                subtitle="Try a different search term"
              />
            );
          }

          const sorted = sortExpenses(filtered, sortBy) as ExpenseDto[];

          return (
          <View className="gap-2">
            {sorted
              .map((expense, idx) => {
                const categoryKey = (expense.category?.icon ??
                  expense.category?.name ??
                  "other") as ExpenseCategory;
                const Icon = iconMap[categoryKey] ?? MoreHorizontal;
                const payer = expense.payers?.[0];
                const payerName = resolvePayerName(payer, members, expense.createdBy);
                const splitCount = expense.splits?.length ?? 1;
                const expenseDate = expense.date || expense.createdAt;

                return (
                  <Animated.View
                    key={expense.id}
                    entering={FadeInDown.delay(idx * 50).duration(300).springify()}
                  >
                  <SwipeableRow
                    onEdit={isArchived ? undefined : () => {
                      hapticLight();
                      router.push({
                        pathname: "/edit-expense/[id]",
                        params: { id: expense.id, groupId: id },
                      });
                    }}
                    onDelete={isArchived ? undefined : () => {
                      hapticWarning();
                      handleDeleteExpenseWithUndo(expense);
                    }}
                  >
                  <Pressable
                    onPress={isArchived ? undefined : () => {
                      hapticLight();
                      router.push({
                        pathname: "/edit-expense/[id]",
                        params: { id: expense.id, groupId: id },
                      });
                    }}
                  >
                    <Card className="p-4">
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                          <Icon size={20} color="#0d9488" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-sans-semibold text-card-foreground">
                            {expense.description}
                          </Text>
                          <Text className="text-xs text-muted-foreground font-sans">
                            {payerName} paid
                            {expenseDate ? ` \u00B7 ${formatDate(expenseDate)}` : ""}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text selectable className="text-sm font-sans-bold text-foreground" style={{ fontVariant: ["tabular-nums"] }}>
                            {formatCents(expense.amountCents)}
                          </Text>
                          <Text className="text-xs text-muted-foreground font-sans">
                            {splitCount} {splitCount === 1 ? "person" : "people"}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                  </SwipeableRow>
                  </Animated.View>
                );
              })}

            {/* Load More */}
            {hasMoreExpenses && !searchQuery && (
              <Pressable
                onPress={loadMoreExpenses}
                disabled={loadingMoreExpenses}
                className="py-3 items-center"
              >
                {loadingMoreExpenses ? (
                  <ActivityIndicator size="small" color="#0d9488" />
                ) : (
                  <Text className="text-sm font-sans-semibold text-primary">
                    Load more expenses
                  </Text>
                )}
              </Pressable>
            )}
          </View>
          );
        })()}
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

      {/* Delete Expense Confirmation */}
      <ConfirmModal
        visible={!!expenseToDelete}
        title="Delete Expense"
        message={`Delete "${expenseToDelete?.description ?? "this expense"}"? This will update all balances.`}
        confirmLabel={deletingExpense ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* Add Member Modal */}
      <BottomSheetModal visible={showAddMember} onClose={() => { setShowAddMember(false); setAddMemberEmail(""); }} keyboardAvoiding>
        {/* Modal header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            Add Member
          </Text>
          <Pressable onPress={() => { setShowAddMember(false); setAddMemberEmail(""); }}>
            <X size={22} color="#64748b" />
          </Pressable>
        </View>

        {/* Contacts from other groups */}
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

        {/* Name + optional email */}
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

        {/* Add button */}
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

        {/* Share link shortcut */}
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
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            Invite to {group.name}
          </Text>
          <Pressable onPress={() => { setShowShareModal(false); setShowQR(false); }}>
            <X size={22} color="#64748b" />
          </Pressable>
        </View>

        {/* Invite link */}
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

        {/* QR Code — hidden by default */}
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

        {/* Buttons */}
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

      {/* Group Actions Sheet */}
      <BottomSheetModal visible={showGroupActions} onClose={() => setShowGroupActions(false)}>
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            Group Options
          </Text>
          <Pressable onPress={() => setShowGroupActions(false)}>
            <X size={22} color="#64748b" />
          </Pressable>
        </View>

        {isArchived ? (
          <Pressable
            onPress={() => {
              setShowGroupActions(false);
              archiveMutation.mutateAsync({ groupId: id, version: group.version ?? 0, archive: false })
                .then(() => toast.success(`"${group.name}" restored.`))
                .catch(() => toast.error("Failed to restore group."));
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: isDark ? "#334155" : "#f1f5f9" }}
          >
            <RotateCcw size={20} color="#0d9488" />
            <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: isDark ? "#f1f5f9" : "#0f172a" }}>
              Restore Group
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { setShowGroupActions(false); setShowArchiveConfirm(true); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: isDark ? "#334155" : "#f1f5f9" }}
          >
            <Archive size={20} color="#f59e0b" />
            <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: isDark ? "#f1f5f9" : "#0f172a" }}>
              Archive Group
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => { setShowGroupActions(false); setShowDeleteConfirm(true); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 }}
        >
          <Trash2 size={20} color="#ef4444" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#ef4444" }}>
            Delete Group
          </Text>
        </Pressable>
      </BottomSheetModal>

      {/* Archive Confirmation */}
      <ConfirmModal
        visible={showArchiveConfirm}
        title="Archive Group"
        message={`Archive "${group?.name}"? No new expenses or settlements can be added while archived. Balances are preserved and you can restore it anytime.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={async () => {
          try {
            await archiveMutation.mutateAsync({ groupId: id, version: group.version ?? 0, archive: true });
            toast.success(`"${group?.name}" archived.`);
          } catch {
            toast.error("Failed to archive group.");
          } finally {
            setShowArchiveConfirm(false);
          }
        }}
        onCancel={() => setShowArchiveConfirm(false)}
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
            await deleteMutation.mutateAsync(id);
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
    </SafeAreaView>
  );
}
