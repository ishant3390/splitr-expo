import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HandCoins,
  History,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { PaymentLinksSection } from "@/components/ui/payment-links-section";
import { UpiQrModal } from "@/components/ui/upi-qr-modal";
import { settlementsApi, groupsApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { useUserProfile, useCrossGroupSuggestions } from "@/lib/hooks";
import { invalidateAfterSettlementChange } from "@/lib/query";
import { validateSettlementInvariants } from "@/lib/finance-invariants";
import {
  formatCents,
  getInitials,
  cn,
  getCurrencySymbol,
  getMemberAvatarUrl,
  parseAmountInputToCents,
} from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticSelection, hapticSuccess, hapticError, hapticWarning, hapticHeavy } from "@/lib/haptics";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getPaymentMethodIcon } from "@/lib/category-icons";
import { SkeletonList } from "@/components/ui/skeleton";
import { Confetti } from "@/components/ui/confetti";
import {
  getAvailableProviders,
  getRegionProviderCount,
  getRegionPaymentMethods,
  buildPaymentLink,
  type PaymentProvider,
} from "@/lib/payment-links";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import type {
  SettlementDto,
  SettlementSuggestionDto,
  GroupDto,
  GroupMemberDto,
} from "@/lib/types";

function getPaymentMethodsForCurrency(
  currency: string,
  configuredProviders?: PaymentProvider[]
) {
  const keys = getRegionPaymentMethods(currency, configuredProviders);
  return keys.map((key) => ({
    key,
    label: getPaymentMethodIcon(key).label,
  }));
}

const DISMISS_KEY = "@splitr/payment_handles_nudge_dismissed";

export default function SettleUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const isCrossGroup = !groupId;
  const { getToken } = useAuth();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  const { data: currentUser } = useUserProfile();
  const [nudgingUserId, setNudgingUserId] = useState<string | null>(null);
  const [nudgedUserIds, setNudgedUserIds] = useState<Set<string>>(new Set());

  // --- Per-group mode state ---
  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [suggestions, setSuggestions] = useState<SettlementSuggestionDto[]>([]);
  const [settlements, setSettlements] = useState<SettlementDto[]>([]);
  const [loading, setLoading] = useState(!isCrossGroup);

  // --- Cross-group mode ---
  const crossGroupData = useCrossGroupSuggestions();
  const crossGroupLoading = isCrossGroup ? crossGroupData.isLoading : false;
  // Filter cross-group suggestions to only those involving the current user,
  // then drop groups where the filtered list is empty.
  const crossGroupSuggestions = (isCrossGroup ? (crossGroupData.data ?? []) : []).reduce(
    (acc, cg) => {
      const mySuggestions = currentUser
        ? cg.suggestions.filter(
            (s) => s.fromUser?.id === currentUser.id || s.toUser?.id === currentUser.id
          )
        : cg.suggestions;
      if (mySuggestions.length > 0) {
        acc.push({ ...cg, suggestions: mySuggestions });
      }
      return acc;
    },
    [] as typeof crossGroupData.data
  );
  const crossGroupTotalSuggestions = crossGroupSuggestions.reduce(
    (sum, g) => sum + g.suggestions.length, 0
  );

  // Create settlement modal state
  const [showCreate, setShowCreate] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [createFrom, setCreateFrom] = useState<SettlementSuggestionDto | null>(null);
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [createCurrency, setCreateCurrency] = useState<string>("USD");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Payment deep link state
  const [paymentInitiatedProvider, setPaymentInitiatedProvider] = useState<PaymentProvider | null>(null);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [upiQrUri, setUpiQrUri] = useState("");

  // Creditor's configured providers (for method selector + Pay Directly)
  const creditorAvailableProviders = useMemo(() => {
    if (!createFrom?.toUserPaymentHandles) return [];
    return getAvailableProviders(createCurrency, createFrom.toUserPaymentHandles);
  }, [createFrom, createCurrency]);

  const creditorRegionCount = useMemo(() => {
    if (!createFrom?.toUserPaymentHandles) return 0;
    return getRegionProviderCount(createCurrency, createFrom.toUserPaymentHandles);
  }, [createFrom, createCurrency]);

  // Creditor nudge dismissal
  const [nudgeDismissed, setNudgeDismissed] = useState(true); // default hidden until checked
  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((val) => {
      if (val) {
        const expiry = parseInt(val, 10);
        setNudgeDismissed(Date.now() < expiry);
      } else {
        setNudgeDismissed(false);
      }
    });
  }, []);

  // Success overlay
  const [showSuccess, setShowSuccess] = useState(false);

  // Delete state
  const [settlementToDelete, setSettlementToDelete] = useState<SettlementDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pendingSettlementDeleteRef = useRef<{ settlement: SettlementDto; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Settlement pagination
  const [settlementPage, setSettlementPage] = useState(0);
  const [hasMoreSettlements, setHasMoreSettlements] = useState(false);
  const [loadingMoreSettlements, setLoadingMoreSettlements] = useState(false);

  // Tab (per-group mode only)
  const [activeTab, setActiveTab] = useState<"suggestions" | "history">("suggestions");

  const SETTLEMENT_PAGE_SIZE = 20;

  // --- Per-group data loading (only when groupId is provided) ---
  const loadData = useCallback(async () => {
    if (isCrossGroup) return;
    try {
      const token = await getToken();
      const [groupData, membersData, suggestionsData, settlementsData] =
        await Promise.all([
          groupsApi.get(groupId!, token!),
          groupsApi.listMembers(groupId!, token!),
          settlementsApi.suggestions(groupId!, token!),
          settlementsApi.list(groupId!, token!, { page: 0, limit: SETTLEMENT_PAGE_SIZE }),
        ]);
      setGroup(groupData);
      const rawMembers = Array.isArray(membersData) ? membersData : [];
      const seen = new Set<string>();
      setMembers(
        rawMembers.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        })
      );
      setSuggestions(Array.isArray(suggestionsData) ? suggestionsData : []);
      const items = Array.isArray(settlementsData) ? settlementsData : [];
      setSettlements(items);
      setSettlementPage(0);
      setHasMoreSettlements(items.length >= SETTLEMENT_PAGE_SIZE);
    } catch {
      toast.error("Failed to load settlement data.");
    } finally {
      setLoading(false);
    }
  }, [groupId, isCrossGroup]);

  const loadMoreSettlements = async () => {
    if (!hasMoreSettlements || loadingMoreSettlements) return;
    setLoadingMoreSettlements(true);
    try {
      const token = await getToken();
      const nextPage = settlementPage + 1;
      const data = await settlementsApi.list(groupId!, token!, { page: nextPage, limit: SETTLEMENT_PAGE_SIZE });
      const items = Array.isArray(data) ? data : [];
      setSettlements((prev) => [...prev, ...items]);
      setSettlementPage(nextPage);
      setHasMoreSettlements(items.length >= SETTLEMENT_PAGE_SIZE);
    } catch {
      // Silently fail
    } finally {
      setLoadingMoreSettlements(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!isCrossGroup) {
        loadData();
      }
    }, [loadData, isCrossGroup])
  );

  const handleNudge = async (targetUserId: string, nudgeGroupId?: string) => {
    const gId = nudgeGroupId ?? groupId;
    if (!gId || nudgingUserId) return;
    setNudgingUserId(targetUserId);
    try {
      const token = await getToken();
      if (!token) return;
      await groupsApi.nudge(gId, targetUserId, token);
      hapticSuccess();
      toast.success("Reminder sent!");
      setNudgedUserIds((prev) => new Set(prev).add(targetUserId));
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      if (apiErr?.code === "ERR-407") {
        toast.info(getUserMessage(apiErr));
        setNudgedUserIds((prev) => new Set(prev).add(targetUserId));
      } else if (apiErr?.code === "ERR-408") {
        toast.info(getUserMessage(apiErr));
      } else {
        toast.error("Failed to send reminder.");
      }
      hapticError();
    } finally {
      setNudgingUserId(null);
    }
  };

  const openCreateModal = (suggestion: SettlementSuggestionDto, modalGroupId?: string, currency?: string) => {
    setCreateFrom(suggestion);
    setAmount((suggestion.amount / 100).toFixed(2));
    setCreateGroupId(modalGroupId ?? groupId ?? null);
    setCreateCurrency(currency || suggestion.currency || group?.defaultCurrency || "USD");
    setPaymentMethod("cash");
    setPaymentReference("");
    setNotes("");
    setShowOptionalFields(false);
    setPaymentInitiatedProvider(null);
    setShowCreate(true);
  };

  const handleCreate = async (paymentMethodOverride?: string) => {
    if (!createFrom) return;
    const targetGroupId = createGroupId ?? groupId;
    if (!targetGroupId) return;
    const parsedAmount = parseAmountInputToCents(amount);
    if (!parsedAmount || parsedAmount < 1) {
      hapticError();
      toast.error("Please enter a valid amount.");
      return;
    }

    const resolvedMethod = paymentMethodOverride ?? paymentMethod;
    const settlementInvariant = validateSettlementInvariants({
      payerUserId: createFrom.fromUser?.id,
      payerGuestUserId: createFrom.fromGuest?.id,
      payeeUserId: createFrom.toUser?.id,
      payeeGuestUserId: createFrom.toGuest?.id,
      amount: parsedAmount,
      currency: createCurrency,
    });
    if (!settlementInvariant.ok) {
      hapticError();
      toast.error(settlementInvariant.message);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      await settlementsApi.create(
        targetGroupId,
        {
          payerUserId: createFrom.fromUser?.id,
          payerGuestUserId: createFrom.fromGuest?.id,
          payeeUserId: createFrom.toUser?.id,
          payeeGuestUserId: createFrom.toGuest?.id,
          amount: parsedAmount,
          currency: createCurrency,
          paymentMethod: resolvedMethod || undefined,
          paymentReference: paymentReference.trim() || undefined,
          settlementDate: new Date().toISOString().split("T")[0],
          notes: notes.trim() || undefined,
        },
        token!
      );
      hapticSuccess();
      setShowCreate(false);
      setShowSuccess(true);
      setTimeout(async () => {
        setShowSuccess(false);
        if (isCrossGroup) {
          crossGroupData.refetch();
        } else {
          await loadData();
        }
        invalidateAfterSettlementChange(targetGroupId);
      }, 800);
    } catch (err: unknown) {
      console.error("[SettleUp] Failed to record settlement:", err);
      hapticError();
      const apiErr = parseApiError(err);
      if (apiErr) {
        toast.error(getUserMessage(apiErr));
      } else {
        toast.error("Failed to record settlement.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWithUndo = (settlement: SettlementDto) => {
    if (pendingSettlementDeleteRef.current) {
      clearTimeout(pendingSettlementDeleteRef.current.timer);
      pendingSettlementDeleteRef.current = null;
    }

    setSettlements((prev) => prev.filter((s) => s.id !== settlement.id));

    const timer = setTimeout(async () => {
      pendingSettlementDeleteRef.current = null;
      try {
        const token = await getToken();
        await settlementsApi.delete(settlement.id, token!);
        await loadData(); // Refresh suggestions after actual delete
        if (groupId) invalidateAfterSettlementChange(groupId);
      } catch {
        setSettlements((prev) => [...prev, settlement]);
        toast.error("Failed to delete settlement.");
      }
    }, 5000);

    pendingSettlementDeleteRef.current = { settlement, timer };

    const payerName = settlement.payerUser?.name ?? settlement.payerGuest?.name ?? "Someone";
    toast.info(`Settlement by ${payerName} deleted`, {
      duration: 5000,
      action: {
        label: "Undo",
        onPress: () => {
          if (pendingSettlementDeleteRef.current?.settlement.id === settlement.id) {
            clearTimeout(pendingSettlementDeleteRef.current.timer);
            pendingSettlementDeleteRef.current = null;
          }
          setSettlements((prev) => [...prev, settlement].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        },
      },
    });
  };

  const handleDelete = async () => {
    if (!settlementToDelete) return;
    const s = settlementToDelete;
    setSettlementToDelete(null);
    handleDeleteWithUndo(s);
  };

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/groups");

  // --- Shared suggestion card renderer ---
  const renderSuggestionCard = (
    s: SettlementSuggestionDto,
    idx: number,
    cardGroupId?: string,
    currency?: string,
  ) => {
    const fromName = s.fromUser?.name ?? s.fromGuest?.name ?? "Someone";
    const toName = s.toUser?.name ?? s.toGuest?.name ?? "Someone";
    return (
      <Animated.View
        key={`${cardGroupId ?? groupId}-${idx}`}
        entering={FadeInDown.delay(Math.min(idx, 5) * 50).duration(300).springify()}
      >
        <Pressable
          onPress={() => { hapticHeavy(); openCreateModal(s, cardGroupId, currency); }}
          className="active:opacity-70"
        >
          <Card className="p-4" style={{ borderLeftWidth: 3, borderLeftColor: c.primary }}>
            <View className="flex-row items-center gap-3">
              <Avatar
                src={getMemberAvatarUrl(s.fromUser)}
                fallback={getInitials(fromName)}
                size="md"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-sm font-sans-semibold text-card-foreground"
                    numberOfLines={1}
                  >
                    {fromName}
                  </Text>
                  <ArrowRight size={14} color={c.mutedForeground} />
                  <Text
                    className="text-sm font-sans-semibold text-card-foreground"
                    numberOfLines={1}
                  >
                    {toName}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                  owes {formatCents(s.amount, s.currency)}
                </Text>
              </View>
              <Avatar
                src={getMemberAvatarUrl(s.toUser)}
                fallback={getInitials(toName)}
                size="md"
              />
            </View>
            <View className="mt-3 flex-row items-center justify-center gap-2">
              <View className="flex-row items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Check size={14} color={c.primary} />
                <Text className="text-sm font-sans-semibold text-primary">
                  Record {formatCents(s.amount, s.currency)} payment
                </Text>
              </View>
              {currentUser && s.toUser?.id === currentUser.id && s.fromUser && (
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleNudge(s.fromUser!.id, cardGroupId);
                  }}
                  disabled={nudgingUserId === s.fromUser.id || nudgedUserIds.has(s.fromUser.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: nudgedUserIds.has(s.fromUser.id)
                      ? c.secondary
                      : isDark ? c.secondary : "#fef3c7",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radius.full,
                    opacity: nudgingUserId === s.fromUser.id ? 0.5 : 1,
                  }}
                >
                  <BellRing
                    size={14}
                    color={nudgedUserIds.has(s.fromUser.id) ? palette.slate400 : palette.amber500}
                  />
                  <Text
                    style={{
                      fontSize: fs.sm,
                      fontFamily: ff.semibold,
                      color: nudgedUserIds.has(s.fromUser.id) ? palette.slate400 : palette.amber500,
                    }}
                  >
                    {nudgedUserIds.has(s.fromUser.id) ? "Sent" : "Remind"}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    );
  };

  // --- Loading state ---
  const isLoading = isCrossGroup ? crossGroupLoading : loading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={goBack}
            className="flex-row items-center gap-2 px-3 py-2 -ml-2 rounded-xl active:bg-muted"
          >
            <ArrowLeft size={20} color={c.primary} />
            <Text className="text-sm font-sans-semibold text-primary">Back</Text>
          </Pressable>
        </View>
        <View className="px-5 pt-6">
          <SkeletonList count={4} type="activity" />
        </View>
      </View>
    );
  }

  // Filter per-group suggestions to only those involving the current user
  const myGroupSuggestions = suggestions.filter((s) =>
    currentUser
      ? s.fromUser?.id === currentUser.id || s.toUser?.id === currentUser.id
      : true
  );

  // --- Cross-group empty check ---
  const allSettled = isCrossGroup
    ? crossGroupTotalSuggestions === 0
    : myGroupSuggestions.length === 0;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              if (isCrossGroup) {
                crossGroupData.refetch();
              } else {
                await loadData();
              }
              setRefreshing(false);
            }}
            tintColor={palette.white}
          />
        }
      >
        {/* Hero Section */}
        <LinearGradient
          colors={(isDark ? GRADIENTS.heroEmeraldDark : GRADIENTS.heroEmerald) as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: "hidden", paddingTop: insets.top }}
        >
          {/* Watermark HandCoins icon */}
          <View
            style={{
              position: "absolute",
              bottom: -30,
              right: -20,
              opacity: 0.06,
            }}
            pointerEvents="none"
          >
            <HandCoins size={200} color={palette.white} strokeWidth={1} />
          </View>

          {/* Decorative orb */}
          <View
            style={{
              position: "absolute",
              top: -40,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: radius.full,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
            pointerEvents="none"
          />

          {/* Navigation */}
          <View className="flex-row items-center px-4 pt-3 pb-2">
            <Pressable
              onPress={goBack}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <ArrowLeft size={22} color={palette.white} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Title + Summary */}
          <View className="px-5 pt-1 pb-2">
            <Text
              className="text-2xl font-sans-bold"
              style={{ color: palette.white }}
            >
              Settle Up
            </Text>
            {!isCrossGroup && group?.name ? (
              <Text
                className="text-sm font-sans mt-1"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {group.name}
              </Text>
            ) : null}
          </View>

          {/* Summary stat */}
          <View className="px-5 pb-4">
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: radius.DEFAULT,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.lg,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HandCoins size={18} color={palette.white} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-sans-bold"
                  style={{ color: palette.white }}
                >
                  {allSettled
                    ? "All settled!"
                    : isCrossGroup
                    ? `${crossGroupTotalSuggestions} payment${crossGroupTotalSuggestions === 1 ? "" : "s"} needed`
                    : `${myGroupSuggestions.length} payment${myGroupSuggestions.length === 1 ? "" : "s"} needed`
                  }
                </Text>
                <Text
                  className="text-xs font-sans"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {allSettled
                    ? "No outstanding debts"
                    : isCrossGroup
                    ? `Across ${crossGroupSuggestions.length} group${crossGroupSuggestions.length === 1 ? "" : "s"}`
                    : "Simplified debt suggestions"
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Tab switcher (per-group mode only) — inside hero */}
          {!isCrossGroup && (
            <View
              className="flex-row mx-5 mb-4 rounded-xl p-1"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <Pressable
                onPress={() => { hapticSelection(); setActiveTab("suggestions"); }}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg"
                style={activeTab === "suggestions" ? { backgroundColor: "rgba(255,255,255,0.2)" } : undefined}
              >
                <HandCoins
                  size={16}
                  color={activeTab === "suggestions" ? palette.white : "rgba(255,255,255,0.5)"}
                />
                <Text
                  className="text-sm font-sans-semibold"
                  style={{ color: activeTab === "suggestions" ? palette.white : "rgba(255,255,255,0.5)" }}
                >
                  Suggested
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { hapticSelection(); setActiveTab("history"); }}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg"
                style={activeTab === "history" ? { backgroundColor: "rgba(255,255,255,0.2)" } : undefined}
              >
                <History
                  size={16}
                  color={activeTab === "history" ? palette.white : "rgba(255,255,255,0.5)"}
                />
                <Text
                  className="text-sm font-sans-semibold"
                  style={{ color: activeTab === "history" ? palette.white : "rgba(255,255,255,0.5)" }}
                >
                  History ({settlements.length})
                </Text>
              </Pressable>
            </View>
          )}
        </LinearGradient>

        <View className="px-5 pt-4">
        {/* ============ CROSS-GROUP MODE ============ */}
        {isCrossGroup ? (
          <>
            {allSettled ? (
              <Card className="p-8 items-center gap-3">
                <Text style={{ fontSize: 40 }}>🎉</Text>
                <Text className="text-base font-sans-semibold text-foreground">
                  All settled up!
                </Text>
                <Text className="text-sm text-muted-foreground font-sans text-center">
                  No outstanding debts across any of your groups.
                </Text>
                <Button variant="outline" className="mt-3" onPress={() => router.replace("/(tabs)")}>
                  <Text className="text-sm font-sans-semibold text-primary">Back to Home</Text>
                </Button>
              </Card>
            ) : (
              <View className="gap-5">
                {crossGroupSuggestions.map((cg) => (
                  <View key={cg.groupId} className="gap-3">
                    {/* Section header */}
                    <Pressable
                      onPress={() => {
                        hapticSelection();
                        router.push({ pathname: "/settle-up", params: { groupId: cg.groupId } });
                      }}
                      className="flex-row items-center justify-between"
                    >
                      <Text className="text-xs font-sans-semibold text-muted-foreground">
                        {cg.groupName.toUpperCase()} ({cg.suggestions.length})
                      </Text>
                      <ChevronRight size={14} color={c.mutedForeground} />
                    </Pressable>
                    {/* Suggestions for this group */}
                    {cg.suggestions.map((s, idx) =>
                      renderSuggestionCard(s, idx, cg.groupId, cg.currency)
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* ============ PER-GROUP MODE (unchanged) ============ */
          <>
            {activeTab === "suggestions" ? (
              <>
                {myGroupSuggestions.length === 0 ? (
                  <Card className="p-8 items-center gap-3">
                    <Text style={{ fontSize: 40 }}>🎉</Text>
                    <Text className="text-base font-sans-semibold text-foreground">
                      All settled up!
                    </Text>
                    <Text className="text-sm text-muted-foreground font-sans text-center">
                      No outstanding debts in this group.
                    </Text>
                    <Button variant="outline" className="mt-3" onPress={goBack}>
                      <Text className="text-sm font-sans-semibold text-primary">Back to Group</Text>
                    </Button>
                  </Card>
                ) : (
                  <View className="gap-3">
                    <Text className="text-xs font-sans-semibold text-muted-foreground mb-1">
                      SUGGESTED PAYMENTS ({myGroupSuggestions.length})
                    </Text>
                    {myGroupSuggestions.map((s, suggIdx) => renderSuggestionCard(s, suggIdx))}
                  </View>
                )}
              </>
            ) : (
              <>
                {settlements.length === 0 ? (
                  <Card className="p-8 items-center gap-3">
                    <Text style={{ fontSize: 40 }}>📋</Text>
                    <Text className="text-base font-sans-semibold text-foreground">
                      No settlements yet
                    </Text>
                    <Text className="text-sm text-muted-foreground font-sans text-center">
                      Record a payment when someone settles their debt.
                    </Text>
                    <Button variant="outline" className="mt-3" onPress={() => { hapticSelection(); setActiveTab("suggestions"); }}>
                      <Text className="text-sm font-sans-semibold text-primary">View Suggested Payments</Text>
                    </Button>
                  </Card>
                ) : (
                  <View className="gap-3">
                    {settlements
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((s) => {
                        const payerName =
                          s.payerUser?.name ?? s.payerGuest?.name ?? "Someone";
                        const payeeName =
                          s.payeeUser?.name ?? s.payeeGuest?.name ?? "Someone";
                        const methodConfig = getPaymentMethodIcon(s.paymentMethod);
                        return (
                          <Card key={s.id} className="p-4">
                            <View className="flex-row items-center gap-3">
                              <CategoryIcon config={methodConfig} />
                              <View className="flex-1">
                                <Text className="text-sm font-sans-semibold text-card-foreground">
                                  {payerName} paid {payeeName}
                                </Text>
                                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                  {s.settlementDate}
                                  {s.paymentMethod
                                    ? ` · ${methodConfig.label ?? s.paymentMethod}`
                                    : ""}
                                </Text>
                                {s.notes ? (
                                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                    {s.notes}
                                  </Text>
                                ) : null}
                              </View>
                              <View className="items-end gap-1">
                                <Text selectable className="text-sm font-sans-bold text-success" style={{ fontVariant: ["tabular-nums"] }}>
                                  {formatCents(s.amount, s.currency)}
                                </Text>
                                <Pressable
                                  onPress={() => { hapticWarning(); handleDeleteWithUndo(s); }}
                                  hitSlop={8}
                                  accessibilityLabel={`Delete settlement ${s.id}`}
                                >
                                  <Trash2 size={14} color={c.destructive} />
                                </Pressable>
                              </View>
                            </View>
                          </Card>
                        );
                      })}

                    {/* Load More */}
                    {hasMoreSettlements && (
                      <Pressable
                        onPress={loadMoreSettlements}
                        disabled={loadingMoreSettlements}
                        className="py-3 items-center"
                      >
                        {loadingMoreSettlements ? (
                          <ActivityIndicator size="small" color={c.primary} />
                        ) : (
                          <Text className="text-sm font-sans-semibold text-primary">
                            Load more settlements
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
        </View>
      </ScrollView>

      {/* Create Settlement Modal */}
      <BottomSheetModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        keyboardAvoiding
        modalTestID="settle-up-record-payment-modal"
      >
        {/* Drag handle */}
        <View className="items-center -mt-2 mb-2">
          <View
            style={{ width: 36, height: 4, borderRadius: 2 }}
            className="bg-border"
          />
        </View>

        {createFrom && (
          <View className="items-center">
            {/* People row */}
            <View
              className="flex-row items-center justify-center w-full py-3"
              style={{ gap: 12 }}
            >
              {/* From person */}
              <View className="items-center" style={{ width: 80 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.full,
                    backgroundColor: isDark ? "rgba(13,148,136,0.15)" : "rgba(13,148,136,0.08)",
                    padding: 3,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: radius.full, overflow: "hidden" }}>
                    <Avatar
                      src={getMemberAvatarUrl(createFrom.fromUser)}
                      fallback={getInitials(
                        createFrom.fromUser?.name ??
                          createFrom.fromGuest?.name ??
                          "?"
                      )}
                      size="lg"
                      className="w-full h-full"
                    />
                  </View>
                </View>
                <Text className="text-sm font-sans-semibold text-foreground text-center" numberOfLines={1}>
                  {(createFrom.fromUser?.name ?? createFrom.fromGuest?.name ?? "?").split(" ")[0]}
                </Text>
              </View>

              {/* Arrow */}
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.lg,
                  backgroundColor: c.primary,
                  marginBottom: 20,
                }}
                className="items-center justify-center"
              >
                <ArrowRight size={15} color={palette.white} />
              </View>

              {/* To person */}
              <View className="items-center" style={{ width: 80 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.full,
                    backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)",
                    padding: 3,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: radius.full, overflow: "hidden" }}>
                    <Avatar
                      src={getMemberAvatarUrl(createFrom.toUser)}
                      fallback={getInitials(
                        createFrom.toUser?.name ??
                          createFrom.toGuest?.name ??
                          "?"
                      )}
                      size="lg"
                      className="w-full h-full"
                    />
                  </View>
                </View>
                <Text className="text-sm font-sans-semibold text-foreground text-center" numberOfLines={1}>
                  {(createFrom.toUser?.name ?? createFrom.toGuest?.name ?? "?").split(" ")[0]}
                </Text>
              </View>
            </View>

            {/* Amount — read-only display */}
            <View className="items-center py-4">
              <Text
                style={{ fontSize: 48, lineHeight: 56 }}
                className="font-sans-bold text-foreground"
              >
                {getCurrencySymbol(createCurrency)}
                {amount}
              </Text>
            </View>
          </View>
        )}

        {/* Divider */}
        <View className="h-px bg-border" />

        {/* Pay via deep links — only when current user is debtor and creditor has handles */}
        {createFrom && currentUser && createFrom.fromUser?.id === currentUser.id && (() => {
          const creditorHandles = createFrom.toUserPaymentHandles;
          if (creditorAvailableProviders.length === 0) return null;

          // On web, replace UPI deep link with QR modal
          const handlePaymentInitiated = (provider: PaymentProvider) => {
            if (provider === "upi" && Platform.OS === "web") {
              const result = buildPaymentLink(provider, creditorHandles!, {
                amount: parseFloat(amount) || 0,
                currency: createCurrency,
                creditorName: createFrom.toUser?.name ?? "payee",
              });
              if (result.url) {
                setUpiQrUri(result.url);
                setShowUpiQr(true);
              }
              return;
            }
            setPaymentInitiatedProvider(provider);
            setPaymentMethod(provider);
          };

          return (
            <View className="pt-4 pb-2">
              <PaymentLinksSection
                providers={creditorAvailableProviders}
                creditorHandles={creditorHandles!}
                amount={parseFloat(amount) || 0}
                currency={createCurrency}
                creditorName={createFrom.toUser?.name ?? "payee"}
                onPaymentInitiated={handlePaymentInitiated}
                regionProviderCount={creditorRegionCount}
              />
            </View>
          );
        })()}

        {/* Post-payment confirmation */}
        {paymentInitiatedProvider && (
          <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)} className="py-3">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <Text className="text-sm font-sans-semibold text-foreground text-center mb-3">
                Did you complete the payment via {paymentInitiatedProvider === "cashapp" ? "Cash App" : paymentInitiatedProvider.charAt(0).toUpperCase() + paymentInitiatedProvider.slice(1)}?
              </Text>
              <View className="flex-row gap-3">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onPress={() => {
                    const provider = paymentInitiatedProvider;
                    setPaymentInitiatedProvider(null);
                    handleCreate(provider!);
                  }}
                >
                  <Text className="text-sm font-sans-semibold text-primary-foreground">
                    Yes, record settlement
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => setPaymentInitiatedProvider(null)}
                >
                  <Text className="text-sm font-sans-semibold text-foreground">
                    Not yet
                  </Text>
                </Button>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Payment method */}
        <View className="pt-4 pb-2">
          <Text className="text-xs font-sans-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Payment Method
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View className="flex-row" style={{ gap: 8, paddingHorizontal: 4 }}>
              {getPaymentMethodsForCurrency(createCurrency, creditorAvailableProviders).map((m) => {
                const isSelected = paymentMethod === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => { hapticSelection(); setPaymentMethod(m.key); }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: radius.DEFAULT,
                      borderWidth: 1.5,
                      borderColor: isSelected ? c.primary : c.border,
                      backgroundColor: isSelected ? (isDark ? c.primary + "18" : c.primary + "08") : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CategoryIcon config={getPaymentMethodIcon(m.key)} size="sm" />
                    <Text
                      className={cn(
                        "text-sm font-sans-medium",
                        isSelected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Optional fields toggle */}
        <Pressable
          onPress={() => { hapticSelection(); setShowOptionalFields(!showOptionalFields); }}
          className="flex-row items-center justify-center gap-1.5 py-2"
        >
          <Text className="text-sm font-sans-medium text-muted-foreground">
            {showOptionalFields ? "Hide details" : "Add reference or note"}
          </Text>
          {showOptionalFields ? (
            <ChevronUp size={14} color={c.mutedForeground} />
          ) : (
            <ChevronDown size={14} color={c.mutedForeground} />
          )}
        </Pressable>

        {/* Optional fields — collapsible */}
        {showOptionalFields && (
          <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)} className="gap-3">
            <Input
              label="Reference"
              value={paymentReference}
              onChangeText={setPaymentReference}
              placeholder="e.g., @username, transaction ID"
            />
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Dinner split"
            />
          </Animated.View>
        )}

        {/* Submit */}
        <Button
          variant="default"
          size="lg"
          onPress={() => handleCreate()}
          disabled={submitting || !amount}
          className="mt-2"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text className="text-base font-sans-bold text-primary-foreground">
              Record Payment
            </Text>
          )}
        </Button>
      </BottomSheetModal>

      {/* Confetti when all settled */}
      <Confetti visible={!isLoading && allSettled && (isCrossGroup || activeTab === "suggestions")} />

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
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
          <Animated.View entering={FadeInDown.duration(300).springify()}>
            <View style={{ width: 80, height: 80, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center" }}>
              <Check size={40} color={palette.white} />
            </View>
            <Text style={{ fontSize: fs.xl, fontFamily: ff.bold, color: palette.white, textAlign: "center" }}>Settled Up!</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={!!settlementToDelete}
        title="Delete Settlement"
        message="This will reverse the balance changes. Are you sure?"
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setSettlementToDelete(null)}
      />

      {/* UPI QR Modal (web) */}
      <UpiQrModal
        visible={showUpiQr}
        onClose={() => setShowUpiQr(false)}
        onDone={() => {
          setShowUpiQr(false);
          setPaymentInitiatedProvider("upi");
          setPaymentMethod("upi");
        }}
        upiUri={upiQrUri}
        creditorName={createFrom?.toUser?.name ?? "payee"}
        amount={`${getCurrencySymbol(createCurrency)}${amount}`}
      />

      {/* Creditor nudge — add payment handles */}
      {currentUser &&
        !nudgeDismissed &&
        (!currentUser.paymentHandles || Object.keys(currentUser.paymentHandles).length === 0) &&
        !isCrossGroup &&
        myGroupSuggestions.some((s) => s.toUser?.id === currentUser.id) && (
          <View className="absolute bottom-4 left-5 right-5">
            <Animated.View entering={FadeInDown.duration(300).springify()} exiting={FadeOutUp.duration(150)}>
              <Card className="p-4 flex-row items-center gap-3">
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.lg,
                    backgroundColor: isDark ? "rgba(13,148,136,0.15)" : "rgba(13,148,136,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wallet size={18} color={c.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-semibold text-card-foreground">
                    Add your payment details
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans">
                    So friends can pay you directly
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => {
                      hapticSelection();
                      router.push("/payment-methods");
                    }}
                    className="px-3 py-1.5 rounded-full bg-primary"
                    accessibilityRole="button"
                  >
                    <Text className="text-xs font-sans-semibold text-primary-foreground">
                      Add
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      // Dismiss for 7 days
                      const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
                      AsyncStorage.setItem(DISMISS_KEY, String(expiry));
                      setNudgeDismissed(true);
                    }}
                    hitSlop={8}
                    accessibilityLabel="Dismiss payment details nudge"
                  >
                    <X size={16} color={c.mutedForeground} />
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          </View>
        )}
    </View>
  );
}
