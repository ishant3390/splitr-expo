import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
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
  X,
} from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { settlementsApi, groupsApi } from "@/lib/api";
import { useUserProfile, useCrossGroupSuggestions } from "@/lib/hooks";
import { invalidateAfterSettlementChange } from "@/lib/query";
import { formatCents, getInitials, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticSelection, hapticSuccess, hapticError, hapticWarning, hapticHeavy } from "@/lib/haptics";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getPaymentMethodIcon, PAYMENT_METHOD_ICON_MAP } from "@/lib/category-icons";
import { SkeletonList } from "@/components/ui/skeleton";
import { Confetti } from "@/components/ui/confetti";
import type {
  SettlementDto,
  SettlementSuggestionDto,
  GroupDto,
  GroupMemberDto,
} from "@/lib/types";

const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_ICON_MAP).map(([key, config]) => ({
  key,
  label: config.label,
}));

export default function SettleUpScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const isCrossGroup = !groupId;
  const { getToken } = useAuth();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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
  const crossGroupSuggestions = isCrossGroup ? crossGroupData.data : [];
  const crossGroupLoading = isCrossGroup ? crossGroupData.isLoading : false;
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
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("429") || msg.toLowerCase().includes("cooldown")) {
        toast.info("You already sent a reminder. Try again later.");
      } else if (msg.toLowerCase().includes("not_owed") || msg.toLowerCase().includes("doesn't owe")) {
        toast.error("This person doesn't owe you anything.");
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
    setCreateCurrency(currency || group?.defaultCurrency || "USD");
    setPaymentMethod("cash");
    setPaymentReference("");
    setNotes("");
    setShowOptionalFields(false);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createFrom) return;
    const targetGroupId = createGroupId ?? groupId;
    if (!targetGroupId) return;
    const parsedAmount = Math.round(parseFloat(amount) * 100);
    if (!parsedAmount || parsedAmount < 1) {
      hapticError();
      toast.error("Please enter a valid amount.");
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
          paymentMethod: paymentMethod || undefined,
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
    } catch {
      hapticError();
      toast.error("Failed to record settlement.");
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
        entering={FadeInDown.delay(idx * 40).duration(300).springify()}
      >
        <Pressable
          onPress={() => { hapticHeavy(); openCreateModal(s, cardGroupId, currency); }}
          className="active:opacity-70"
        >
          <Card className="p-4">
            <View className="flex-row items-center gap-3">
              <Avatar
                src={s.fromUser?.avatarUrl}
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
                  <ArrowRight size={14} color="#94a3b8" />
                  <Text
                    className="text-sm font-sans-semibold text-card-foreground"
                    numberOfLines={1}
                  >
                    {toName}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                  owes {formatCents(s.amount)}
                </Text>
              </View>
              <Avatar
                src={s.toUser?.avatarUrl}
                fallback={getInitials(toName)}
                size="md"
              />
            </View>
            <View className="mt-3 flex-row items-center justify-center gap-2">
              <View className="flex-row items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Check size={14} color="#0d9488" />
                <Text className="text-sm font-sans-semibold text-primary">
                  Record {formatCents(s.amount)} payment
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
                      ? isDark ? "#1e293b" : "#f1f5f9"
                      : isDark ? "#1e293b" : "#fef3c7",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    opacity: nudgingUserId === s.fromUser.id ? 0.5 : 1,
                  }}
                >
                  <BellRing
                    size={14}
                    color={nudgedUserIds.has(s.fromUser.id) ? "#94a3b8" : "#f59e0b"}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: nudgedUserIds.has(s.fromUser.id) ? "#94a3b8" : "#f59e0b",
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
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={goBack}
            className="flex-row items-center gap-2 px-3 py-2 -ml-2 rounded-xl active:bg-muted"
          >
            <ArrowLeft size={20} color="#0d9488" />
            <Text className="text-sm font-sans-semibold text-primary">Back</Text>
          </Pressable>
        </View>
        <View className="px-5 pt-6">
          <SkeletonList count={4} type="activity" />
        </View>
      </SafeAreaView>
    );
  }

  // --- Cross-group empty check ---
  const allSettled = isCrossGroup
    ? crossGroupTotalSuggestions === 0
    : suggestions.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable
          onPress={goBack}
          className="flex-row items-center gap-2 px-3 py-2 -ml-2 rounded-xl active:bg-muted"
        >
          <ArrowLeft size={20} color="#0d9488" />
          <Text className="text-sm font-sans-semibold text-primary">
            {isCrossGroup ? "Home" : group?.name || "Back"}
          </Text>
        </Pressable>
        <Text className="text-lg font-sans-semibold text-foreground">
          Settle Up
        </Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Group name (per-group mode only) */}
      {!isCrossGroup && (
        <View className="px-5 pt-4 pb-2">
          <Text className="text-sm text-muted-foreground font-sans">
            {group?.name}
          </Text>
        </View>
      )}

      {/* Tab switcher (per-group mode only) */}
      {!isCrossGroup && (
        <View className="flex-row mx-5 mb-4 rounded-xl bg-muted p-1">
          <Pressable
            onPress={() => { hapticSelection(); setActiveTab("suggestions"); }}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg",
              activeTab === "suggestions" ? "bg-card" : "bg-transparent"
            )}
          >
            <HandCoins
              size={16}
              color={activeTab === "suggestions" ? "#0d9488" : "#94a3b8"}
            />
            <Text
              className={cn(
                "text-sm font-sans-semibold",
                activeTab === "suggestions"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Suggested
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { hapticSelection(); setActiveTab("history"); }}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg",
              activeTab === "history" ? "bg-card" : "bg-transparent"
            )}
          >
            <History
              size={16}
              color={activeTab === "history" ? "#0d9488" : "#94a3b8"}
            />
            <Text
              className={cn(
                "text-sm font-sans-semibold",
                activeTab === "history"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              History ({settlements.length})
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
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
            tintColor="#0d9488"
          />
        }
      >
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
                      <ChevronRight size={14} color="#94a3b8" />
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
                {suggestions.length === 0 ? (
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
                      SUGGESTED PAYMENTS ({suggestions.length})
                    </Text>
                    {suggestions.map((s, suggIdx) => renderSuggestionCard(s, suggIdx))}
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
                        const method = PAYMENT_METHODS.find(
                          (m) => m.key === s.paymentMethod
                        );
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
                                    ? ` · ${method?.label ?? s.paymentMethod}`
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
                                  {formatCents(s.amount)}
                                </Text>
                                <Pressable
                                  onPress={() => { hapticWarning(); handleDeleteWithUndo(s); }}
                                  hitSlop={8}
                                >
                                  <Trash2 size={14} color="#ef4444" />
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
                          <ActivityIndicator size="small" color="#0d9488" />
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
      </ScrollView>

      {/* Create Settlement Modal */}
      <BottomSheetModal visible={showCreate} onClose={() => setShowCreate(false)} keyboardAvoiding>
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
                    borderRadius: 26,
                    backgroundColor: isDark ? "rgba(13,148,136,0.15)" : "rgba(13,148,136,0.08)",
                    padding: 3,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 23, overflow: "hidden" }}>
                    <Avatar
                      src={createFrom.fromUser?.avatarUrl}
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
                  borderRadius: 15,
                  backgroundColor: "#0d9488",
                  marginBottom: 20,
                }}
                className="items-center justify-center"
              >
                <ArrowRight size={15} color="#ffffff" />
              </View>

              {/* To person */}
              <View className="items-center" style={{ width: 80 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)",
                    padding: 3,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 23, overflow: "hidden" }}>
                    <Avatar
                      src={createFrom.toUser?.avatarUrl}
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
                {createCurrency === "USD" ? "$" : createCurrency === "EUR" ? "€" : createCurrency === "GBP" ? "£" : createCurrency}
                {amount}
              </Text>
            </View>
          </View>
        )}

        {/* Divider */}
        <View className="h-px bg-border" />

        {/* Payment method */}
        <View className="pt-4 pb-2">
          <Text className="text-xs font-sans-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Payment Method
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View className="flex-row" style={{ gap: 8, paddingHorizontal: 4 }}>
              {PAYMENT_METHODS.map((m) => {
                const isSelected = paymentMethod === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => { hapticSelection(); setPaymentMethod(m.key); }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? "#0d9488" : isDark ? "#334155" : "#e2e8f0",
                      backgroundColor: isSelected ? (isDark ? "#0d9488" + "18" : "#0d9488" + "08") : "transparent",
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
            <ChevronUp size={14} color={isDark ? "#94a3b8" : "#64748b"} />
          ) : (
            <ChevronDown size={14} color={isDark ? "#94a3b8" : "#64748b"} />
          )}
        </Pressable>

        {/* Optional fields — collapsible */}
        {showOptionalFields && (
          <Animated.View entering={FadeInDown.duration(200)} className="gap-3">
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
          onPress={handleCreate}
          disabled={submitting || !amount}
          className="mt-2"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
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
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center" }}>
              <Check size={40} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#ffffff", textAlign: "center" }}>Settled Up!</Text>
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
    </SafeAreaView>
  );
}
