/**
 * React Query hooks for Splitr.
 *
 * Every hook returns { data, isLoading, error, refetch } from useQuery.
 * Screens wire these into their UI — no more manual useState + useEffect + loadData.
 *
 * FINANCIAL SAFETY: Balance and settlement queries use staleTime: 0
 * so they ALWAYS refetch. We never show stale money data as if it were fresh.
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useCallback } from "react";
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
  CreateGroupRequest,
  CreateExpenseRequest,
  UpdateUserRequest,
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

  return {
    ...query,
    // Flatten pages into a single array for easy consumption
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
