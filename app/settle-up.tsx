import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HandCoins,
  History,
  Trash2,
  X,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { settlementsApi, groupsApi } from "@/lib/api";
import { formatCents, getInitials, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticSelection, hapticSuccess, hapticError, hapticWarning, hapticHeavy } from "@/lib/haptics";
import type {
  SettlementDto,
  SettlementSuggestionDto,
  GroupDto,
  GroupMemberDto,
} from "@/lib/types";

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", emoji: "💵" },
  { key: "venmo", label: "Venmo", emoji: "💜" },
  { key: "zelle", label: "Zelle", emoji: "⚡" },
  { key: "paypal", label: "PayPal", emoji: "🅿️" },
  { key: "bank_transfer", label: "Bank", emoji: "🏦" },
  { key: "other", label: "Other", emoji: "💳" },
];

export default function SettleUpScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getToken } = useAuth();
  const toast = useToast();

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [suggestions, setSuggestions] = useState<SettlementSuggestionDto[]>([]);
  const [settlements, setSettlements] = useState<SettlementDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Create settlement modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createFrom, setCreateFrom] = useState<SettlementSuggestionDto | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [settlementToDelete, setSettlementToDelete] = useState<SettlementDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<"suggestions" | "history">("suggestions");

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const [groupData, membersData, suggestionsData, settlementsData] =
        await Promise.all([
          groupsApi.get(groupId, token!),
          groupsApi.listMembers(groupId, token!),
          settlementsApi.suggestions(groupId, token!),
          settlementsApi.list(groupId, token!),
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
      setSettlements(Array.isArray(settlementsData) ? settlementsData : []);
    } catch {
      toast.error("Failed to load settlement data.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openCreateModal = (suggestion?: SettlementSuggestionDto) => {
    if (suggestion) {
      setCreateFrom(suggestion);
      setAmount((suggestion.amount / 100).toFixed(2));
    } else {
      setCreateFrom(null);
      setAmount("");
    }
    setPaymentMethod("cash");
    setPaymentReference("");
    setNotes("");
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createFrom) return;
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
        groupId,
        {
          payerUserId: createFrom.fromUser?.id,
          payerGuestUserId: createFrom.fromGuest?.id,
          payeeUserId: createFrom.toUser?.id,
          payeeGuestUserId: createFrom.toGuest?.id,
          amount: parsedAmount,
          currency: group?.defaultCurrency || "USD",
          paymentMethod: paymentMethod || undefined,
          paymentReference: paymentReference.trim() || undefined,
          settlementDate: new Date().toISOString().split("T")[0],
          notes: notes.trim() || undefined,
        },
        token!
      );
      hapticSuccess();
      toast.success("Settlement recorded!");
      setShowCreate(false);
      await loadData();
    } catch {
      hapticError();
      toast.error("Failed to record settlement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!settlementToDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await settlementsApi.delete(settlementToDelete.id, token!);
      toast.success("Settlement deleted.");
      setSettlementToDelete(null);
      await loadData();
    } catch {
      toast.error("Failed to delete settlement.");
    } finally {
      setDeleting(false);
    }
  };

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/groups");

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background items-center justify-center"
        edges={["top"]}
      >
        <ActivityIndicator color="#0d9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={goBack}>
          <ArrowLeft size={24} color="#0f172a" />
        </Button>
        <Text className="text-lg font-sans-semibold text-foreground">
          Settle Up
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Group name */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-sm text-muted-foreground font-sans">
          {group?.name}
        </Text>
      </View>

      {/* Tab switcher */}
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

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
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
              </Card>
            ) : (
              <View className="gap-3">
                <Text className="text-xs font-sans-semibold text-muted-foreground mb-1">
                  SUGGESTED PAYMENTS ({suggestions.length})
                </Text>
                {suggestions.map((s, suggIdx) => {
                  const fromName =
                    s.fromUser?.name ?? s.fromGuest?.name ?? "Someone";
                  const toName =
                    s.toUser?.name ?? s.toGuest?.name ?? "Someone";
                  return (
                    <Animated.View
                      key={suggIdx}
                      entering={FadeInDown.delay(suggIdx * 60).duration(300).springify()}
                    >
                    <Pressable
                      onPress={() => { hapticHeavy(); openCreateModal(s); }}
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
                        <View className="mt-3 items-center">
                          <View className="flex-row items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                            <Check size={14} color="#0d9488" />
                            <Text className="text-sm font-sans-semibold text-primary">
                              Record {formatCents(s.amount)} payment
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                    </Animated.View>
                  );
                })}
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
                    const method = PAYMENT_METHODS.find(
                      (m) => m.key === s.paymentMethod
                    );
                    return (
                      <Card key={s.id} className="p-4">
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-full bg-success/15 items-center justify-center">
                            <Text style={{ fontSize: 20 }}>
                              {method?.emoji ?? "💸"}
                            </Text>
                          </View>
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
                              onPress={() => { hapticWarning(); setSettlementToDelete(s); }}
                              hitSlop={8}
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </Pressable>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Settlement Modal */}
      <Modal
        transparent
        visible={showCreate}
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable
          onPress={() => setShowCreate(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
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
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-sans-bold text-foreground">
                  Record Payment
                </Text>
                <Pressable onPress={() => setShowCreate(false)}>
                  <X size={22} color="#64748b" />
                </Pressable>
              </View>

              {/* Who pays whom */}
              {createFrom && (
                <View className="flex-row items-center justify-center gap-3 py-2">
                  <View className="items-center gap-1">
                    <Avatar
                      src={createFrom.fromUser?.avatarUrl}
                      fallback={getInitials(
                        createFrom.fromUser?.name ??
                          createFrom.fromGuest?.name ??
                          "?"
                      )}
                      size="md"
                    />
                    <Text
                      className="text-xs font-sans-medium text-foreground"
                      numberOfLines={1}
                    >
                      {(
                        createFrom.fromUser?.name ??
                        createFrom.fromGuest?.name ??
                        "?"
                      )
                        .split(" ")[0]}
                    </Text>
                  </View>
                  <View className="items-center gap-0.5">
                    <ArrowRight size={20} color="#0d9488" />
                    <Text className="text-xs text-muted-foreground font-sans">
                      pays
                    </Text>
                  </View>
                  <View className="items-center gap-1">
                    <Avatar
                      src={createFrom.toUser?.avatarUrl}
                      fallback={getInitials(
                        createFrom.toUser?.name ??
                          createFrom.toGuest?.name ??
                          "?"
                      )}
                      size="md"
                    />
                    <Text
                      className="text-xs font-sans-medium text-foreground"
                      numberOfLines={1}
                    >
                      {(
                        createFrom.toUser?.name ??
                        createFrom.toGuest?.name ??
                        "?"
                      )
                        .split(" ")[0]}
                    </Text>
                  </View>
                </View>
              )}

              {/* Amount */}
              <Input
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />

              {/* Payment method */}
              <View>
                <Text className="text-sm font-sans-medium text-foreground mb-2">
                  Payment Method
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const isSelected = paymentMethod === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => { hapticSelection(); setPaymentMethod(m.key); }}
                        className={cn(
                          "flex-row items-center gap-1.5 px-3 py-2 rounded-xl border",
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-card border-border"
                        )}
                      >
                        <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                        <Text
                          className={cn(
                            "text-sm font-sans-medium",
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground"
                          )}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Reference */}
              <Input
                label="Reference (optional)"
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="e.g., @username, transaction ID"
              />

              {/* Notes */}
              <Input
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Dinner split"
              />

              {/* Submit */}
              <Button
                variant="default"
                onPress={handleCreate}
                disabled={submitting || !amount}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-base font-sans-semibold text-primary-foreground">
                    Record Payment
                  </Text>
                )}
              </Button>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

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
