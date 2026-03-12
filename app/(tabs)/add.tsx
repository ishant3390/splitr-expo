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
  InputAccessoryView,
  Keyboard,
} from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ScanLine,
  ChevronDown,
  Plus,
  Check,
  Calendar,
  Camera,
  ImageIcon,
  X,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { groupsApi, categoriesApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { getInitials, cn, amountToCents } from "@/lib/utils";
import { hapticSelection, hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";
import { getCategoryEmoji, initSplitValues as computeSplitValues, dedupeMembers, inferCategoryFromDescription } from "@/lib/screen-helpers";
import { useNetwork } from "@/components/NetworkProvider";
import { addToQueue, generateClientId } from "@/lib/offline";
import type { CategoryDto, GroupDto, GroupMemberDto, CreateExpenseRequest, SplitRequest } from "@/lib/types";

type SplitType = "equal" | "percentage" | "fixed";

const SMART_DEFAULTS_KEY = "@splitr/add_expense_defaults";

export default function AddExpenseScreen() {
  const router = useRouter();
  const { isOnline, refreshPendingCount } = useNetwork();
  const params = useLocalSearchParams<{ returnGroupId?: string; quick?: string }>();
  const returnGroupId = Array.isArray(params.returnGroupId) ? params.returnGroupId[0] : params.returnGroupId;
  const isQuickMode = params.quick === "true";
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
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const userPickedCategoryRef = useRef(false);

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

        // Load smart defaults
        let savedGroupId: string | null = null;
        let savedCategoryId: string | null = null;
        try {
          const raw = await AsyncStorage.getItem(SMART_DEFAULTS_KEY);
          if (raw) {
            const defaults = JSON.parse(raw);
            savedGroupId = defaults.groupId ?? null;
            savedCategoryId = defaults.categoryId ?? null;
          }
        } catch {}

        if (list.length > 0) {
          const preferred = returnGroupId
            ? list.find((g) => g.id === returnGroupId)
            : savedGroupId
            ? list.find((g) => g.id === savedGroupId)
            : null;
          setSelectedGroup(preferred ?? list[0]);
        }
        const cats = Array.isArray(categoriesData) ? categoriesData : [];
        setCategories(cats);
        if (cats.length > 0) {
          const savedCat = savedCategoryId ? cats.find((c) => c.id === savedCategoryId) : null;
          setSelectedCategoryId(savedCat?.id ?? cats[0].id);
        }
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
        const list = dedupeMembers(raw);
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

  // Auto-select category based on description, unless user already picked one manually
  useEffect(() => {
    if (userPickedCategoryRef.current || categories.length === 0 || !description.trim()) return;
    const inferred = inferCategoryFromDescription(description, categories);
    if (inferred) setSelectedCategoryId(inferred);
  }, [description, categories]);

  const initSplitValues = (memberIds: string[], type: SplitType, totalStr: string) => {
    const values = computeSplitValues(memberIds, type, totalStr);
    if (type === "percentage") setSplitPercentages(values);
    else if (type === "fixed") setSplitFixedAmounts(values);
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

  const pickReceiptImage = async (useCamera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    };
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
        hapticSuccess();
      }
    } catch {
      if (useCamera) {
        toast.info("Camera unavailable. Use Gallery to pick an image.");
      }
    }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      hapticError();
      toast.error("Please enter a valid amount.");
      return;
    }
    if (amountToCents(parsedAmount) < 1) {
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
        expenseDate: expenseDate.toISOString().split("T")[0],
        splitType: splitType === "fixed" ? "exact" : splitType,
        payers: [{ userId: payerMember?.user?.id, guestUserId: payerMember?.guestUser?.id, amountPaid: totalCents }],
        splits,
      };

      if (isOnline) {
        await groupsApi.createExpense(selectedGroup.id, expenseRequest, token!);
        hapticSuccess();
        // Save smart defaults for next time
        AsyncStorage.setItem(SMART_DEFAULTS_KEY, JSON.stringify({
          groupId: selectedGroup.id,
          categoryId: selectedCategoryId,
        })).catch(() => {});
        // Show success animation briefly before navigating back
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); goBack(); }, 800);
        return;
      } else {
        // Offline: queue for later sync
        await addToQueue({
          clientId: generateClientId(),
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          request: expenseRequest,
          description: finalDescription,
          amountCents: totalCents,
          queuedAt: new Date().toISOString(),
          attempts: 0,
        });
        await refreshPendingCount();
        hapticSuccess();
        toast.info(`"${finalDescription}" saved. It will sync when you're back online.`);
      }
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
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-6">
          <SkeletonList count={4} type="activity" />
        </View>
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
        <Animated.View entering={FadeIn.duration(300)} className="border-b border-border">
          <View className="flex-row items-center justify-between px-5 py-3">
            <Pressable onPress={goBack} hitSlop={12}>
              <Text className="text-base font-sans-medium text-muted-foreground">Cancel</Text>
            </Pressable>
            <Text className="text-lg font-sans-semibold text-foreground">{isQuickMode ? "Quick Add" : "Add Expense"}</Text>
            <Pressable onPress={handleSubmit} disabled={submitting} hitSlop={12}>
              <Text className="text-base font-sans-semibold text-primary">
                {submitting ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-6 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Amount — hero section */}
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <View className="items-center py-6 mx-[-20] px-5 bg-primary/[0.03] dark:bg-primary/[0.08] rounded-3xl">
              <Text className="text-xs font-sans-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Amount
              </Text>
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
                placeholderTextColor="#94a3b8"
                className="text-foreground"
                inputAccessoryViewID="amount-done"
                style={{
                  fontSize: 56,
                  fontWeight: "700",
                  padding: 0,
                  textAlign: "center",
                  fontVariant: ["tabular-nums"],
                }}
              />
              {selectedGroup && (
                <Text className="text-xs font-sans text-muted-foreground mt-2">
                  in {selectedGroup.name}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <Input
            label="Description"
            placeholder="What was this for?"
            value={description}
            onChangeText={setDescription}
            maxLength={255}
          />
          {/* Receipt photo */}
          {!isQuickMode && receiptUri ? (
            <View className="mt-3">
              <View className="relative rounded-xl overflow-hidden" style={{ height: 120 }}>
                <Image source={{ uri: receiptUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <Pressable
                  onPress={() => setReceiptUri(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 items-center justify-center"
                >
                  <X size={14} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          ) : !isQuickMode ? (
            <View className="flex-row gap-2 mt-3">
              <Pressable
                  onPress={() => pickReceiptImage(true)}
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-muted"
                >
                  <Camera size={14} color="#64748b" />
                  <Text className="text-xs font-sans-medium text-muted-foreground">Photo</Text>
                </Pressable>
              <Pressable
                onPress={() => pickReceiptImage(false)}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-muted"
              >
                <ImageIcon size={14} color="#64748b" />
                <Text className="text-xs font-sans-medium text-muted-foreground">Gallery</Text>
              </Pressable>
            </View>
          ) : null}
          </Animated.View>

          {/* Date */}
          {!isQuickMode && <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center gap-3 bg-muted rounded-xl px-4 py-3.5"
            >
              <Calendar size={18} color="#64748b" />
              <Text className="text-base font-sans text-foreground flex-1">
                {expenseDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </Text>
              {expenseDate.toDateString() === new Date().toDateString() && (
                <Text className="text-xs font-sans-medium text-primary">Today</Text>
              )}
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setExpenseDate(date);
                }}
              />
            )}
          </Animated.View>}

          {/* Category */}
          {!isQuickMode && <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
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
          </Animated.View>}

          {/* Group selector — compact chip style, auto-selects first group */}
          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
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
          </Animated.View>

          {/* Quick mode submit button */}
          {isQuickMode && (
            <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
              <Button variant="default" onPress={handleSubmit} disabled={submitting || !amount || !description.trim()}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Quick Save
                  </Text>
                )}
              </Button>
              <Text className="text-xs text-muted-foreground font-sans text-center mt-2">
                Equal split among all members
              </Text>
            </Animated.View>
          )}

          {/* Paid by */}
          {!isQuickMode && selectedGroup && members.length > 0 && (
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
          {!isQuickMode && selectedGroup && (
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
                                  inputAccessoryViewID="amount-done"
                                  placeholder="0"
                                  placeholderTextColor="#94a3b8"
                                  style={{ width: 44, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "right", fontFamily: "Inter_400Regular" }}
                                  className="text-foreground"
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
                                  inputAccessoryViewID="amount-done"
                                  placeholder="0.00"
                                  placeholderTextColor="#94a3b8"
                                  style={{ width: 56, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "right", fontFamily: "Inter_400Regular" }}
                                  className="text-foreground"
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

      {/* Keyboard done button for decimal pad */}
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID="amount-done">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              backgroundColor: "#f1f5f9",
              borderTopWidth: 1,
              borderTopColor: "#e2e8f0",
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Pressable onPress={() => Keyboard.dismiss()}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0d9488" }}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(13, 148, 136, 0.95)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View entering={FadeInDown.duration(400).springify()}>
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4">
              <Check size={40} color="#ffffff" />
            </View>
            <Text className="text-lg font-sans-bold text-white text-center">Expense Added!</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
