import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ScanLine,
  ChevronDown,
  Plus,
  Check,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { groupsApi, categoriesApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { getInitials, cn, amountToCents } from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";
import type { CategoryDto, GroupDto, GroupMemberDto, CreateExpenseRequest, SplitRequest } from "@/lib/types";

// Map backend icon names to emojis
const ICON_TO_EMOJI: Record<string, string> = {
  restaurant: "🍕",
  "food_and_drink": "🍔",
  food: "🍕",
  fastfood: "🍔",
  local_cafe: "☕",
  coffee: "☕",
  local_bar: "🍺",
  directions_car: "🚗",
  transport: "🚗",
  car: "🚗",
  flight: "✈️",
  travel: "✈️",
  hotel: "🏨",
  accommodation: "🏠",
  home: "🏠",
  house: "🏠",
  sports_esports: "🎮",
  entertainment: "🎮",
  movie: "🎬",
  theaters: "🎭",
  shopping_bag: "🛍️",
  shopping: "🛍️",
  shopping_cart: "🛒",
  groceries: "🛒",
  local_grocery_store: "🛒",
  receipt: "🧾",
  payments: "💳",
  health: "❤️",
  local_hospital: "🏥",
  fitness_center: "💪",
  card_giftcard: "🎁",
  gifts: "🎁",
  work: "💼",
  business: "💼",
  wifi: "📡",
  utilities: "📡",
  electric_bolt: "⚡",
  water_drop: "💧",
  pets: "🐾",
  school: "📚",
  education: "📚",
  other: "📋",
  more_horiz: "📋",
};

function getCategoryEmoji(icon?: string): string {
  if (!icon) return "📋";
  // If it's already an emoji (starts with non-ASCII), return as-is
  if (/^\p{Emoji}/u.test(icon)) return icon;
  return ICON_TO_EMOJI[icon.toLowerCase()] ?? ICON_TO_EMOJI[icon] ?? "📋";
}

type SplitType = "equal" | "percentage" | "fixed";

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnGroupId?: string }>();
  const returnGroupId = Array.isArray(params.returnGroupId) ? params.returnGroupId[0] : params.returnGroupId;
  const goBack = () => {
    if (returnGroupId) {
      router.replace(`/group/${returnGroupId}`);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const toast = useToast();

  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [description, setDescription] = useState("");
  const amountInputRef = useRef<TextInput>(null);
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedPayerMemberId, setSelectedPayerMemberId] = useState<string | null>(null);
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});
  const [splitFixedAmounts, setSplitFixedAmounts] = useState<Record<string, string>>({});
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load groups and categories on mount; auto-create "Personal" group if none exist
  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const [groupsData, categoriesData] = await Promise.all([
          groupsApi.list(token!),
          categoriesApi.list(token!),
        ]);
        let list = Array.isArray(groupsData) ? groupsData : [];

        // Auto-create a Personal group so expenses always have a home
        if (list.length === 0) {
          try {
            const personal = await groupsApi.create(
              { name: "Personal", description: "Quick personal expenses" },
              token!
            );
            list = [personal];
          } catch {
            // If creation fails, continue — user can still create a group manually
          }
        }

        setGroups(list);
        if (list.length > 0) {
          const preferred = returnGroupId ? list.find((g) => g.id === returnGroupId) : null;
          setSelectedGroup(preferred ?? list[0]);
        }
        const cats = Array.isArray(categoriesData) ? categoriesData : [];
        setCategories(cats);
        if (cats.length > 0) setSelectedCategoryId(cats[0].id);
      } catch {
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };
    load();
  }, []);

  // Load members when selected group changes
  useEffect(() => {
    if (!selectedGroup) return;
    const load = async () => {
      setMembersLoading(true);
      try {
        const token = await getToken();
        const data = await groupsApi.listMembers(selectedGroup.id, token!);
        const raw: GroupMemberDto[] = Array.isArray(data) ? data : [];
        const seen = new Set<string>();
        const list = raw.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        setMembers(list);
        const ids = list.map((m) => m.id);
        setSplitWith(ids);
        initSplitValues(ids, splitType, amount);
        const currentEmail = clerkUser?.primaryEmailAddress?.emailAddress;
        const currentMember = list.find((m) => m.user?.email === currentEmail);
        setSelectedPayerMemberId(currentMember?.id ?? list[0]?.id ?? null);
      } catch {
        setMembers([]);
        setSplitWith([]);
      } finally {
        setMembersLoading(false);
      }
    };
    load();
  }, [selectedGroup?.id]);

  const initSplitValues = (memberIds: string[], type: SplitType, totalStr: string) => {
    if (type === "percentage" && memberIds.length > 0) {
      const even = (100 / memberIds.length).toFixed(2);
      const map: Record<string, string> = {};
      memberIds.forEach((id) => { map[id] = even; });
      setSplitPercentages(map);
    } else if (type === "fixed" && memberIds.length > 0) {
      const total = parseFloat(totalStr) || 0;
      const even = (total / memberIds.length).toFixed(2);
      const map: Record<string, string> = {};
      memberIds.forEach((id) => { map[id] = even; });
      setSplitFixedAmounts(map);
    }
  };

  const handleSplitTypeChange = (type: SplitType) => {
    hapticSelection();
    setSplitType(type);
    initSplitValues(splitWith, type, amount);
  };

  const handleToggleMember = (memberId: string) => {
    hapticLight();
    setSplitWith((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      initSplitValues(next, splitType, amount);
      return next;
    });
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      hapticError();
      toast.error("Please enter a valid amount.");
      return;
    }

    // Use category name as fallback description
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    const finalDescription = description.trim() || selectedCategory?.name;
    if (!finalDescription) {
      hapticError();
      toast.error("Please enter a description or select a category.");
      return;
    }

    if (!selectedGroup) {
      hapticError();
      toast.error("Please select a group.");
      return;
    }
    if (!selectedPayerMemberId) {
      hapticError();
      toast.error("Please select who paid.");
      return;
    }
    if (splitWith.length === 0) {
      hapticError();
      toast.error("Please select at least one member to split with.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const payerMember = members.find((m) => m.id === selectedPayerMemberId);
      const totalCents = amountToCents(parsedAmount);

      // Deduplicate splits by underlying userId/guestUserId
      const seenSplitIds = new Set<string>();
      const uniqueSplitMembers = splitWith
        .map((memberId) => members.find((m) => m.id === memberId))
        .filter((member): member is GroupMemberDto => {
          if (!member) return false;
          const key = member.user?.id ?? member.guestUser?.id;
          if (!key || seenSplitIds.has(key)) return false;
          seenSplitIds.add(key);
          return true;
        });

      let splits: SplitRequest[];

      if (splitType === "percentage") {
        const totalPct = uniqueSplitMembers.reduce(
          (s, m) => s + (parseFloat(splitPercentages[m.id] ?? "0") || 0), 0
        );
        if (Math.abs(totalPct - 100) > 0.5) {
          hapticError();
          toast.error(`Percentages must add up to 100% (currently ${totalPct.toFixed(1)}%)`);
          setSubmitting(false);
          return;
        }
        splits = uniqueSplitMembers.map((member) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          percentage: parseFloat(splitPercentages[member.id] ?? "0"),
          splitAmount: Math.round(totalCents * (parseFloat(splitPercentages[member.id] ?? "0") / 100)),
        }));
      } else if (splitType === "fixed") {
        const totalFixedCents = uniqueSplitMembers.reduce(
          (s, m) => s + amountToCents(parseFloat(splitFixedAmounts[m.id] ?? "0") || 0), 0
        );
        if (Math.abs(totalFixedCents - totalCents) > 1) {
          hapticError();
          toast.error(`Fixed amounts must add up to $${parsedAmount.toFixed(2)}`);
          setSubmitting(false);
          return;
        }
        splits = uniqueSplitMembers.map((member) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          splitAmount: amountToCents(parseFloat(splitFixedAmounts[member.id] ?? "0") || 0),
        }));
      } else {
        const perPersonCents = Math.floor(totalCents / uniqueSplitMembers.length);
        const remainder = totalCents - perPersonCents * uniqueSplitMembers.length;
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          splitAmount: idx === uniqueSplitMembers.length - 1 ? perPersonCents + remainder : perPersonCents,
        }));
      }

      const expenseRequest: CreateExpenseRequest = {
        description: finalDescription,
        totalAmount: totalCents,
        currency: selectedGroup.defaultCurrency || "USD",
        categoryId: selectedCategoryId ?? undefined,
        expenseDate: new Date().toISOString().split("T")[0],
        splitType: splitType === "fixed" ? "exact" : splitType,
        payers: [{ userId: payerMember?.user?.id, guestUserId: payerMember?.guestUser?.id, amountPaid: totalCents }],
        splits,
      };

      await groupsApi.createExpense(selectedGroup.id, expenseRequest, token!);
      hapticSuccess();
      toast.success(`"${finalDescription}" added to ${selectedGroup.name}`);
      goBack();
    } catch (err: any) {
      hapticError();
      toast.error("Something went wrong. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const perPerson =
    amount && splitWith.length > 0
      ? (parseFloat(amount) / splitWith.length).toFixed(2)
      : "0.00";
  const totalPct = splitWith.reduce((s, id) => s + (parseFloat(splitPercentages[id] ?? "0") || 0), 0);
  const totalFixed = splitWith.reduce((s, id) => s + (parseFloat(splitFixedAmounts[id] ?? "0") || 0), 0);

  if (groupsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#0d9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-border">
          <Pressable onPress={goBack}>
            <Text className="text-base font-sans-medium text-muted-foreground">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-sans-semibold text-foreground">Add Expense</Text>
          <Pressable onPress={handleSubmit} disabled={submitting}>
            <Text className="text-base font-sans-semibold text-primary">
              {submitting ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-6 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Amount */}
          <View className="items-center py-8">
            <TextInput
              ref={amountInputRef}
              value={amount ? `$${amount}` : ""}
              onChangeText={(val) => {
                // Strip the $ prefix before processing
                const raw = val.startsWith("$") ? val.slice(1) : val;
                if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                  setAmount(raw);
                }
              }}
              keyboardType="decimal-pad"
              placeholder="$0"
              placeholderTextColor="#94a3b8"
              className="text-foreground"
              style={{
                fontSize: 56,
                fontWeight: "700",
                padding: 0,
                textAlign: "center",
                fontVariant: ["tabular-nums"],
              }}
            />
          </View>

          {/* Description */}
          <Input
            label="Description"
            placeholder="What was this for?"
            value={description}
            onChangeText={setDescription}
          />

          {/* Category */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Category</Text>
            {categories.length === 0 ? (
              <ActivityIndicator color="#0d9488" />
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => { hapticSelection(); setSelectedCategoryId(cat.id); }}
                      className={cn(
                        "flex-row items-center gap-2 px-3 py-2 rounded-xl border",
                        isSelected ? "bg-primary border-primary" : "bg-card border-border"
                      )}
                    >
                      <Text style={{ fontSize: 15 }}>{getCategoryEmoji(cat.icon)}</Text>
                      <Text
                        className={cn(
                          "text-sm font-sans-medium",
                          isSelected ? "text-primary-foreground" : "text-foreground"
                        )}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Group selector — compact chip style, auto-selects first group */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Group</Text>
            <Pressable onPress={() => setShowGroupPicker(!showGroupPicker)}>
              <Card className="p-3.5 flex-row items-center justify-between">
                <Text className="font-sans-medium text-card-foreground">
                  {selectedGroup?.name ?? "Select a group"}
                </Text>
                <ChevronDown size={20} color="#64748b" />
              </Card>
            </Pressable>
            {showGroupPicker && (
              <Card className="mt-2 p-2 gap-1">
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => {
                      setSelectedGroup(group);
                      setShowGroupPicker(false);
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-lg",
                      group.id === selectedGroup?.id ? "bg-primary" : "bg-transparent"
                    )}
                  >
                    <Text
                      className={cn(
                        "font-sans-medium",
                        group.id === selectedGroup?.id
                          ? "text-primary-foreground"
                          : "text-card-foreground"
                      )}
                    >
                      {group.name}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => {
                    setShowGroupPicker(false);
                    router.push("/create-group");
                  }}
                  className="flex-row items-center gap-2 px-3 py-2.5 rounded-lg"
                >
                  <Plus size={16} color="#14b8a6" />
                  <Text className="font-sans-medium text-accent">Create New Group</Text>
                </Pressable>
              </Card>
            )}
          </View>

          {/* Paid by */}
          {selectedGroup && members.length > 0 && (
            <View>
              <Text className="text-sm font-sans-medium text-foreground mb-2">Paid by</Text>
              {membersLoading ? (
                <ActivityIndicator color="#0d9488" />
              ) : (
                <View className="gap-2">
                  {members.map((member) => {
                    const isSelected = selectedPayerMemberId === member.id;
                    const memberName =
                      member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => setSelectedPayerMemberId(member.id)}
                      >
                        <Card
                          className={cn(
                            "p-3 flex-row items-center gap-3",
                            isSelected && "border-primary/30 bg-primary/5"
                          )}
                        >
                          <View
                            className={cn(
                              "w-5 h-5 rounded-full border-2 items-center justify-center",
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                            )}
                          >
                            {isSelected && <Check size={12} color="#ffffff" />}
                          </View>
                          <Avatar
                            src={member.user?.avatarUrl}
                            fallback={getInitials(memberName)}
                            size="sm"
                          />
                          <Text className="flex-1 text-sm font-sans-medium text-card-foreground">
                            {memberName}
                          </Text>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Split with */}
          {selectedGroup && (
            <View>
              {/* Header row */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-sans-medium text-foreground">
                  Split with ({splitWith.length})
                </Text>
                {splitType === "equal" && (
                  <Text className="text-sm text-primary font-sans-semibold">
                    {`$${perPerson}/person`}
                  </Text>
                )}
                {splitType === "percentage" && (
                  <Text className={cn(
                    "text-sm font-sans-semibold",
                    Math.abs(totalPct - 100) < 0.5 ? "text-primary" : "text-destructive"
                  )}>
                    {totalPct.toFixed(1)}% / 100%
                  </Text>
                )}
                {splitType === "fixed" && (
                  <Text className={cn(
                    "text-sm font-sans-semibold",
                    Math.abs(totalFixed - (parseFloat(amount) || 0)) < 0.01 ? "text-primary" : "text-destructive"
                  )}>
                    {`$${totalFixed.toFixed(2)} / $${amount || "0.00"}`}
                  </Text>
                )}
              </View>

              {/* Split type selector */}
              <View className="flex-row gap-2 mb-3">
                {(["equal", "percentage", "fixed"] as SplitType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => handleSplitTypeChange(type)}
                    className={cn(
                      "flex-1 py-2 rounded-lg border items-center",
                      splitType === type ? "bg-primary border-primary" : "bg-card border-border"
                    )}
                  >
                    <Text className={cn(
                      "text-xs font-sans-semibold",
                      splitType === type ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {type === "equal" ? "Equal" : type === "percentage" ? "Percentage" : "Fixed"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {membersLoading ? (
                <ActivityIndicator color="#0d9488" />
              ) : (
                <View className="gap-2">
                  {members.map((member) => {
                    const isChecked = splitWith.includes(member.id);
                    const memberName = member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => handleToggleMember(member.id)}
                      >
                        <Card
                          className={cn(
                            "p-3 flex-row items-center gap-3",
                            isChecked && "border-primary/30 bg-primary/5"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleMember(member.id)}
                          />
                          <Avatar
                            src={member.user?.avatarUrl}
                            fallback={getInitials(memberName)}
                            size="sm"
                          />
                          <Text className="flex-1 text-sm font-sans-medium text-card-foreground">
                            {memberName}
                          </Text>
                          {isChecked && splitType === "equal" && !!amount && (
                            <Text className="text-sm font-sans-semibold text-primary">
                              {`$${perPerson}`}
                            </Text>
                          )}
                          {isChecked && splitType === "percentage" && (
                            <Pressable onPress={(e) => e.stopPropagation()}>
                              <View className="flex-row items-center border border-border rounded-lg bg-muted overflow-hidden">
                                <TextInput
                                  value={splitPercentages[member.id] ?? ""}
                                  onChangeText={(val) =>
                                    setSplitPercentages((prev) => ({ ...prev, [member.id]: val }))
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="0"
                                  placeholderTextColor="#94a3b8"
                                  style={{ width: 44, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "right", color: "#0f172a", fontFamily: "Inter_400Regular" }}
                                />
                                <Text className="text-sm text-muted-foreground font-sans pr-2">%</Text>
                              </View>
                            </Pressable>
                          )}
                          {isChecked && splitType === "fixed" && (
                            <Pressable onPress={(e) => e.stopPropagation()}>
                              <View className="flex-row items-center border border-border rounded-lg bg-muted overflow-hidden">
                                <Text className="text-sm text-muted-foreground font-sans pl-2">$</Text>
                                <TextInput
                                  value={splitFixedAmounts[member.id] ?? ""}
                                  onChangeText={(val) =>
                                    setSplitFixedAmounts((prev) => ({ ...prev, [member.id]: val }))
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="0.00"
                                  placeholderTextColor="#94a3b8"
                                  style={{ width: 56, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "right", color: "#0f172a", fontFamily: "Inter_400Regular" }}
                                />
                              </View>
                            </Pressable>
                          )}
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
