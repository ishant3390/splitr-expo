import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
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
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { groupsApi } from "@/lib/api";
import { formatCents, formatDate, getInitials, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { GroupDto, GroupMemberDto, ExpenseDto, ExpenseCategory } from "@/lib/types";

const iconMap: Record<ExpenseCategory, typeof Utensils> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  other: MoreHorizontal,
};

export default function GroupDetailScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/groups"));
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const toast = useToast();

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberName, setAddMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [contacts, setContacts] = useState<GroupMemberDto[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState<GroupMemberDto | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const loadData = async () => {
    try {
      const token = await getToken();
      const [groupData, membersData, expensesResponse] = await Promise.all([
        groupsApi.get(id, token!),
        groupsApi.listMembers(id, token!),
        groupsApi.listExpenses(id, token!),
      ]);
      setGroup(groupData);
      const rawMembers = Array.isArray(membersData) ? membersData : [];

      const seenIds = new Set<string>();
      setMembers(rawMembers.filter((m) => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
      }));
      setExpenses(expensesResponse.data ?? []);
    } catch {
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !/\S+@\S+\.\S+/.test(addMemberEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setAddingMember(true);
    try {
      const token = await getToken();
      await groupsApi.addGuestMember(
        id,
        {
          name: addMemberName.trim() || addMemberEmail.trim(),
          email: addMemberEmail.trim(),
        },
        token!
      );
      toast.success("Member added successfully.");
      setAddMemberEmail("");
      setAddMemberName("");
      setShowAddMember(false);
      // Refresh members list (deduplicated)
      const updatedRaw = await groupsApi.listMembers(id, token!);
      const updatedList = Array.isArray(updatedRaw) ? updatedRaw : [];
      const seen = new Set<string>();
      setMembers(updatedList.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }));
    } catch {
      toast.error("Failed to add member. They may already be in the group.");
    } finally {
      setAddingMember(false);
    }
  };

  // Load known contacts from other groups when the modal opens
  useEffect(() => {
    if (!showAddMember) return;
    const load = async () => {
      setContactsLoading(true);
      try {
        const token = await getToken();
        const allGroups = await groupsApi.list(token!);
        const otherGroups = (Array.isArray(allGroups) ? allGroups : []).filter((g) => g.id !== id);
        const perGroup = await Promise.all(otherGroups.map((g) => groupsApi.listMembers(g.id, token!)));

        const currentEmails = new Set(
          members.map((m) => m.user?.email ?? m.guestUser?.email).filter(Boolean)
        );
        const seen = new Set<string>();
        const result: GroupMemberDto[] = [];
        perGroup.flat().forEach((m) => {
          const email = m.user?.email ?? m.guestUser?.email;
          if (!email || seen.has(email) || currentEmails.has(email)) return;
          seen.add(email);
          result.push(m);
        });
        console.log("[AddMember] allGroups:", JSON.stringify(allGroups, null, 2));
        console.log("[AddMember] otherGroups count:", otherGroups.length);
        console.log("[AddMember] perGroup (raw):", JSON.stringify(perGroup, null, 2));
        console.log("[AddMember] currentEmails:", [...currentEmails]);
        console.log("[AddMember] contacts result:", JSON.stringify(result, null, 2));
        setContacts(result);
      } catch (err) {
        console.log("[AddMember] contacts load error:", err);
        setContacts([]);
      } finally {
        setContactsLoading(false);
      }
    };
    load();
  }, [showAddMember]);

  const handleAddContact = async (contact: GroupMemberDto) => {
    setAddingMember(true);
    try {
      const token = await getToken();
      if (contact.user?.email) {
        await groupsApi.addMember(id, { email: contact.user.email }, token!);
      } else if (contact.guestUser) {
        await groupsApi.addGuestMember(
          id,
          { name: contact.guestUser.name, email: contact.guestUser.email },
          token!
        );
      }
      toast.success("Member added successfully.");
      setShowAddMember(false);
      const updatedRaw = await groupsApi.listMembers(id, token!);
      const updatedList = Array.isArray(updatedRaw) ? updatedRaw : [];
      const seen = new Set<string>();
      setMembers(updatedList.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }));
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
      // Refresh members list
      const updatedRaw = await groupsApi.listMembers(id, token!);
      const updatedList = Array.isArray(updatedRaw) ? updatedRaw : [];
      const seen = new Set<string>();
      setMembers(updatedList.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }));
    } catch {
      toast.error("Failed to remove member. Try again.");
    } finally {
      setRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#0d9488" />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <Text className="text-lg text-muted-foreground font-sans">Group not found</Text>
      </SafeAreaView>
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color="#0f172a" />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">
          {group.emoji ? `${group.emoji} ` : ""}{group.name}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.push({ pathname: "/(tabs)/add", params: { returnGroupId: id } })}
        >
          <Plus size={24} color="#0d9488" />
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Members */}
        <View className="py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-sans-semibold text-muted-foreground">
              MEMBERS ({members.length})
            </Text>
            <Pressable
              onPress={() => setShowAddMember(true)}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
            >
              <UserPlus size={14} color="#0d9488" />
              <Text className="text-xs font-sans-semibold text-primary">Add</Text>
            </Pressable>
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
                        onPress={() => setMemberToRemove(member)}
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
              <Text className="text-xl font-sans-bold text-foreground">
                {formatCents(totalSpent)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground font-sans">Per Person (avg)</Text>
              <Text className="text-xl font-sans-bold text-primary">
                {formatCents(members.length > 0 ? totalSpent / members.length : 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Settle Up button */}
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

        {/* Expenses list */}
        <Text className="text-sm font-sans-semibold text-muted-foreground mb-3">
          EXPENSES ({expenses.length})
        </Text>

        {expenses.length === 0 ? (
          <Card className="p-6 items-center">
            <Text className="text-sm text-muted-foreground font-sans">
              No expenses yet. Add one!
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            {[...expenses]
              .sort((a, b) => {
                const dateA = a.date || a.createdAt || "";
                const dateB = b.date || b.createdAt || "";
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              })
              .map((expense) => {
                const categoryKey = (expense.category?.icon ??
                  expense.category?.name ??
                  "other") as ExpenseCategory;
                const Icon = iconMap[categoryKey] ?? MoreHorizontal;
                const payer = expense.payers?.[0];
                const payerName = (() => {
                  // Direct name if API expands payer objects
                  if (payer?.user?.name) return payer.user.name;
                  if (payer?.guestUser?.name) return payer.guestUser.name;
                  // Cross-reference with the loaded members list
                  if (payer?.user?.id) {
                    const m = members.find((m) => m.user?.id === payer.user!.id);
                    if (m) return m.user?.name ?? m.displayName ?? "Member";
                  }
                  if (payer?.guestUser?.id) {
                    const m = members.find((m) => m.guestUser?.id === payer.guestUser!.id);
                    if (m) return m.guestUser?.name ?? m.displayName ?? "Member";
                  }
                  // Fall back to whoever created the expense
                  return expense.createdBy?.name ?? "Someone";
                })();
                const splitCount = expense.splits?.length ?? 1;
                const expenseDate = expense.date || expense.createdAt;

                return (
                  <Pressable
                    key={expense.id}
                    onPress={() =>
                      router.push({
                        pathname: "/edit-expense/[id]",
                        params: { id: expense.id, groupId: id },
                      })
                    }
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
                            {expenseDate ? ` · ${formatDate(expenseDate)}` : ""}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-sans-bold text-foreground">
                            {formatCents(expense.amountCents)}
                          </Text>
                          <Text className="text-xs text-muted-foreground font-sans">
                            {splitCount} {splitCount === 1 ? "person" : "people"}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
          </View>
        )}
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

      {/* Add Member Modal */}
      <Modal
        transparent
        visible={showAddMember}
        animationType="slide"
        onRequestClose={() => setShowAddMember(false)}
      >
        <Pressable
          onPress={() => setShowAddMember(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#ffffff",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                paddingBottom: Platform.OS === "ios" ? 36 : 24,
                gap: 16,
              }}
            >
              {/* Modal header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0f172a" }}>
                  Add Member
                </Text>
                <Pressable onPress={() => setShowAddMember(false)}>
                  <X size={22} color="#64748b" />
                </Pressable>
              </View>

              {/* Existing contacts from other groups */}
              {contactsLoading ? (
                <ActivityIndicator color="#0d9488" />
              ) : contacts.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#64748b" }}>
                    FROM YOUR OTHER GROUPS
                  </Text>
                  <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8 }}>
                      {contacts.map((contact) => {
                        const name = contact.user?.name ?? contact.guestUser?.name ?? "Unknown";
                        const email = contact.user?.email ?? contact.guestUser?.email ?? "";
                        const isGuest = !contact.user;
                        return (
                          <Pressable
                            key={contact.id}
                            onPress={() => handleAddContact(contact)}
                            disabled={addingMember}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                              padding: 10,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <Avatar
                              src={contact.user?.avatarUrl}
                              fallback={getInitials(name)}
                              size="sm"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0f172a" }}>
                                {name}
                                {isGuest ? (
                                  <Text style={{ fontFamily: "Inter_400Regular", color: "#94a3b8" }}> · Guest</Text>
                                ) : null}
                              </Text>
                              {email ? (
                                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748b" }}>
                                  {email}
                                </Text>
                              ) : null}
                            </View>
                            <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#0d9488", borderRadius: 6 }}>
                              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ffffff" }}>Add</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8" }}>OR ADD SOMEONE NEW</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  </View>
                </View>
              ) : null}

              {/* Name input */}
              <Input
                label="Name (optional)"
                placeholder="e.g., Alex"
                value={addMemberName}
                onChangeText={setAddMemberName}
                autoCapitalize="words"
              />

              {/* Email input */}
              <Input
                label="Email"
                placeholder="friend@example.com"
                value={addMemberEmail}
                onChangeText={setAddMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text
                style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748b", lineHeight: 18 }}
              >
                They'll be added as a guest and can join with a full account later.
              </Text>

              {/* Add button */}
              <Button
                variant="default"
                onPress={handleAddMember}
                disabled={addingMember || !addMemberEmail.trim()}
              >
                {addingMember ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ffffff" }}>
                    Add to Group
                  </Text>
                )}
              </Button>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
