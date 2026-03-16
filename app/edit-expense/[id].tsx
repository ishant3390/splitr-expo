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
import { useColorScheme } from "nativewind";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  Trash2,
  Check,
  Calendar,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CategoryIcon } from "@/components/ui/category-icon";
import { expensesApi, groupsApi, categoriesApi, isVersionConflict } from "@/lib/api";
import { inferCategoryFromDescription } from "@/lib/screen-helpers";
import { useToast } from "@/components/ui/toast";
import { getInitials, cn, amountToCents, centsToAmount } from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticWarning, hapticLight } from "@/lib/haptics";
import type {
  CategoryDto,
  GroupMemberDto,
  ExpenseDto,
  UpdateExpenseRequest,
  SplitRequest,
} from "@/lib/types";

type SplitType = "equal" | "percentage" | "fixed";

export default function EditExpenseScreen() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{ id: string; groupId: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const { getToken } = useAuth();
  const toast = useToast();

  const [expense, setExpense] = useState<ExpenseDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const amountInputRef = useRef<TextInput>(null);
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedPayerMemberId, setSelectedPayerMemberId] = useState<string | null>(null);
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});
  const [splitFixedAmounts, setSplitFixedAmounts] = useState<Record<string, string>>({});
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const userPickedCategoryRef = useRef(false);
  // Track the description loaded from server so we don't infer on initial population
  const initialDescriptionRef = useRef("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const initSplitValues = (memberIds: string[], type: SplitType, totalStr: string) => {
    if (type === "percentage" && memberIds.length > 0) {
      const even = (100 / memberIds.length).toFixed(2);
      const map: Record<string, string> = {};
      memberIds.forEach((mid) => { map[mid] = even; });
      setSplitPercentages(map);
    } else if (type === "fixed" && memberIds.length > 0) {
      const total = parseFloat(totalStr) || 0;
      const even = (total / memberIds.length).toFixed(2);
      const map: Record<string, string> = {};
      memberIds.forEach((mid) => { map[mid] = even; });
      setSplitFixedAmounts(map);
    }
  };

  const handleSplitTypeChange = (type: SplitType) => {
    hapticSelection();
    setSplitType(type);
    initSplitValues(splitWith, type, amount);
  };

  useEffect(() => {
    if (!groupId || !id) {
      toast.error("Missing expense or group information.");
      router.replace("/(tabs)");
      return;
    }

    const load = async () => {
      try {
        const token = await getToken();
        const [expenseData, membersData, categoriesData] = await Promise.all([
          expensesApi.get(id, token!),
          groupsApi.listMembers(groupId, token!),
          categoriesApi.list(token!),
        ]);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        if (!expenseData) {
          toast.error("Expense not found.");
          router.replace("/(tabs)");
          return;
        }

        setExpense(expenseData);

        // Deduplicate members
        const rawMembers: GroupMemberDto[] = Array.isArray(membersData) ? membersData : [];
        const seenMemberIds = new Set<string>();
        const memberList = rawMembers.filter((m) => {
          if (seenMemberIds.has(m.id)) return false;
          seenMemberIds.add(m.id);
          return true;
        });
        setMembers(memberList);

        // Pre-populate form fields
        initialDescriptionRef.current = expenseData.description;
        setDescription(expenseData.description);
        const amountStr = centsToAmount(expenseData.amountCents).toFixed(2);
        setAmount(amountStr);
        setSelectedCategoryId(expenseData.category?.id ?? null);
        if (expenseData.date) {
          setExpenseDate(new Date(expenseData.date));
        }

        // Pre-select split type from expense
        const rawSplitType = expenseData.splitType ?? "equal";
        const existingSplitType = (rawSplitType === "exact" ? "fixed" : rawSplitType) as SplitType;
        setSplitType(existingSplitType);

        // Match the original payer
        const ep = expenseData.payers?.[0];
        const payerMember =
          memberList.find((m) => ep?.user?.id && m.user?.id === ep.user!.id) ??
          memberList.find((m) => ep?.guestUser?.id && m.guestUser?.id === ep.guestUser!.id) ??
          memberList.find((m) => {
            const payerEmail = ep?.user?.email ?? ep?.guestUser?.email;
            return payerEmail && (m.user?.email === payerEmail || m.guestUser?.email === payerEmail);
          }) ??
          memberList.find((m) => expenseData.createdBy?.id && m.user?.id === expenseData.createdBy!.id) ??
          memberList[0];
        setSelectedPayerMemberId(payerMember?.id ?? null);

        // Pre-select split members
        const splitMemberIds = memberList
          .filter((m) =>
            expenseData.splits?.some(
              (s) =>
                (s.user?.id && s.user.id === m.user?.id) ||
                (s.guestUser?.id && s.guestUser.id === m.guestUser?.id)
            )
          )
          .map((m) => m.id);
        const activeSplitIds = splitMemberIds.length > 0 ? splitMemberIds : memberList.map((m) => m.id);
        setSplitWith(activeSplitIds);

        // Pre-populate percentage/fixed values from existing splits
        if (existingSplitType === "percentage") {
          const map: Record<string, string> = {};
          activeSplitIds.forEach((mid) => {
            const member = memberList.find((m) => m.id === mid);
            const split = expenseData.splits?.find(
              (s) =>
                (s.user?.id && s.user.id === member?.user?.id) ||
                (s.guestUser?.id && s.guestUser.id === member?.guestUser?.id)
            );
            map[mid] = split?.percentage != null ? split.percentage.toFixed(2) : (100 / activeSplitIds.length).toFixed(2);
          });
          setSplitPercentages(map);
        } else if (existingSplitType === "fixed") {
          const map: Record<string, string> = {};
          activeSplitIds.forEach((mid) => {
            const member = memberList.find((m) => m.id === mid);
            const split = expenseData.splits?.find(
              (s) =>
                (s.user?.id && s.user.id === member?.user?.id) ||
                (s.guestUser?.id && s.guestUser.id === member?.guestUser?.id)
            );
            map[mid] = split?.splitAmount != null
              ? centsToAmount(split.splitAmount).toFixed(2)
              : (centsToAmount(expenseData.amountCents) / activeSplitIds.length).toFixed(2);
          });
          setSplitFixedAmounts(map);
        }
      } catch (err) {
        console.error("Edit expense load error:", err);
        toast.error("This expense or group is no longer available.");
        router.replace("/(tabs)");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, groupId]);

  // Auto-infer category when user changes description (not on initial load)
  useEffect(() => {
    if (loading || userPickedCategoryRef.current || categories.length === 0) return;
    if (!description.trim() || description === initialDescriptionRef.current) return;
    const inferred = inferCategoryFromDescription(description, categories);
    if (inferred) setSelectedCategoryId(inferred);
  }, [description, categories, loading]);

  const handleToggleMember = (memberId: string) => {
    hapticLight();
    setSplitWith((prev) => {
      const next = prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId];
      initSplitValues(next, splitType, amount);
      return next;
    });
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      hapticError();
      toast.error("Please enter a valid amount.");
      return;
    }
    if (amountToCents(parsed) < 1) {
      hapticError();
      toast.error("Amount must be at least $0.01.");
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
    if (finalDescription.length > 255) {
      hapticError();
      toast.error("Description must be 255 characters or less.");
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
      const totalCents = amountToCents(parsed);
      const payerMember = members.find((m) => m.id === selectedPayerMemberId);

      // Deduplicate splits
      const seenSplitUserIds = new Set<string>();
      const uniqueSplitMembers = splitWith
        .map((memberId) => members.find((m) => m.id === memberId))
        .filter((member): member is GroupMemberDto => {
          if (!member) return false;
          const key = member.user?.id ?? member.guestUser?.id;
          if (!key || seenSplitUserIds.has(key)) return false;
          seenSplitUserIds.add(key);
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
        // Compute cents for all but the last member, then assign the remainder to the last
        // to avoid rounding drift that fails backend sum validation
        const rawCents = uniqueSplitMembers.map((member) =>
          Math.round(totalCents * (parseFloat(splitPercentages[member.id] ?? "0") / 100))
        );
        const sumExceptLast = rawCents.slice(0, -1).reduce((a, b) => a + b, 0);
        rawCents[rawCents.length - 1] = totalCents - sumExceptLast;
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          percentage: parseFloat(splitPercentages[member.id] ?? "0"),
          splitAmount: rawCents[idx],
        }));
      } else if (splitType === "fixed") {
        const fixedCents = uniqueSplitMembers.map((member) =>
          amountToCents(parseFloat(splitFixedAmounts[member.id] ?? "0") || 0)
        );
        const totalFixedCents = fixedCents.reduce((a, b) => a + b, 0);
        if (Math.abs(totalFixedCents - totalCents) > 1) {
          hapticError();
          toast.error(`Fixed amounts must add up to $${parsed.toFixed(2)}`);
          setSubmitting(false);
          return;
        }
        // Absorb any 1-cent rounding difference into the last member
        fixedCents[fixedCents.length - 1] += totalCents - totalFixedCents;
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          splitAmount: fixedCents[idx],
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

      const updateRequest: UpdateExpenseRequest = {
        description: finalDescription,
        totalAmount: totalCents,
        currency: expense?.currency ?? "USD",
        categoryId: selectedCategoryId ?? undefined,
        expenseDate: expenseDate.toISOString().split("T")[0],
        splitType: splitType === "fixed" ? "exact" : splitType,
        payers: [{ userId: payerMember?.user?.id, guestUserId: payerMember?.guestUser?.id, amountPaid: totalCents }],
        splits,
        version: expense?.version,
      };

      await expensesApi.update(id, updateRequest, token!);
      hapticSuccess();
      toast.success("Expense updated.");
      goBack();
    } catch (err) {
      console.error("Update expense error:", err);
      hapticError();
      if (isVersionConflict(err)) {
        toast.error("This expense was edited by someone else. Refreshing...");
        try {
          const refreshToken = await getToken();
          const fresh = await expensesApi.get(id, refreshToken!);
          setExpense(fresh);
        } catch {
          // If re-fetch also fails, user can retry manually
        }
        setSubmitting(false);
        return;
      }
      toast.error("Failed to update expense. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await expensesApi.delete(id, token!);
      toast.success("Expense deleted.");
      goBack();
    } catch {
      toast.error("Failed to delete expense.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const perPerson =
    amount && splitWith.length > 0 && !isNaN(parseFloat(amount))
      ? (parseFloat(amount) / splitWith.length).toFixed(2)
      : "0.00";
  const totalPct = splitWith.reduce((s, mid) => s + (parseFloat(splitPercentages[mid] ?? "0") || 0), 0);
  const totalFixed = splitWith.reduce((s, mid) => s + (parseFloat(splitFixedAmounts[mid] ?? "0") || 0), 0);

  if (loading) {
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
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onPress={() => goBack()}>
            <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
          </Button>
          <Text className="text-lg font-sans-semibold text-foreground">Edit Expense</Text>
          <Pressable onPress={handleSave} disabled={submitting}>
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
                const raw = val.startsWith("$") ? val.slice(1) : val;
                if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                  setAmount(raw);
                }
              }}
              keyboardType="decimal-pad"
              placeholder="$0"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
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
            maxLength={255}
          />

          {/* Date */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Date</Text>
            <Pressable
              onPress={() => {
                if (Platform.OS === 'web') {
                  dateInputRef.current?.showPicker();
                } else {
                  setShowDatePicker(true);
                }
              }}
              className="flex-row items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
            >
              <Calendar size={16} color="#0d9488" />
              <Text className="flex-1 text-sm font-sans-medium text-foreground">
                {expenseDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </Text>
            </Pressable>
            {Platform.OS === 'web' && (
              <input
                ref={dateInputRef}
                type="date"
                value={expenseDate.toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    setExpenseDate(new Date(e.target.value + 'T00:00:00'));
                  }
                }}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
            )}
            {Platform.OS !== 'web' && showDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setExpenseDate(date);
                }}
              />
            )}
          </View>

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
                      onPress={() => { hapticSelection(); userPickedCategoryRef.current = true; setSelectedCategoryId(cat.id); }}
                      className={cn(
                        "flex-row items-center gap-2 px-3 py-2 rounded-xl border",
                        isSelected ? "bg-primary border-primary" : "bg-card border-border"
                      )}
                    >
                      <CategoryIcon iconName={cat.icon} size="sm" />
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

          {/* Paid by */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Paid by</Text>
            <View className="gap-2">
              {members.map((member) => {
                const isSelected = selectedPayerMemberId === member.id;
                const memberName =
                  member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
                return (
                  <Pressable key={member.id} onPress={() => setSelectedPayerMemberId(member.id)}>
                    <Card
                      className={cn(
                        "p-3 flex-row items-center gap-3",
                        isSelected && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <View
                        className={cn(
                          "w-6 h-6 rounded-full border-2 items-center justify-center",
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
          </View>

          {/* Split with */}
          <View>
            {/* Header row */}
            <View className="flex-row items-center justify-between mb-1">
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
            {/* Inline validation hint */}
            {splitType === "percentage" && splitWith.length > 0 && Math.abs(totalPct - 100) >= 0.5 && (
              <Text className="text-xs text-destructive font-sans mb-1">
                {totalPct < 100 ? `${(100 - totalPct).toFixed(1)}% remaining` : `${(totalPct - 100).toFixed(1)}% over — reduce to 100%`}
              </Text>
            )}
            {splitType === "fixed" && splitWith.length > 0 && Math.abs(totalFixed - (parseFloat(amount) || 0)) >= 0.01 && (
              <Text className="text-xs text-destructive font-sans mb-1">
                {totalFixed < (parseFloat(amount) || 0)
                  ? `$${((parseFloat(amount) || 0) - totalFixed).toFixed(2)} remaining`
                  : `$${(totalFixed - (parseFloat(amount) || 0)).toFixed(2)} over — reduce to match total`}
              </Text>
            )}

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

            <View className="gap-2">
              {members.map((member) => {
                const isChecked = splitWith.includes(member.id);
                const memberName =
                  member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "Member";
                return (
                  <Pressable key={member.id} onPress={() => handleToggleMember(member.id)}>
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
                              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                              style={{ width: 44, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "right", color: isDark ? "#f1f5f9" : "#0f172a", fontFamily: "Inter_400Regular" }}
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
                              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                              style={{ width: 56, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "right", color: isDark ? "#f1f5f9" : "#0f172a", fontFamily: "Inter_400Regular" }}
                            />
                          </View>
                        </Pressable>
                      )}
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Delete button */}
          <Pressable
            onPress={() => { hapticWarning(); setShowDeleteConfirm(true); }}
            className="flex-row items-center justify-center gap-2 p-4 rounded-xl border border-destructive/30 bg-destructive/5"
          >
            <Trash2 size={18} color="#ef4444" />
            <Text className="text-sm font-sans-semibold text-destructive">Delete Expense</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Expense"
        message="This will permanently remove the expense and update everyone's balances."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </SafeAreaView>
  );
}
