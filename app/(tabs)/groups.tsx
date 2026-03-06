import React, { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { hapticLight, hapticWarning, hapticSuccess, hapticSelection } from "@/lib/haptics";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { ChevronRight, Plus, Archive, Trash2, X, Users, RotateCcw } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { groupsApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { GroupDto } from "@/lib/types";

export default function GroupsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const toast = useToast();
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"active" | "archived">("active");

  // Long-press action sheet
  const [selectedGroup, setSelectedGroup] = useState<GroupDto | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Delete confirmation
  const [groupToDelete, setGroupToDelete] = useState<GroupDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await groupsApi.list(token!, filter);
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const handleArchive = async () => {
    if (!selectedGroup) return;
    try {
      const token = await getToken();
      await groupsApi.update(
        selectedGroup.id,
        { isArchived: true, version: selectedGroup.version },
        token!
      );
      hapticSuccess();
      toast.success(`"${selectedGroup.name}" archived.`);
      setShowActions(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch {
      toast.error("Failed to archive group.");
    }
  };

  const handleUnarchive = async () => {
    if (!selectedGroup) return;
    try {
      const token = await getToken();
      await groupsApi.update(
        selectedGroup.id,
        { isArchived: false, version: selectedGroup.version },
        token!
      );
      hapticSuccess();
      toast.success(`"${selectedGroup.name}" restored.`);
      setShowActions(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch {
      toast.error("Failed to restore group.");
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await groupsApi.delete(groupToDelete.id, token!);
      hapticSuccess();
      toast.success(`"${groupToDelete.name}" deleted.`);
      setGroupToDelete(null);
      await loadGroups();
    } catch {
      toast.error("Failed to delete group.");
    } finally {
      setDeleting(false);
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
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
        <Text className="text-2xl font-sans-bold text-foreground">Groups</Text>
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

      {/* Active / Archived filter */}
      <View className="flex-row mx-5 mb-3 rounded-xl bg-muted p-1">
        <Pressable
          onPress={() => { hapticSelection(); setFilter("active"); setLoading(true); }}
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
          onPress={() => { hapticSelection(); setFilter("archived"); setLoading(true); }}
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
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-6 gap-3"
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
                subtitle="Long-press a group to archive it"
              />
            )
          }
          renderItem={({ item: group, index }: { item: GroupDto; index: number }) => {
            const emoji = group.emoji ?? "\uD83D\uDC65";
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(300).springify()}>
              <Pressable
                onPress={() => { hapticLight(); router.push(`/group/${group.id}`); }}
                onLongPress={() => handleLongPress(group)}
                delayLongPress={400}
              >
                <Card className="p-4">
                  <View className="flex-row items-center gap-3">
                    <View className={cn(
                      "w-11 h-11 rounded-2xl items-center justify-center",
                      filter === "archived" ? "bg-muted" : "bg-primary/10"
                    )}>
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-sans-semibold text-card-foreground">
                        {group.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                        {group.memberCount ?? 0} members
                        {group.defaultCurrency ? ` \u00B7 ${group.defaultCurrency}` : ""}
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#94a3b8" />
                  </View>
                </Card>
              </Pressable>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Action Sheet Modal */}
      <Modal
        transparent
        visible={showActions}
        animationType="slide"
        onRequestClose={() => setShowActions(false)}
      >
        <Pressable
          onPress={() => setShowActions(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: Platform.OS === "ios" ? 40 : 24,
              gap: 4,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0f172a" }}>
                {selectedGroup?.name}
              </Text>
              <Pressable onPress={() => setShowActions(false)}>
                <X size={22} color="#64748b" />
              </Pressable>
            </View>

            {filter === "active" ? (
              <Pressable
                onPress={handleArchive}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f1f5f9",
                }}
              >
                <Archive size={20} color="#f59e0b" />
                <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#0f172a" }}>
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
                  borderBottomColor: "#f1f5f9",
                }}
              >
                <RotateCcw size={20} color="#0d9488" />
                <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#0f172a" }}>
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
          </Pressable>
        </Pressable>
      </Modal>

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
