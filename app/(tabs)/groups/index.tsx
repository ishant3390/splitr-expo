import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Platform, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { SHADOWS } from "@/lib/shadows";
import { SkeletonList } from "@/components/ui/skeleton";
import { GroupDto } from "@/lib/types";
import { groupsApi } from "@/lib/api";
import { hasUnsettledBalances } from "@/lib/screen-helpers";
import { useAuth } from "@clerk/clerk-expo";

export default function GroupsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
    } catch (err: any) {
      const body = err?.message ?? "";
      if (body.includes("OUTSTANDING_BALANCES") || body.toLowerCase().includes("outstanding balance")) {
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
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Hero Section */}
      <LinearGradient
        colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ overflow: "hidden" }}
      >
        {/* Watermark */}
        <View
          style={{ position: "absolute", bottom: -30, right: -20, opacity: 0.06 }}
          pointerEvents="none"
        >
          <Users size={180} color="#ffffff" strokeWidth={1} />
        </View>

        {/* Decorative orb */}
        <View
          style={{
            position: "absolute", top: -30, left: -30,
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
          pointerEvents="none"
        />

        {/* Title row + actions */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <Text className="text-2xl font-sans-bold" style={{ color: "#ffffff" }}>
            Groups
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}>
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: showSearch ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" }}
              >
                <Search size={18} color="#ffffff" />
              </View>
            </Pressable>
            <Pressable
              onPress={() => { setShowJoinModal(true); setInviteCodeInput(""); setJoinInputError(null); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 8, borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
            >
              <UserPlus size={15} color="#ffffff" />
              <Text className="text-sm font-sans-semibold" style={{ color: "#ffffff" }}>Join</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/create-group")}
              accessibilityRole="button"
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            >
              <Plus size={15} color="#ffffff" />
              <Text className="text-sm font-sans-semibold" style={{ color: "#ffffff" }}>New</Text>
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
              style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffff" }}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
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
                borderRadius: 16,
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
                    color: "#ffffff",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {balanceData.netBalanceCents > 0 ? "+" : "-"}
                  {formatCents(Math.abs(balanceData.netBalanceCents))}
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
                  <Text
                    selectable
                    className="text-lg font-sans-bold mt-0.5"
                    style={{ color: "#86efac", fontVariant: ["tabular-nums"] }}
                  >
                    {formatCents(balanceData.totalOwedCents)}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
                <View className="flex-1 items-center">
                  <Text className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.6)" }}>
                    You owe
                  </Text>
                  <Text
                    selectable
                    className="text-lg font-sans-bold mt-0.5"
                    style={{ color: "#fca5a5", fontVariant: ["tabular-nums"] }}
                  >
                    {formatCents(balanceData.totalOwesCents)}
                  </Text>
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
              style={{ color: filter === "active" ? "#ffffff" : "rgba(255,255,255,0.5)" }}
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
              style={{ color: filter === "archived" ? "#ffffff" : "rgba(255,255,255,0.5)" }}
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
            iconColor="#ef4444"
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          ListEmptyComponent={
            filter === "active" ? (
              <View>
                <EmptyState
                  icon={Users}
                  iconColor="#0d9488"
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
                iconColor="#94a3b8"
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
                <Card className="p-4">
                  <View className="flex-row gap-3">
                    <GroupAvatar
                      name={group.name}
                      emoji={group.emoji}
                      groupType={group.groupType}
                      id={group.id}
                    />
                    <View className="flex-1" style={{ gap: 2 }}>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-sans-semibold text-card-foreground flex-shrink" numberOfLines={1}>
                          {group.name}
                        </Text>
                        {balanceKnown && (
                          <Text className={cn(
                            "text-sm font-sans-semibold ml-2",
                            hasBalance
                              ? (balanceCents! > 0 ? "text-emerald-500" : "text-red-500")
                              : "text-muted-foreground"
                          )}>
                            {hasBalance
                              ? `${balanceCents! > 0 ? "+" : "-"}${formatCents(Math.abs(balanceCents!), group.defaultCurrency)}`
                              : "settled up"}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">
                          {group.memberCount ?? 0} members
                        </Text>
                        {group.updatedAt && (
                          <Text className="text-xs text-muted-foreground font-sans">
                            {formatRelativeTime(group.updatedAt)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => { hapticWarning(); handleLongPress(group); }}
                      hitSlop={8}
                      accessibilityLabel="Group actions"
                      style={{ padding: 4, alignSelf: "center" }}
                    >
                      <MoreVertical size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Action Sheet Modal */}
      <BottomSheetModal visible={showActions} onClose={() => setShowActions(false)}>
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            {selectedGroup?.name}
          </Text>
          <Pressable onPress={() => setShowActions(false)}>
            <X size={22} color="#64748b" />
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
              borderBottomColor: isDark ? "#334155" : "#f1f5f9",
            }}
          >
            <Archive size={20} color="#f59e0b" />
            <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: isDark ? "#f1f5f9" : "#0f172a" }}>
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
              borderBottomColor: isDark ? "#334155" : "#f1f5f9",
            }}
          >
            <RotateCcw size={20} color="#0d9488" />
            <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: isDark ? "#f1f5f9" : "#0f172a" }}>
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
          <Trash2 size={20} color="#ef4444" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#ef4444" }}>
            Delete Group
          </Text>
        </Pressable>
      </BottomSheetModal>

      {/* Balance check loading */}
      {checkingBalances && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 999 }}>
          <ActivityIndicator size="large" color="#0d9488" />
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
      >
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isDark ? "#f1f5f9" : "#0f172a", marginBottom: 4 }}>
          Join a Group
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: isDark ? "#94a3b8" : "#64748b", marginBottom: 16 }}>
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
            borderColor: joinInputError ? "#ef4444" : (isDark ? "#334155" : "#e2e8f0"),
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: isDark ? "#f1f5f9" : "#0f172a",
            backgroundColor: isDark ? "#1e293b" : "#f8fafc",
            marginBottom: 4,
          }}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
        {joinInputError && (
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#ef4444", marginBottom: 8 }}>
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
            <ChevronRight size={18} color="#ffffff" />
            <Text className="text-base font-sans-semibold text-primary-foreground">Continue</Text>
          </View>
        </Button>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
