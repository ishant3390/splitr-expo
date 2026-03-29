import React, { useState, useCallback, useMemo, useRef } from "react";
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
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  Plus,
  Settings,
  HandCoins,
  Receipt,
  UserPlus,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { groupsApi, expensesApi } from "@/lib/api";
import { sanitizeImageUrl } from "@/lib/image-utils";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { useCategories } from "@/lib/hooks";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCents, formatDate, formatRelativeTime, cn, getFxDisplayAmounts } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticLight, hapticWarning } from "@/lib/haptics";
import { dedupeMembers, computeExpenseCardDisplay, formatActivityTitle } from "@/lib/screen-helpers";
import { SkeletonList } from "@/components/ui/skeleton";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { CategoryIcon } from "@/components/ui/category-icon";
import { getActivityIcon } from "@/lib/category-icons";
import { AvatarStrip } from "@/components/ui/avatar-strip";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { colors, fontSize as fs, radius, palette } from "@/lib/tokens";
import type { GroupDto, GroupMemberDto, ExpenseDto, ActivityLogDto } from "@/lib/types";

export default function GroupDetailScreen() {
  const router = useRouter();
  const goBack = () => router.replace("/(tabs)/groups");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  const [group, setGroup] = useState<GroupDto | null>(null);
  const [members, setMembers] = useState<GroupMemberDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Resolve current user's backend ID from members list
  const currentBackendUserId = useMemo(() => {
    const myEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!myEmail) return undefined;
    const myMember = members.find(
      (m) => m.user?.email?.toLowerCase() === myEmail.toLowerCase()
    );
    return myMember?.user?.id;
  }, [clerkUser?.primaryEmailAddress?.emailAddress, members]);

  // Current user's balance from member record
  const myMemberBalance = useMemo(() => {
    const myEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!myEmail) return 0;
    const myMember = members.find(
      (m) => m.user?.email?.toLowerCase() === myEmail.toLowerCase()
    );
    return myMember?.balance ?? 0;
  }, [clerkUser?.primaryEmailAddress?.emailAddress, members]);

  const { data: categoriesList = [] } = useCategories();
  const categoryMap = React.useMemo(
    () => Object.fromEntries(categoriesList.map((c) => [c.id, c])),
    [categoriesList]
  );

  // Delete expense state
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseDto | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const pendingDeleteRef = useRef<{ expense: ExpenseDto; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Expense pagination
  const [expenseCursor, setExpenseCursor] = useState<string | undefined>(undefined);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false);
  const [loadingMoreExpenses, setLoadingMoreExpenses] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const loadData = async () => {
    try {
      const token = await getToken();
      const [groupData, membersData, expensesResponse, activityData] = await Promise.all([
        groupsApi.get(id, token!),
        groupsApi.listMembers(id, token!),
        groupsApi.listExpenses(id, token!, { limit: "5" }),
        groupsApi.activity(id, token!, { limit: 50 }).catch(() => [] as ActivityLogDto[]),
      ]);
      // Sanitize double-protocol URLs (BE-6 safety net)
      if (groupData.bannerImageUrl) groupData.bannerImageUrl = sanitizeImageUrl(groupData.bannerImageUrl);
      setGroup(groupData);
      const dedupedMembers = dedupeMembers(membersData);
      setMembers(dedupedMembers);
      setExpenses(expensesResponse.data ?? []);
      setExpenseCursor(expensesResponse.pagination?.nextCursor);
      setHasMoreExpenses(expensesResponse.pagination?.hasMore ?? false);
      setActivityItems(activityData.filter((a: ActivityLogDto) => !a.activityType.startsWith("expense_")));
      setShowAllExpenses(false);
    } catch {
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreExpenses = async () => {
    if (loadingMoreExpenses || !expenseCursor) return;
    setLoadingMoreExpenses(true);
    try {
      const token = await getToken();
      const response = await groupsApi.listExpenses(id, token!, {
        cursor: expenseCursor,
        limit: "20",
      });
      setExpenses((prev) => [...prev, ...(response.data ?? [])]);
      setExpenseCursor(response.pagination?.nextCursor);
      setHasMoreExpenses(response.pagination?.hasMore ?? false);
    } catch {
      // Silently fail
    } finally {
      setLoadingMoreExpenses(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDeleteExpenseWithUndo = (expense: ExpenseDto) => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      pendingDeleteRef.current = null;
    }

    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));

    const timer = setTimeout(async () => {
      pendingDeleteRef.current = null;
      try {
        const token = await getToken();
        await expensesApi.delete(expense.id, token!);
      } catch (err: unknown) {
        setExpenses((prev) => [...prev, expense]);
        const apiErr = parseApiError(err);
        toast.error(apiErr ? getUserMessage(apiErr) : "Failed to delete expense.");
      }
    }, 5000);

    pendingDeleteRef.current = { expense, timer };

    toast.info(`"${expense.description}" deleted`, {
      duration: 5000,
      action: {
        label: "Undo",
        onPress: () => {
          if (pendingDeleteRef.current?.expense.id === expense.id) {
            clearTimeout(pendingDeleteRef.current.timer);
            pendingDeleteRef.current = null;
          }
          setExpenses((prev) => [...prev, expense].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        },
      },
    });
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setExpenseToDelete(null);
    handleDeleteExpenseWithUndo(expenseToDelete);
  };

  const handleSeeAll = () => {
    setShowAllExpenses(true);
    if (hasMoreExpenses) {
      loadMoreExpenses();
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="px-5 pt-6">
          <SkeletonList count={5} type="activity" />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={goBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80"
          >
            <ArrowLeft size={22} color={c.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={Receipt}
            iconColor={palette.slate400}
            title="Group not found"
            subtitle="This group may have been deleted or is no longer available."
            actionLabel="Go Home"
            onAction={() => router.replace("/(tabs)")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);
  const isArchived = group.isArchived === true;

  // Determine which expenses to show
  const displayExpenses = showAllExpenses ? expenses : expenses.slice(0, 5);
  const hasHiddenExpenses = !showAllExpenses && expenses.length > 5;

  // Recent activity items (non-expense: settlements, member joins)
  const recentActivity = activityItems.slice(0, 5);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.white} />}
      >
        {/* Hero Section with background emoji watermark */}
        <LinearGradient
          colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.heroTeal) as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: "hidden" }}
        >
          {/* Banner image or emoji watermark */}
          {group.bannerImageUrl ? (
            <>
              <Image
                source={{ uri: group.bannerImageUrl }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                contentFit="cover"
              />
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }} />
            </>
          ) : (
            <View
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                opacity: 0.08,
              }}
              pointerEvents="none"
            >
              <Text style={{ fontSize: 180, lineHeight: 200 }}>
                {group.emoji || group.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Navigation bar */}
          <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
            <Pressable
              onPress={goBack}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <ArrowLeft size={22} color={palette.white} strokeWidth={2.5} />
            </Pressable>
            <View className="flex-row items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onPress={() => router.push({ pathname: "/group-settings", params: { groupId: id } })}
                accessibilityLabel="Group settings"
              >
                <Settings size={22} color="rgba(255,255,255,0.8)" />
              </Button>
            </View>
          </View>

          {/* Group identity */}
          <View className="px-5 pt-2 pb-1">
            <View className="flex-row items-center gap-2.5 mb-1">
              {group.emoji ? (
                <Text style={{ fontSize: fs["4xl"] }}>{group.emoji}</Text>
              ) : null}
              <Text
                className="text-2xl font-sans-bold"
                style={{ color: palette.white }}
                numberOfLines={1}
              >
                {group.name}
              </Text>
            </View>
          </View>

          {/* Avatar strip */}
          <View className="px-5 pb-4">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.push({ pathname: "/group-settings", params: { groupId: id } })}
                className="flex-row items-center"
              >
                <AvatarStrip members={members} maxVisible={6} />
              </Pressable>
              {!isArchived && (
                <Pressable
                  onPress={() => {
                    hapticLight();
                    router.push({ pathname: "/group-settings", params: { groupId: id, autoAddMember: "true" } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add member"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.lg,
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.4)",
                    borderStyle: "dashed",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    marginLeft: -4,
                  }}
                >
                  <UserPlus size={14} color="rgba(255,255,255,0.8)" />
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push({ pathname: "/group-settings", params: { groupId: id } })}
              >
                <Text
                  className="text-xs font-sans"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {members.length} {members.length === 1 ? "member" : "members"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Balance display */}
          <View className="px-5 pb-5">
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: radius.lg,
                padding: 16,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text
                    className="text-xs font-sans"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Your Balance
                  </Text>
                  <Text
                    selectable
                    className="text-2xl font-sans-bold mt-0.5"
                    style={{
                      color: palette.white,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {myMemberBalance > 0 ? "+" : ""}{formatCents(myMemberBalance, group?.defaultCurrency)}
                  </Text>
                  <Text
                    className="text-xs font-sans mt-0.5"
                    style={{
                      color: myMemberBalance > 0
                        ? "#86efac"
                        : myMemberBalance < 0
                        ? "#fca5a5"
                        : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {myMemberBalance > 0
                      ? "you are owed"
                      : myMemberBalance < 0
                      ? "you owe"
                      : "all settled up"}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-xs font-sans"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Total Spent
                  </Text>
                  <Text
                    selectable
                    className="text-lg font-sans-semibold mt-0.5"
                    style={{
                      color: palette.white,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatCents(totalSpent, group?.defaultCurrency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5">
        {/* Archived banner */}
        {isArchived && (
          <Card className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <Text className="text-sm font-sans-semibold text-amber-800 dark:text-amber-200">
              This group is archived
            </Text>
            <Text className="text-xs text-amber-600 dark:text-amber-400 font-sans mt-1">
              No new expenses or settlements can be added. You can still view history and balances.
            </Text>
          </Card>
        )}

        {/* Action Row */}
        {!isArchived && (
          <View className="flex-row gap-3 mt-4 mb-4">
            <Pressable
              onPress={() => router.push({ pathname: "/(tabs)/add", params: { returnGroupId: id } })}
              className="flex-1"
            >
              <Card className="p-3 flex-row items-center justify-center gap-2 bg-primary/10 border-primary/20">
                <Plus size={18} color={c.primary} />
                <Text className="text-sm font-sans-semibold text-primary">Add Expense</Text>
              </Card>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: "/settle-up", params: { groupId: id } })}
              className="flex-1"
            >
              <Card className="p-3 flex-row items-center justify-center gap-2 bg-success/10 border-success/20">
                <HandCoins size={18} color={c.success} />
                <Text className="text-sm font-sans-semibold text-success">Settle Up</Text>
              </Card>
            </Pressable>
          </View>
        )}

        {/* RECENT EXPENSES */}
        {expenses.length === 0 && activityItems.length === 0 ? (
          <EmptyState
            icon={Receipt}
            iconColor={c.primary}
            title={isArchived ? "No activity" : "No activity yet"}
            subtitle={isArchived ? "This archived group has no history" : "Add your first expense to start tracking"}
            actionLabel={isArchived ? undefined : "Add Expense"}
            onAction={isArchived ? undefined : () => router.push({ pathname: "/(tabs)/add", params: { returnGroupId: id } })}
          />
        ) : (
          <>
            {/* Expenses section */}
            {displayExpenses.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    RECENT EXPENSES
                  </Text>
                  {(hasHiddenExpenses || hasMoreExpenses) && (
                    <Pressable onPress={handleSeeAll}>
                      <Text className="text-xs font-sans-semibold text-primary">See All</Text>
                    </Pressable>
                  )}
                </View>
                <View className="gap-2">
                  {displayExpenses.map((expense, idx) => {
                    const resolvedCategory = expense.category?.id
                      ? (categoryMap[expense.category.id] ?? expense.category)
                      : expense.category;
                    const categoryIconName = resolvedCategory?.icon ?? resolvedCategory?.name;
                    const display = computeExpenseCardDisplay(
                      expense, currentBackendUserId, members, expense.createdBy,
                      (cents) => formatCents(cents, expense.currency ?? group?.defaultCurrency),
                    );
                    const amountDisplay = getFxDisplayAmounts({
                      amountCents: expense.amountCents ?? 0,
                      currency: expense.currency ?? group?.defaultCurrency,
                      convertedAmount: expense.convertedAmount,
                      convertedAmountCents: expense.convertedAmountCents,
                      convertedCurrency: expense.convertedCurrency,
                    });
                    const expenseDate = expense.date || expense.createdAt;

                    return (
                      <Animated.View
                        key={`expense-${expense.id}`}
                        entering={FadeInDown.delay(Math.min(idx, 10) * 50).duration(300).springify()}
                      >
                        <SwipeableRow
                          onEdit={isArchived ? undefined : () => {
                            hapticLight();
                            router.push({
                              pathname: "/edit-expense/[id]",
                              params: { id: expense.id, groupId: id },
                            });
                          }}
                          onDelete={isArchived ? undefined : () => {
                            hapticWarning();
                            handleDeleteExpenseWithUndo(expense);
                          }}
                        >
                          <Pressable
                            onPress={isArchived ? undefined : () => {
                              hapticLight();
                              router.push({
                                pathname: "/edit-expense/[id]",
                                params: { id: expense.id, groupId: id },
                              });
                            }}
                          >
                            <Card className="p-4">
                              <View className="flex-row items-center gap-3">
                                <CategoryIcon iconName={categoryIconName} />
                                <View className="flex-1">
                                  <Text className="text-sm font-sans-semibold text-card-foreground">
                                    {expense.description}
                                  </Text>
                                  <Text className="text-xs text-muted-foreground font-sans">
                                    {display.subtitle}
                                    {expenseDate ? ` \u00B7 ${formatDate(expenseDate)}` : ""}
                                  </Text>
                                  {amountDisplay.secondary ? (
                                    <Text className="text-[11px] text-muted-foreground font-sans mt-0.5">
                                      {amountDisplay.secondary}
                                    </Text>
                                  ) : null}
                                </View>
                                <View className="items-end">
                                  <Text className="text-[10px] text-muted-foreground font-sans">
                                    {display.rightLabel}
                                  </Text>
                                  {display.rightAmountCents != null ? (
                                    <Text
                                      selectable
                                      className={`text-sm font-sans-bold ${
                                        display.rightColor === "success"
                                          ? "text-success"
                                          : display.rightColor === "destructive"
                                            ? "text-destructive"
                                            : "text-muted-foreground"
                                      }`}
                                      style={{ fontVariant: ["tabular-nums"] }}
                                    >
                                      {formatCents(display.rightAmountCents, expense.currency ?? group?.defaultCurrency)}
                                    </Text>
                                  ) : (
                                    <Text className="text-xs text-muted-foreground font-sans">—</Text>
                                  )}
                                </View>
                              </View>
                            </Card>
                          </Pressable>
                        </SwipeableRow>
                      </Animated.View>
                    );
                  })}

                  {/* Load More (only when showing all and there are more from backend) */}
                  {showAllExpenses && hasMoreExpenses && (
                    <Pressable
                      onPress={loadMoreExpenses}
                      disabled={loadingMoreExpenses}
                      className="py-3 items-center"
                    >
                      {loadingMoreExpenses ? (
                        <ActivityIndicator size="small" color={c.primary} />
                      ) : (
                        <Text className="text-sm font-sans-semibold text-primary">
                          Load more
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Recent Activity (settlements, member joins) */}
            {recentActivity.length > 0 && (
              <View>
                <Text className="text-sm font-sans-semibold text-muted-foreground mb-3">
                  RECENT ACTIVITY
                </Text>
                <View className="gap-2">
                  {recentActivity.map((actItem, idx) => {
                    const actItemWithGroup = actItem.groupName ? actItem : { ...actItem, groupName: group?.name };
                    const title = formatActivityTitle(actItemWithGroup, currentBackendUserId);
                    const displayAmount = (actItem.details?.amount ?? actItem.details?.amountCents) as number | undefined;
                    const isSettlement = actItem.activityType.startsWith("settlement_");
                    const actIconConfig = getActivityIcon(
                      actItem.activityType,
                      (actItem.details?.categoryName ?? actItem.details?.category) as string | undefined,
                      (actItem.details?.newDescription ?? actItem.details?.description) as string | undefined,
                      group?.defaultCurrency,
                    );

                    return (
                      <Animated.View
                        key={`activity-${actItem.id}`}
                        entering={FadeInDown.delay(Math.min(idx, 10) * 50).duration(300).springify()}
                      >
                        <Pressable
                          onPress={isSettlement ? () => {
                            hapticLight();
                            router.push({ pathname: "/settle-up", params: { groupId: id } });
                          } : undefined}
                          disabled={!isSettlement}
                        >
                          <Card className="p-4">
                            <View className="flex-row items-center gap-3">
                              <CategoryIcon config={actIconConfig} />
                              <View className="flex-1">
                                <Text className="text-sm font-sans-semibold text-card-foreground">
                                  {title}
                                </Text>
                                <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                                  {formatRelativeTime(actItem.createdAt)}
                                </Text>
                              </View>
                              {displayAmount != null && (
                                <Text className="text-sm font-sans-semibold text-success">
                                  {formatCents(displayAmount, group?.defaultCurrency)}
                                </Text>
                              )}
                            </View>
                          </Card>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
        </View>
      </ScrollView>

      {/* Delete Expense Confirmation */}
      <ConfirmModal
        visible={!!expenseToDelete}
        title="Delete Expense"
        message={`Delete "${expenseToDelete?.description ?? "this expense"}"? This will update all balances.`}
        confirmLabel={deletingExpense ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />
    </SafeAreaView>
  );
}
