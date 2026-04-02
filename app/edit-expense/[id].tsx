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
  Paperclip,
  Eye,
  X,
  Camera,
  ImageIcon,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CategoryIcon } from "@/components/ui/category-icon";
import { expensesApi, groupsApi, categoriesApi, isVersionConflict } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { pickImage, validateImage, buildImageFormDataAsync } from "@/lib/image-utils";
import { invalidateAfterExpenseChange } from "@/lib/query";
import {
  allocatePercentageSplitCents,
  normalizeFixedSplitCents,
  validateExpenseInvariants,
} from "@/lib/finance-invariants";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import { inferCategoryFromDescription } from "@/lib/screen-helpers";
import { useToast } from "@/components/ui/toast";
import {
  getInitials,
  cn,
  centsToAmount,
  getCurrencySymbol,
  sanitizeAmountInput,
  sanitizePercentInput,
  getMemberAvatarUrl,
  parseAmountInputToCents,
} from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticWarning, hapticLight } from "@/lib/haptics";
import { colors, fontSize as fs, fontFamily as ff, palette } from "@/lib/tokens";
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
  const c = colors(isDark);
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
  const [receiptStatus, setReceiptStatus] = useState<"attached" | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
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
        setReceiptStatus(expenseData.receiptImageUrl === "attached" ? "attached" : null);

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

  const handleViewReceipt = async () => {
    setLoadingReceipt(true);
    try {
      const token = await getToken();
      const { url } = await expensesApi.getReceiptUrl(id, token!);
      setReceiptPreviewUrl(url);
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Could not load receipt.");
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleAttachReceipt = async (source: "camera" | "gallery") => {
    const asset = await pickImage(source);
    if (!asset) return;
    const error = validateImage(asset);
    if (error) { toast.error(error); return; }
    setUploadingReceipt(true);
    try {
      const token = await getToken();
      const formData = await buildImageFormDataAsync(asset.uri, asset.mimeType);
      await expensesApi.uploadReceipt(id, formData, token!);
      setReceiptStatus("attached");
      invalidateAfterExpenseChange(groupId);
      hapticSuccess();
      toast.success("Receipt attached.");
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to attach receipt.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDeleteReceipt = async () => {
    setUploadingReceipt(true);
    try {
      const token = await getToken();
      await expensesApi.deleteReceipt(id, token!);
      setReceiptStatus(null);
      invalidateAfterExpenseChange(groupId);
      toast.success("Receipt removed.");
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      toast.error(apiErr ? getUserMessage(apiErr) : "Failed to remove receipt.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSave = async () => {
    const parsedAmountCents = parseAmountInputToCents(amount);
    if (parsedAmountCents == null || parsedAmountCents <= 0) {
      hapticError();
      toast.error("Please enter a valid amount.");
      return;
    }
    if (parsedAmountCents < 1) {
      hapticError();
      toast.error("Amount must be at least 0.01.");
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
      const totalCents = parsedAmountCents;
      const amountValue = centsToAmount(totalCents);
      const submitCurrencySymbol = getCurrencySymbol(expense?.currency ?? "USD");
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
        const percentageValues = uniqueSplitMembers.map((member) =>
          parseFloat(splitPercentages[member.id] ?? "0")
        );
        const allocatedCents = allocatePercentageSplitCents(totalCents, percentageValues);
        if (!allocatedCents) {
          hapticError();
          toast.error("Unable to allocate split amounts. Please adjust percentages.");
          setSubmitting(false);
          return;
        }
        splits = uniqueSplitMembers.map((member, idx) => ({
          userId: member.user?.id,
          guestUserId: member.guestUser?.id,
          percentage: percentageValues[idx],
          splitAmount: allocatedCents[idx],
        }));
      } else if (splitType === "fixed") {
        const rawFixedCents = uniqueSplitMembers.map((member) =>
          parseAmountInputToCents(splitFixedAmounts[member.id] ?? "0") ?? 0
        );
        const totalFixedCents = rawFixedCents.reduce((a, b) => a + b, 0);
        if (Math.abs(totalFixedCents - totalCents) > 1) {
          hapticError();
          toast.error(`Fixed amounts must add up to ${submitCurrencySymbol}${amountValue.toFixed(2)}`);
          setSubmitting(false);
          return;
        }
        const fixedCents = normalizeFixedSplitCents(totalCents, rawFixedCents);
        if (!fixedCents) {
          hapticError();
          toast.error("Unable to normalize fixed split amounts. Please adjust values.");
          setSubmitting(false);
          return;
        }
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

      const expenseInvariant = validateExpenseInvariants({
        totalAmount: totalCents,
        payers: [{ amountPaid: totalCents }],
        splits: splits.map((split) => ({ splitAmount: split.splitAmount })),
      });
      if (!expenseInvariant.ok) {
        hapticError();
        toast.error(expenseInvariant.message);
        return;
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
    } catch (err: unknown) {
      console.error("Update expense error:", err);
      hapticError();
      if (isVersionConflict(err)) {
        toast.info("Someone else just edited this. Refreshing...");
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
      const apiErr = parseApiError(err);
      if (apiErr) {
        toast.error(getUserMessage(apiErr));
      } else {
        toast.error("Failed to update expense. Try again.");
      }
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
    splitWith.length > 0
      ? (centsToAmount(parseAmountInputToCents(amount) ?? 0) / splitWith.length).toFixed(2)
      : "0.00";
  const totalPct = splitWith.reduce((s, mid) => s + (parseFloat(splitPercentages[mid] ?? "0") || 0), 0);
  const totalAmountCents = parseAmountInputToCents(amount) ?? 0;
  const totalFixedCents = splitWith.reduce(
    (sum, mid) => sum + (parseAmountInputToCents(splitFixedAmounts[mid] ?? "0") ?? 0),
    0
  );
  const totalFixed = centsToAmount(totalFixedCents);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <ActivityIndicator color={c.primary} />
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
          <Pressable
            onPress={() => goBack()}
            className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80"
          >
            <ArrowLeft size={22} color={c.primary} strokeWidth={2.5} />
          </Pressable>
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
            <Pressable
              onPress={() => amountInputRef.current?.focus()}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
            >
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: "700",
                  fontVariant: ["tabular-nums"],
                  color: amount ? c.foreground : c.placeholder,
                }}
              >
                {getCurrencySymbol(expense?.currency ?? "USD")}
              </Text>
              <TextInput
                ref={amountInputRef}
                value={amount}
                onChangeText={(val) => setAmount(sanitizeAmountInput(val))}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0"
                testID="amount-input"
                placeholderTextColor={c.placeholder}
                className="text-foreground"
                style={{
                  fontSize: 48,
                  fontWeight: "700",
                  padding: 0,
                  fontVariant: ["tabular-nums"],
                  minWidth: 36,
                }}
              />
            </Pressable>
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
              <Calendar size={16} color={c.primary} />
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
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    setShowDatePicker(false);
                  }
                  if (date && event.type !== "dismissed") setExpenseDate(date);
                }}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <View className="flex-row justify-end mt-2">
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="px-4 py-2"
                >
                  <Text className="text-sm font-sans-semibold text-primary">Done</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Category */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Category</Text>
            {categories.length === 0 ? (
              <ActivityIndicator color={c.primary} />
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
                  member.user?.name || member.guestUser?.name || member.displayName || "Member";
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
                        {isSelected && <Check size={12} color={palette.white} />}
                      </View>
                      <Avatar
                        src={getMemberAvatarUrl(member.user)}
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
                  Math.abs(totalFixedCents - totalAmountCents) <= 1 ? "text-primary" : "text-destructive"
                )}>
                  {`$${totalFixed.toFixed(2)} / $${centsToAmount(totalAmountCents).toFixed(2)}`}
                </Text>
              )}
            </View>
            {/* Inline validation hint */}
            {splitType === "percentage" && splitWith.length > 0 && Math.abs(totalPct - 100) >= 0.5 && (
              <Text className="text-xs text-destructive font-sans mb-1">
                {totalPct < 100 ? `${(100 - totalPct).toFixed(1)}% remaining` : `${(totalPct - 100).toFixed(1)}% over — reduce to 100%`}
              </Text>
            )}
            {splitType === "fixed" && splitWith.length > 0 && Math.abs(totalFixedCents - totalAmountCents) > 1 && (
              <Text className="text-xs text-destructive font-sans mb-1">
                {totalFixedCents < totalAmountCents
                  ? `$${centsToAmount(totalAmountCents - totalFixedCents).toFixed(2)} remaining`
                  : `$${centsToAmount(totalFixedCents - totalAmountCents).toFixed(2)} over — reduce to match total`}
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
                  member.user?.name || member.guestUser?.name || member.displayName || "Member";
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
                        src={getMemberAvatarUrl(member.user)}
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
                                setSplitPercentages((prev) => ({ ...prev, [member.id]: sanitizePercentInput(val) }))
                              }
                              keyboardType="decimal-pad"
                              inputMode="decimal"
                              placeholder="0"
                              placeholderTextColor={c.placeholder}
                              style={{ width: 44, paddingHorizontal: 8, paddingVertical: 6, fontSize: fs.base, textAlign: "right", color: c.foreground, fontFamily: ff.regular }}
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
                                setSplitFixedAmounts((prev) => ({ ...prev, [member.id]: sanitizeAmountInput(val) }))
                              }
                              keyboardType="decimal-pad"
                              inputMode="decimal"
                              placeholder="0.00"
                              placeholderTextColor={c.placeholder}
                              style={{ width: 56, paddingHorizontal: 8, paddingVertical: 6, fontSize: fs.base, textAlign: "right", color: c.foreground, fontFamily: ff.regular }}
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

          {/* Receipt section */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Receipt</Text>
            {uploadingReceipt ? (
              <View className="flex-row items-center gap-2 py-3">
                <ActivityIndicator size="small" color={c.primary} />
                <Text className="text-sm text-muted-foreground font-sans">Uploading...</Text>
              </View>
            ) : receiptStatus === "attached" ? (
              <Card className="p-3 gap-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                    <Paperclip size={18} color={c.primary} />
                  </View>
                  <Text className="flex-1 text-sm font-sans-medium text-foreground">Receipt attached</Text>
                  <Pressable
                    onPress={handleViewReceipt}
                    disabled={loadingReceipt}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10"
                  >
                    {loadingReceipt ? (
                      <ActivityIndicator size="small" color={c.primary} />
                    ) : (
                      <>
                        <Eye size={14} color={c.primary} />
                        <Text className="text-xs font-sans-semibold text-primary">View</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteReceipt}
                    className="w-7 h-7 rounded-full bg-destructive/10 items-center justify-center"
                  >
                    <X size={14} color={c.destructive} />
                  </Pressable>
                </View>
              </Card>
            ) : (
              <View className="flex-row gap-2">
                {Platform.OS !== "web" && (
                  <Pressable
                    onPress={() => handleAttachReceipt("camera")}
                    className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-muted"
                  >
                    <Camera size={14} color={c.mutedForeground} />
                    <Text className="text-xs font-sans-medium text-muted-foreground">Photo</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleAttachReceipt("gallery")}
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-muted"
                >
                  <ImageIcon size={14} color={c.mutedForeground} />
                  <Text className="text-xs font-sans-medium text-muted-foreground">Attach Receipt</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Delete button */}
          <Pressable
            onPress={() => { hapticWarning(); setShowDeleteConfirm(true); }}
            className="flex-row items-center justify-center gap-2 p-4 rounded-xl border border-destructive/30 bg-destructive/5"
          >
            <Trash2 size={18} color={c.destructive} />
            <Text className="text-sm font-sans-semibold text-destructive">Delete Expense</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ImagePreviewModal
        visible={!!receiptPreviewUrl}
        imageUri={receiptPreviewUrl}
        onClose={() => setReceiptPreviewUrl(null)}
      />

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
