import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Platform, useColorScheme, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight, hapticWarning, hapticSuccess, hapticSelection } from "@/lib/haptics";
import { useRouter } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { ChevronRight, Plus, Archive, Trash2, X, Users, RotateCcw, AlertTriangle, Search, MoreVertical } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { useGroups, useArchiveGroup, useDeleteGroup } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/skeleton";
import { GroupDto } from "@/lib/types";

export default function GroupsScreen() {
  const router = useRouter();
  const toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const { data: groups = [], isLoading: loading, error: groupsError, refetch } = useGroups(filter);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  // Long-press action sheet
  const [selectedGroup, setSelectedGroup] = useState<GroupDto | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Archive confirmation
  const [groupToArchive, setGroupToArchive] = useState<GroupDto | null>(null);

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
    }, [refetch])
  );

  // Fallback: state-based refetch (reliable on web)
  useEffect(() => {
    if (isFocused) refetch();
  }, [isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
        <View>
          <Text className="text-2xl font-sans-bold text-foreground">Groups</Text>
          <Text className="text-xs text-muted-foreground font-sans">
            {Platform.OS === "web" ? "Tap ··· or right-click for options" : "Tap ··· or long-press for options"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}>
            <View className="w-9 h-9 rounded-full bg-muted items-center justify-center">
              <Search size={18} color={showSearch ? "#0d9488" : "#64748b"} />
            </View>
          </Pressable>
          <Button
            variant="default"
            size="sm"
            onPress={() => router.push("/create-group")}
          >
            <View className="flex-row items-center gap-1.5">
              <Plus size={16} color="#ffffff" />
              <Text className="text-sm font-sans-semibold text-primary-foreground">New</Text>
            </View>
          </Button>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View className="mx-5 mb-2 flex-row items-center bg-muted rounded-xl px-3 py-2 gap-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            placeholder="Search groups..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: isDark ? "#f1f5f9" : "#0f172a" }}
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <X size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      )}

      {/* Active / Archived filter */}
      <View className="flex-row mx-5 mb-3 rounded-xl bg-muted p-1">
        <Pressable
          onPress={() => { hapticSelection(); setFilter("active"); }}
          className={cn(
            "flex-1 items-center py-2 rounded-lg",
            filter === "active" ? "bg-card" : "bg-transparent"
          )}
        >
          <Text className={cn(
            "text-sm font-sans-semibold",
            filter === "active" ? "text-foreground" : "text-muted-foreground"
          )}>
            Active
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { hapticSelection(); setFilter("archived"); }}
          className={cn(
            "flex-1 items-center py-2 rounded-lg",
            filter === "archived" ? "bg-card" : "bg-transparent"
          )}
        >
          <Text className={cn(
            "text-sm font-sans-semibold",
            filter === "archived" ? "text-foreground" : "text-muted-foreground"
          )}>
            Archived
          </Text>
        </Pressable>
      </View>

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
          contentContainerClassName="px-5 pb-24 gap-3"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          ListEmptyComponent={
            filter === "active" ? (
              <EmptyState
                icon={Users}
                iconColor="#0d9488"
                title="No groups yet"
                subtitle="Split expenses with friends, roommates, or travel buddies"
                actionLabel="Create Your First Group"
                onAction={() => router.push("/create-group")}
              />
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
                  <View className="flex-row items-center gap-3">
                    <GroupAvatar
                      name={group.name}
                      emoji={group.emoji}
                      groupType={group.groupType}
                      id={group.id}
                    />
                    <View className="flex-1">
                      <Text className="text-base font-sans-semibold text-card-foreground">
                        {group.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {group.memberCount ?? 0} members
                        {group.defaultCurrency ? ` \u00B7 ${group.defaultCurrency}` : ""}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Pressable
                        onPress={() => { hapticWarning(); handleLongPress(group); }}
                        hitSlop={8}
                        accessibilityLabel="Group actions"
                        style={{ padding: 4 }}
                      >
                        <MoreVertical size={18} color="#94a3b8" />
                      </Pressable>
                      <ChevronRight size={20} color="#94a3b8" />
                    </View>
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
            onPress={() => {
              setShowActions(false);
              setGroupToArchive(selectedGroup);
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

      {/* Archive Confirmation */}
      <ConfirmModal
        visible={!!groupToArchive}
        title="Archive Group"
        message={`Archive "${groupToArchive?.name}"? No new expenses or settlements can be added while archived. Existing balances are preserved and the group can be unarchived at any time.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setGroupToArchive(null)}
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
    </SafeAreaView>
  );
}
