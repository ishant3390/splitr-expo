import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Platform, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { hapticLight, hapticWarning, hapticSuccess, hapticSelection } from "@/lib/haptics";
import { useRouter } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { ChevronRight, Plus, Archive, Trash2, X, Users, RotateCcw, AlertTriangle, Search, MoreVertical, UserPlus } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { useGroups, useArchiveGroup, useDeleteGroup, useUserBalance } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { cn, extractInviteCode, formatCents, formatRelativeTime } from "@/lib/utils";
import { MultiCurrencyAmount } from "@/components/ui/multi-currency-amount";
import { SHADOWS } from "@/lib/shadows";
import { SkeletonList } from "@/components/ui/skeleton";
import { GroupDto } from "@/lib/types";
import { groupsApi } from "@/lib/api";
import { parseApiError } from "@/lib/errors";
import { hasUnsettledBalances } from "@/lib/screen-helpers";
import { useAuth } from "@clerk/clerk-expo";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";

export default function GroupsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const { data: groups = [], isLoading: loading, error: groupsError, refetch } = useGroups(filter);
  const { data: balanceData, refetch: refetchBalance } = useUserBalance();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Join group modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinInputError, setJoinInputError] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    (balanceData?.groupBalances ?? []).forEach((gb) => map.set(gb.groupId, gb.balanceCents));
    return map;
  }, [balanceData?.groupBalances]);

  // Long-press action sheet
  const [selectedGroup, setSelectedGroup] = useState<GroupDto | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Archive confirmation
  const [groupToArchive, setGroupToArchive] = useState<GroupDto | null>(null);
  const [archiveHasBalances, setArchiveHasBalances] = useState(false);
  const [checkingBalances, setCheckingBalances] = useState(false);

  // Delete confirmation
  const [groupToDelete, setGroupToDelete] = useState<GroupDto | null>(null);

  const isFocused = useIsFocused();
  const archiveMutation = useArchiveGroup();
  const deleteMutation = useDeleteGroup();
  const deleting = deleteMutation.isPending;

  // Primary: event-based refetch (reliable on native)
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchBalance();
    }, [refetch, refetchBalance])
  );

  // Fallback: state-based refetch (reliable on web)
  useEffect(() => {
    if (isFocused) { refetch(); refetchBalance(); }
  }, [isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchBalance()]);
    setRefreshing(false);
  }, [refetch, refetchBalance]);

  const handleArchiveConfirm = async () => {
    if (!groupToArchive) return;
    try {
      await archiveMutation.mutateAsync({
        groupId: groupToArchive.id,
        version: groupToArchive.version ?? 0,
        archive: true,
      });
      hapticSuccess();
      toast.success(`"${groupToArchive.name}" archived.`);
      setGroupToArchive(null);
      setArchiveHasBalances(false);
    } catch {
      toast.error("Failed to archive group.");
    }
  };

  const handleUnarchive = async () => {
    if (!selectedGroup) return;
    try {
      await archiveMutation.mutateAsync({
        groupId: selectedGroup.id,
        version: selectedGroup.version ?? 0,
        archive: false,
      });
      hapticSuccess();
      toast.success(`"${selectedGroup.name}" restored.`);
      setShowActions(false);
      setSelectedGroup(null);
    } catch {
      toast.error("Failed to restore group.");
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    try {
      await deleteMutation.mutateAsync(groupToDelete.id);
      hapticSuccess();
      toast.success(`"${groupToDelete.name}" deleted.`);
      setGroupToDelete(null);
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      if (apiErr?.code === "ERR-400") {
        toast.error("Cannot delete — this group has outstanding balances. Settle up first.");
      } else {
        toast.error("Failed to delete group.");
      }
    }
  };

  const handleLongPress = (group: GroupDto) => {
    hapticWarning();
    setSelectedGroup(group);
    setShowActions(true);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Hero Section */}
      <LinearGradient
        colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ overflow: "hidden", paddingTop: insets.top }}
      >
        {/* Watermark */}
        <View
          style={{ position: "absolute", bottom: -30, right: -20, opacity: 0.06 }}
          pointerEvents="none"
        >
          <Users size={180} color={palette.white} strokeWidth={1} />
        </View>

        {/* Decorative orb */}
        <View
          style={{
            position: "absolute", top: -30, left: -30,
            width: 100, height: 100, borderRadius: radius.full,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
          pointerEvents="none"
        />

        {/* Title row + actions */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <Text className="text-2xl font-sans-bold" style={{ color: palette.white }}>
            Groups
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable accessibilityLabel="Toggle search" onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}>
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: showSearch ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }}
              >
                <Search size={18} color={palette.white} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => { setShowJoinModal(true); setInviteCodeInput(""); setJoinInputError(null); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: radius.md, borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
            >
              <UserPlus size={15} color={palette.white} />
              <Text className="text-sm font-sans-semibold" style={{ color: palette.white }}>Join</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/create-group")}
              accessibilityRole="button"
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: radius.md,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            >
              <Plus size={15} color={palette.white} />
              <Text className="text-sm font-sans-semibold" style={{ color: palette.white }}>New</Text>
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        {showSearch && (
          <View
            className="mx-5 mb-2 flex-row items-center rounded-xl px-3 py-2 gap-2"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <Search size={16} color="rgba(255,255,255,0.7)" />
            <TextInput
              placeholder="Search groups..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              style={{ flex: 1, fontSize: fs.md, fontFamily: ff.regular, color: palette.white }}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
            {searchQuery.length > 0 && (
              <Pressable accessibilityLabel="Clear search" onPress={() => setSearchQuery("")}>
                <X size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        )}

        {/* Balance summary (active filter only) */}
        {filter === "active" && balanceData && balanceData.netBalanceCents !== 0 && (
          <View className="px-5 pb-3">
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: radius.lg,
                padding: 16,
              }}
            >
              {/* Net balance — hero number */}
              <View className="items-center pb-3">
                <Text className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Overall balance
                </Text>
                <Text
                  selectable
                  className="text-3xl font-sans-bold mt-1"
                  style={{
                    color: palette.white,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {balanceData.netBalanceCents > 0 ? "+" : "-"}
                  {formatCents(Math.abs(balanceData.netBalanceCents), balanceData.totalOwedByCurrency?.[0]?.currency ?? balanceData.totalOwingByCurrency?.[0]?.currency)}
                </Text>
                <Text
                  className="text-xs font-sans mt-0.5"
                  style={{
                    color: balanceData.netBalanceCents > 0 ? "#86efac" : "#fca5a5",
                  }}
                >
                  {balanceData.netBalanceCents > 0 ? "you are owed" : "you owe"}
                </Text>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 12 }} />

              {/* Owed / Owe breakdown */}
              <View className="flex-row">
                <View className="flex-1 items-center">
                  <Text className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Owed to you
                  </Text>
                  {(balanceData.totalOwedByCurrency?.length ?? 0) > 1 ? (
                    <MultiCurrencyAmount
                      amounts={balanceData.totalOwedByCurrency ?? []}
                      selectable
                      className="text-lg font-sans-bold mt-0.5"
                      style={{ color: "#86efac", fontVariant: ["tabular-nums"] }}
                    />
                  ) : (
                    <Text
                      selectable
                      className="text-lg font-sans-bold mt-0.5"
                      style={{ color: "#86efac", fontVariant: ["tabular-nums"] }}
                    >
                      {formatCents(balanceData.totalOwedCents, balanceData.totalOwedByCurrency?.[0]?.currency)}
                    </Text>
                  )}
                </View>
                <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
                <View className="flex-1 items-center">
                  <Text className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.6)" }}>
                    You owe
                  </Text>
                  {(balanceData.totalOwingByCurrency?.length ?? 0) > 1 ? (
                    <MultiCurrencyAmount
                      amounts={balanceData.totalOwingByCurrency ?? []}
                      selectable
                      className="text-lg font-sans-bold mt-0.5"
                      style={{ color: "#fca5a5", fontVariant: ["tabular-nums"] }}
                    />
                  ) : (
                    <Text
                      selectable
                      className="text-lg font-sans-bold mt-0.5"
                      style={{ color: "#fca5a5", fontVariant: ["tabular-nums"] }}
                    >
                      {formatCents(balanceData.totalOwesCents, balanceData.totalOwingByCurrency?.[0]?.currency)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Active / Archived filter tabs */}
        <View
          className="flex-row mx-5 mb-4 rounded-xl p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <Pressable
            onPress={() => { hapticSelection(); setFilter("active"); }}
            className="flex-1 items-center py-2 rounded-lg"
            style={filter === "active" ? { backgroundColor: "rgba(255,255,255,0.2)" } : undefined}
          >
            <Text
              className="text-sm font-sans-semibold"
              style={{ color: filter === "active" ? palette.white : "rgba(255,255,255,0.5)" }}
            >
              Active
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { hapticSelection(); setFilter("archived"); }}
            className="flex-1 items-center py-2 rounded-lg"
            style={filter === "archived" ? { backgroundColor: "rgba(255,255,255,0.2)" } : undefined}
          >
            <Text
              className="text-sm font-sans-semibold"
              style={{ color: filter === "archived" ? palette.white : "rgba(255,255,255,0.5)" }}
            >
              Archived
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 px-5 pt-3">
          <SkeletonList count={5} type="group" />
        </View>
      ) : groupsError && groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={AlertTriangle}
            iconColor={c.destructive}
            title="Couldn't load groups"
            subtitle="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-24 pt-4 gap-3"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          ListEmptyComponent={
            filter === "active" ? (
              <View>
                <EmptyState
                  icon={Users}
                  iconColor={c.primary}
                  title="No groups yet"
                  subtitle="Split expenses with friends, roommates, or travel buddies"
                  actionLabel="Create Your First Group"
                  onAction={() => router.push("/create-group")}
                />
                <Pressable
                  onPress={() => { setShowJoinModal(true); setInviteCodeInput(""); setJoinInputError(null); }}
                  className="items-center mt-4"
                >
                  <Text className="text-sm font-sans-medium text-primary">Have an invite code?</Text>
                </Pressable>
              </View>
            ) : (
              <EmptyState
                icon={Archive}
                iconColor={palette.slate400}
                title="No archived groups"
                subtitle={Platform.OS === "web" ? "Tap ··· or right-click a group to archive it" : "Long-press or tap ··· on a group to archive it"}
              />
            )
          }
          renderItem={({ item: group, index }: { item: GroupDto; index: number }) => {
            const balanceCents = balanceMap.get(group.id);
            const balanceKnown = balanceCents !== undefined;
            const hasBalance = balanceKnown && balanceCents !== 0;
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(300).springify()}>
              <Pressable
                onPress={() => { hapticLight(); router.push(`/(tabs)/groups/${group.id}`); }}
                onLongPress={() => handleLongPress(group)}
                delayLongPress={400}
                {...(Platform.OS === "web" ? {
                  onContextMenu: (e: any) => { e.preventDefault(); handleLongPress(group); }
                } : {})}
              >
                <View style={SHADOWS.card}>
                  <Card className="p-0 overflow-hidden">
                    <View className="flex-row">
                      <View
                        style={{
                          width: 4,
                          backgroundColor: hasBalance
                            ? (balanceCents! > 0 ? palette.emerald500 : palette.red500)
                            : palette.slate300,
                          borderTopLeftRadius: 12,
                          borderBottomLeftRadius: 12,
                        }}
                      />
                      <View className="flex-1 p-3.5">
                        <View className="flex-row items-center gap-3">
                          <GroupAvatar
                            name={group.name}
                            emoji={group.emoji}
                            groupType={group.groupType}
                            id={group.id}
                          />
                          <View className="flex-1">
                            <Text className="text-base font-sans-semibold text-card-foreground" numberOfLines={1}>
                              {group.name}
                            </Text>
                            <View className="flex-row items-center gap-1.5 mt-0.5">
                              <Users size={12} color={c.mutedForeground} />
                              <Text className="text-xs font-sans text-muted-foreground">
                                {group.memberCount ?? 0} members
                              </Text>
                              {group.updatedAt && (
                                <>
                                  <Text className="text-xs text-muted-foreground">·</Text>
                                  <Text className="text-xs font-sans text-muted-foreground">
                                    {formatRelativeTime(group.updatedAt)}
                                  </Text>
                                </>
                              )}
                            </View>
                          </View>
                          <Pressable
                            onPress={() => { hapticWarning(); handleLongPress(group); }}
                            hitSlop={8}
                            accessibilityLabel="Group actions"
                            style={{ padding: 4 }}
                          >
                            <MoreVertical size={18} color={c.mutedForeground} />
                          </Pressable>
                        </View>
                        {/* Balance row */}
                        <View
                          className="mt-2.5 pt-2.5 flex-row items-center justify-between"
                          style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}
                        >
                          <Text className="text-xs font-sans text-muted-foreground">
                            Your balance
                          </Text>
                          {balanceKnown && (
                            <View
                              className={cn(
                                "px-2 py-0.5 rounded-full",
                                hasBalance
                                  ? (balanceCents! > 0 ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40")
                                  : "bg-muted"
                              )}
                            >
                              <Text
                                className={cn(
                                  "text-sm font-sans-bold",
                                  hasBalance
                                    ? (balanceCents! > 0 ? "text-emerald-600" : "text-red-500")
                                    : "text-muted-foreground"
                                )}
                                style={{ fontVariant: ["tabular-nums"] }}
                              >
                                {hasBalance
                                  ? `${balanceCents! > 0 ? "+" : "-"}${formatCents(Math.abs(balanceCents!), group.defaultCurrency)}`
                                  : "settled up"}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </Card>
                </View>
              </Pressable>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Action Sheet Modal */}
      <BottomSheetModal visible={showActions} onClose={() => setShowActions(false)}>
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ fontSize: fs.xl, fontFamily: ff.bold, color: c.foreground }}>
            {selectedGroup?.name}
          </Text>
          <Pressable onPress={() => setShowActions(false)}>
            <X size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {filter === "active" ? (
          <Pressable
            onPress={async () => {
              if (!selectedGroup) return;
              setShowActions(false);
              setCheckingBalances(true);
              try {
                const token = await getToken();
                const members = await groupsApi.listMembers(selectedGroup.id, token!);
                setArchiveHasBalances(hasUnsettledBalances(members));
              } catch {
                setArchiveHasBalances(false);
              } finally {
                setCheckingBalances(false);
                setGroupToArchive(selectedGroup);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 4,
              borderBottomWidth: 1,
              borderBottomColor: c.muted,
            }}
          >
            <Archive size={20} color={c.warning} />
            <Text style={{ fontSize: fs.lg, fontFamily: ff.medium, color: c.foreground }}>
              Archive Group
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleUnarchive}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 4,
              borderBottomWidth: 1,
              borderBottomColor: c.muted,
            }}
          >
            <RotateCcw size={20} color={c.primary} />
            <Text style={{ fontSize: fs.lg, fontFamily: ff.medium, color: c.foreground }}>
              Restore Group
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            setShowActions(false);
            setGroupToDelete(selectedGroup);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: 4,
          }}
        >
          <Trash2 size={20} color={c.destructive} />
          <Text style={{ fontSize: fs.lg, fontFamily: ff.medium, color: c.destructive }}>
            Delete Group
          </Text>
        </Pressable>
      </BottomSheetModal>

      {/* Balance check loading */}
      {checkingBalances && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 999 }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      )}

      {/* Archive Confirmation */}
      <ConfirmModal
        visible={!!groupToArchive}
        title="Archive Group"
        message={
          archiveHasBalances
            ? `This group has outstanding balances. Archiving will prevent new expenses and settlements until you restore it.\n\nYou can restore the group at any time to settle up.`
            : `Archive "${groupToArchive?.name}"? No new expenses can be added while archived. You can restore it anytime.`
        }
        confirmLabel={archiveHasBalances ? "Archive Anyway" : "Archive"}
        cancelLabel="Cancel"
        onConfirm={handleArchiveConfirm}
        onCancel={() => { setGroupToArchive(null); setArchiveHasBalances(false); }}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={!!groupToDelete}
        title="Delete Group"
        message={`Permanently delete "${groupToDelete?.name}"? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setGroupToDelete(null)}
      />

      {/* Join Group Modal */}
      <BottomSheetModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        keyboardAvoiding
        modalTestID="groups-join-modal"
      >
        <Text style={{ fontSize: fs.xl, fontFamily: ff.bold, color: c.foreground, marginBottom: 4 }}>
          Join a Group
        </Text>
        <Text style={{ fontSize: fs.base, fontFamily: ff.regular, color: c.mutedForeground, marginBottom: 16 }}>
          Enter an invite code or paste an invite link
        </Text>
        <TextInput
          placeholder="Invite code or link"
          value={inviteCodeInput}
          onChangeText={(text) => { setInviteCodeInput(text); setJoinInputError(null); }}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: joinInputError ? c.destructive : c.border,
            borderRadius: radius.DEFAULT,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: fs.lg,
            fontFamily: ff.regular,
            color: c.foreground,
            backgroundColor: c.secondary,
            marginBottom: 4,
          }}
          placeholderTextColor={c.placeholder}
        />
        {joinInputError && (
          <Text style={{ fontSize: fs.base, fontFamily: ff.regular, color: c.destructive, marginBottom: 8 }}>
            {joinInputError}
          </Text>
        )}
        <Button
          variant="default"
          className="mt-3"
          onPress={() => {
            const code = extractInviteCode(inviteCodeInput);
            if (!code) {
              setJoinInputError("Please enter an invite code");
              return;
            }
            setShowJoinModal(false);
            router.push(`/join/${code}`);
          }}
        >
          <View className="flex-row items-center gap-2">
            <ChevronRight size={18} color={palette.white} />
            <Text className="text-base font-sans-semibold text-primary-foreground">Continue</Text>
          </View>
        </Button>
      </BottomSheetModal>
    </View>
  );
}
