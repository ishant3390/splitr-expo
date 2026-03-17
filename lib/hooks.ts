/**
 * React Query hooks for Splitr.
 *
 * Every hook returns { data, isLoading, error, refetch } from useQuery.
 * Screens wire these into their UI — no more manual useState + useEffect + loadData.
 *
 * FINANCIAL SAFETY: Balance and settlement queries use staleTime: 0
 * so they ALWAYS refetch. We never show stale money data as if it were fresh.
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usersApi,
  groupsApi,
  categoriesApi,
  settlementsApi,
  inviteApi,
  contactsApi,
  expensesApi,
} from "./api";
import { queryKeys, staleTimes, invalidateAfterExpenseChange, invalidateAfterSettlementChange, invalidateAfterGroupChange, invalidateAfterMemberChange, invalidateAfterProfileUpdate } from "./query";
import { dedupeMembers, computeBalancesFromMembers } from "./screen-helpers";
import { membersToContacts, dedupeContacts, mergeWithRecency } from "./mention-utils";
import { getRecentMentions, type RecentMention } from "./mention-recency";
import type {
  UserDto,
  UserBalanceDto,
  UserBalanceRawDto,
  CurrencyAmount,
  GroupDto,
  GroupMemberDto,
  ActivityLogDto,
  CategoryDto,
  ExpenseDto,
  SettlementSuggestionDto,
  SettlementDto,
  GroupInvitePreviewDto,
  ContactDto,
  NotificationDto,
  CreateGroupRequest,
  CreateExpenseRequest,
  UpdateUserRequest,
  CrossGroupSuggestion,
} from "./types";

// ---- Helper: get token or throw ----

function useTokenFetcher() {
  const { getToken } = useAuth();
  return useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [getToken]);
}

// ---- User Queries ----

export function useUserProfile() {
  const fetchToken = useTokenFetcher();
  return useQuery<UserDto>({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const token = await fetchToken();
      return usersApi.me(token);
    },
    staleTime: staleTimes.user,
  });
}

export function useUserBalance() {
  const fetchToken = useTokenFetcher();
  const { user } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress;

  return useQuery<UserBalanceDto>({
    queryKey: queryKeys.userBalance,
    queryFn: async () => {
      const token = await fetchToken();
      try {
        // Try aggregate endpoint first
        const raw = await usersApi.balance(token);
        // Normalize multi-currency arrays to single totals (sum all currencies)
        const sumAmounts = (arr?: CurrencyAmount[]) =>
          (arr ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
        return {
          totalOwedCents: sumAmounts(raw.totalOwed),
          totalOwesCents: sumAmounts(raw.totalOwing),
          netBalanceCents: sumAmounts(raw.totalOwed) - sumAmounts(raw.totalOwing),
          totalOwedByCurrency: raw.totalOwed ?? [],
          totalOwingByCurrency: raw.totalOwing ?? [],
          groupBalances: raw.groupBalances,
        };
      } catch {
        // Fallback: N+1
        const groups = await groupsApi.list(token);
        const groupList = Array.isArray(groups) ? groups : [];
        const memberResults = await Promise.all(
          groupList.map((g) => groupsApi.listMembers(g.id, token))
        );
        const { owed, owes } = computeBalancesFromMembers(memberResults, currentEmail ?? "");
        return {
          totalOwedCents: owed,
          totalOwesCents: owes,
          netBalanceCents: owed - owes,
          totalOwedByCurrency: [],
          totalOwingByCurrency: [],
        };
      }
    },
    staleTime: staleTimes.balance, // 0 — always refetch for money data
  });
}

const PAGE_SIZE = 20;

export function useUserActivity() {
  const fetchToken = useTokenFetcher();
  const query = useInfiniteQuery<ActivityLogDto[], Error>({
    queryKey: queryKeys.userActivity,
    queryFn: async ({ pageParam }) => {
      const token = await fetchToken();
      const data = await usersApi.activity(token, { page: pageParam as number, limit: PAGE_SIZE });
      return Array.isArray(data) ? data : [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length >= PAGE_SIZE ? allPages.length : undefined,
    initialPageParam: 0,
    staleTime: staleTimes.activity,
  });

  // Flatten pages, deduplicate, and filter out redundant activities
  const data = useMemo(() => {
    const flat = query.data?.pages.flat() ?? [];
    const seen = new Set<string>();
    const deduped = flat.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Build a set of (actorUserId, groupId) pairs from group_created activities.
    // A member_joined by the same actor in the same group is redundant — the creator
    // is implicitly a member.
    const creatorKeys = new Set<string>();
    for (const item of deduped) {
      if (item.activityType === "group_created" && item.actorUserId && item.groupId) {
        creatorKeys.add(`${item.actorUserId}:${item.groupId}`);
      }
    }

    return deduped.filter((item) => {
      if (
        item.activityType === "member_joined" &&
        item.actorUserId &&
        item.groupId &&
        creatorKeys.has(`${item.actorUserId}:${item.groupId}`)
      ) {
        return false;
      }
      return true;
    });
  }, [query.data?.pages]);

  return {
    ...query,
    data,
  };
}

export function useNotifications() {
  const fetchToken = useTokenFetcher();
  const query = useInfiniteQuery<NotificationDto[], Error>({
    queryKey: queryKeys.notifications,
    queryFn: async ({ pageParam }) => {
      const token = await fetchToken();
      return usersApi.notifications(token, { page: pageParam as number, limit: PAGE_SIZE });
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length >= PAGE_SIZE ? allPages.length : undefined,
    initialPageParam: 0,
    staleTime: staleTimes.notifications,
  });

  return {
    ...query,
    data: query.data?.pages.flat() ?? [],
  };
}

// ---- Group Queries ----

export function useGroups(status: string = "active") {
  const fetchToken = useTokenFetcher();
  return useQuery<GroupDto[]>({
    queryKey: queryKeys.groups(status),
    queryFn: async () => {
      const token = await fetchToken();
      const data = await groupsApi.list(token, status);
      return Array.isArray(data) ? data : [];
    },
    staleTime: staleTimes.groups,
  });
}

export function useGroup(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useQuery<GroupDto>({
    queryKey: queryKeys.group(groupId),
    queryFn: async () => {
      const token = await fetchToken();
      return groupsApi.get(groupId, token);
    },
    staleTime: staleTimes.groups,
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useQuery<GroupMemberDto[]>({
    queryKey: queryKeys.groupMembers(groupId),
    queryFn: async () => {
      const token = await fetchToken();
      const data = await groupsApi.listMembers(groupId, token);
      return dedupeMembers(Array.isArray(data) ? data : []);
    },
    staleTime: staleTimes.members,
    enabled: !!groupId,
  });
}

export function useGroupExpenses(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useQuery<ExpenseDto[]>({
    queryKey: queryKeys.groupExpenses(groupId),
    queryFn: async () => {
      const token = await fetchToken();
      const response = await groupsApi.listExpenses(groupId, token);
      return response.data ?? [];
    },
    staleTime: staleTimes.expenses,
    enabled: !!groupId,
  });
}

// ---- Categories ----

export function useCategories() {
  const fetchToken = useTokenFetcher();
  return useQuery<CategoryDto[]>({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const token = await fetchToken();
      const data = await categoriesApi.list(token);
      return Array.isArray(data) ? data : [];
    },
    staleTime: staleTimes.categories,
  });
}

// ---- Settlements ----

export function useSettlementSuggestions(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useQuery<SettlementSuggestionDto[]>({
    queryKey: queryKeys.settlementSuggestions(groupId),
    queryFn: async () => {
      const token = await fetchToken();
      const data = await settlementsApi.suggestions(groupId, token);
      return Array.isArray(data) ? data : [];
    },
    staleTime: staleTimes.settlements, // 0 — always refetch
    enabled: !!groupId,
  });
}

export function useSettlementHistory(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useQuery<SettlementDto[]>({
    queryKey: queryKeys.settlementHistory(groupId),
    queryFn: async () => {
      const token = await fetchToken();
      const data = await settlementsApi.list(groupId, token);
      return Array.isArray(data) ? data : [];
    },
    staleTime: staleTimes.settlements, // 0 — always refetch
    enabled: !!groupId,
  });
}

// ---- Cross-Group Settlements ----

export function useCrossGroupSuggestions() {
  const fetchToken = useTokenFetcher();
  const { data: balanceData, isLoading: balanceLoading } = useUserBalance();

  const groupsWithBalance = useMemo(() => {
    return (balanceData?.groupBalances ?? []).filter((g) => g.balanceCents !== 0);
  }, [balanceData?.groupBalances]);

  const suggestionQueries = useQueries({
    queries: groupsWithBalance.map((g) => ({
      queryKey: queryKeys.settlementSuggestions(g.groupId),
      queryFn: async () => {
        const token = await fetchToken();
        const data = await settlementsApi.suggestions(g.groupId, token);
        return {
          groupId: g.groupId,
          groupName: g.groupName,
          suggestions: Array.isArray(data) ? data : [],
        } as CrossGroupSuggestion;
      },
      staleTime: staleTimes.settlements, // 0 — always refetch
    })),
  });

  const data = useMemo(() => {
    return suggestionQueries
      .map((q) => q.data)
      .filter((d): d is CrossGroupSuggestion => !!d && (d.suggestions?.length ?? 0) > 0);
  }, [suggestionQueries]);

  const isLoading = balanceLoading || suggestionQueries.some((q) => q.isLoading);

  const refetch = useCallback(() => {
    suggestionQueries.forEach((q) => q.refetch());
  }, [suggestionQueries]);

  const errors = suggestionQueries
    .map((q, i) => (q.error ? { groupId: groupsWithBalance[i]?.groupId, error: q.error } : null))
    .filter(Boolean);

  return { data, isLoading, refetch, errors };
}

// ---- Contacts ----

export function useContacts() {
  const fetchToken = useTokenFetcher();
  return useQuery<ContactDto[]>({
    queryKey: queryKeys.contacts,
    queryFn: async () => {
      const token = await fetchToken();
      return contactsApi.list(token);
    },
    staleTime: staleTimes.groups,
  });
}

// ---- Merged Contacts (contacts API + group member fallback + recency) ----

export function useMergedContacts() {
  const { data: apiContacts, isLoading: contactsLoading } = useContacts();
  const { data: groups } = useGroups();
  const { user } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const fetchToken = useTokenFetcher();
  const [recents, setRecents] = useState<RecentMention[]>([]);

  useEffect(() => {
    getRecentMentions().then(setRecents);
  }, []);

  // Only fetch group members when contacts API returned empty
  const needsFallback = !contactsLoading && (!apiContacts || apiContacts.length === 0);

  const memberQueries = useQueries({
    queries: (groups ?? []).map((g) => ({
      queryKey: queryKeys.groupMembers(g.id),
      queryFn: async () => {
        const token = await fetchToken();
        const data = await groupsApi.listMembers(g.id, token);
        return dedupeMembers(Array.isArray(data) ? data : []);
      },
      staleTime: staleTimes.members,
      enabled: needsFallback,
    })),
  });

  // Extract stable data arrays from memberQueries so useMemo doesn't recompute
  // on every render due to useQueries returning a new array reference.
  const memberData = memberQueries.map((q) => q.data);

  const contacts = useMemo(() => {
    let base: ContactDto[];
    if (apiContacts?.length) {
      base = apiContacts;
    } else {
      const allMembers = memberData.flatMap((d) => d ?? []);
      base = dedupeContacts(membersToContacts(allMembers));
    }
    // Exclude current user
    if (currentEmail) {
      base = base.filter(
        (c) => c.email?.toLowerCase() !== currentEmail.toLowerCase()
      );
    }
    return mergeWithRecency(base, recents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiContacts, ...memberData, recents, currentEmail]);

  const isLoading =
    contactsLoading || (needsFallback && memberQueries.some((q) => q.isLoading));

  const refreshRecents = useCallback(() => {
    getRecentMentions().then(setRecents);
  }, []);

  return { data: contacts, isLoading, refreshRecents };
}

// ---- Invite Preview (public, no auth) ----

export function useInvitePreview(code: string) {
  return useQuery<GroupInvitePreviewDto>({
    queryKey: queryKeys.invitePreview(code),
    queryFn: () => inviteApi.preview(code),
    staleTime: staleTimes.invitePreview,
    enabled: !!code,
  });
}

// ---- Mutations ----

export function useCreateExpense(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (data: CreateExpenseRequest) => {
      const token = await fetchToken();
      return groupsApi.createExpense(groupId, data, token);
    },
    onSuccess: () => invalidateAfterExpenseChange(groupId),
  });
}

export function useUpdateExpense() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async ({ expenseId, data, groupId }: { expenseId: string; data: any; groupId: string }) => {
      const token = await fetchToken();
      const result = await expensesApi.update(expenseId, data, token);
      invalidateAfterExpenseChange(groupId);
      return result;
    },
  });
}

export function useDeleteExpense() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async ({ expenseId, groupId }: { expenseId: string; groupId: string }) => {
      const token = await fetchToken();
      await expensesApi.delete(expenseId, token);
      invalidateAfterExpenseChange(groupId);
    },
  });
}

export function useCreateGroup() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (data: CreateGroupRequest) => {
      const token = await fetchToken();
      return groupsApi.create(data, token);
    },
    onSuccess: () => invalidateAfterGroupChange(),
  });
}

export function useArchiveGroup() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async ({ groupId, version, archive }: { groupId: string; version: number; archive: boolean }) => {
      const token = await fetchToken();
      return groupsApi.update(groupId, { isArchived: archive, version } as any, token);
    },
    onSuccess: () => invalidateAfterGroupChange(),
  });
}

export function useDeleteGroup() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const token = await fetchToken();
      await groupsApi.delete(groupId, token);
    },
    onSuccess: () => invalidateAfterGroupChange(),
  });
}

export function useCreateSettlement(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (data: any) => {
      const token = await fetchToken();
      return settlementsApi.create(groupId, data, token);
    },
    onSuccess: () => invalidateAfterSettlementChange(groupId),
  });
}

export function useDeleteSettlement(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (settlementId: string) => {
      const token = await fetchToken();
      await settlementsApi.delete(settlementId, token);
    },
    onSuccess: () => invalidateAfterSettlementChange(groupId),
  });
}

export function useAddMember(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (payload: { name: string } | { email: string }) => {
      const token = await fetchToken();
      if ("email" in payload) {
        return groupsApi.addMember(groupId, payload, token);
      }
      return groupsApi.addGuestMember(groupId, payload, token);
    },
    onSuccess: () => invalidateAfterMemberChange(groupId),
  });
}

export function useRemoveMember(groupId: string) {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const token = await fetchToken();
      await groupsApi.removeMember(groupId, memberId, token);
    },
    onSuccess: () => invalidateAfterMemberChange(groupId),
  });
}

export function useUpdateProfile() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (data: UpdateUserRequest) => {
      const token = await fetchToken();
      return usersApi.updateMe(data, token);
    },
    onSuccess: () => invalidateAfterProfileUpdate(),
  });
}

export function useJoinGroup() {
  const fetchToken = useTokenFetcher();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const token = await fetchToken();
      return inviteApi.join({ inviteCode }, token);
    },
    onSuccess: () => invalidateAfterGroupChange(),
  });
}

// ---- Top Debtor (for nudge reminder on Home screen) ----

/**
 * Finds the top person who owes the current user money.
 * Picks the group with the highest positive balance, fetches settlement
 * suggestions, and returns the suggestion where toUser matches current user.
 */
export function useTopDebtor(balanceData?: UserBalanceDto) {
  const { user } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";

  // Find group where user is owed the most
  const topGroup = useMemo(() => {
    const groups = balanceData?.groupBalances ?? [];
    const positive = groups.filter((g) => g.balanceCents > 0);
    if (positive.length === 0) return null;
    return positive.reduce((best, g) => (g.balanceCents > best.balanceCents ? g : best));
  }, [balanceData?.groupBalances]);

  const { data: suggestions } = useSettlementSuggestions(topGroup?.groupId ?? "");

  // Find the suggestion where someone owes the current user
  const topDebtor = useMemo(() => {
    if (!suggestions || !Array.isArray(suggestions) || !currentEmail) return null;
    // Find suggestions where the current user is the payee (toUser)
    const owedToMe = suggestions.filter(
      (s) => s.toUser?.email?.toLowerCase() === currentEmail
    );
    if (owedToMe.length === 0) return null;
    // Sort by amount descending and pick top
    const sorted = [...owedToMe].sort((a, b) => b.amount - a.amount);
    return {
      suggestion: sorted[0],
      othersCount: sorted.length - 1,
      groupId: topGroup!.groupId,
      groupName: topGroup!.groupName,
    };
  }, [suggestions, currentEmail, topGroup]);

  return topDebtor;
}

/** Map of groupId → defaultCurrency for resolving per-item currency on cross-group screens. */
export function useGroupCurrencyMap() {
  const { data: groups = [] } = useGroups();
  return useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.defaultCurrency ?? "USD"));
    return map;
  }, [groups]);
}

export function useRegenerateInvite(groupId: string) {
  const fetchToken = useTokenFetcher();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await fetchToken();
      return inviteApi.regenerate(groupId, token);
    },
    onSuccess: (data) => {
      // Update group cache with new invite code
      qc.setQueryData<GroupDto>(queryKeys.group(groupId), (old) =>
        old ? { ...old, inviteCode: data.inviteCode } : old
      );
    },
  });
}
