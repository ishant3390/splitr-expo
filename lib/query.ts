/**
 * React Query configuration and custom hooks for Splitr.
 *
 * FINANCIAL APP SAFETY RULES:
 * - Balance & settlement data: staleTime=0 (always refetch, never trust stale cache)
 * - Expenses: staleTime=10s (brief cache, refetch on focus)
 * - Groups/members: staleTime=30s
 * - Categories: staleTime=5min (static reference data)
 * - User profile: staleTime=2min
 * - NO optimistic updates for money-related mutations
 * - Mutations MUST invalidate all affected queries on success
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once on failure (don't hammer a failing server)
      retry: 1,
      // Default stale time — overridden per-query for financial data
      staleTime: 30_000,
      // Keep garbage-collected data for 5 minutes (for back-navigation cache)
      gcTime: 5 * 60_000,
      // Don't refetch on reconnect automatically — let useFocusEffect handle it
      refetchOnReconnect: false,
      // Don't refetch on window focus — RN doesn't have window focus,
      // we use useFocusEffect for screen-level refetch
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Don't retry mutations — user should explicitly retry failed writes
      retry: 0,
    },
  },
});

// ---- Query Keys ----
// Centralized to ensure consistent invalidation

export const queryKeys = {
  // User
  user: ["user"] as const,
  userBalance: ["user", "balance"] as const,
  userActivity: ["user", "activity"] as const,

  // Groups
  groups: (status?: string) => ["groups", status ?? "active"] as const,
  group: (groupId: string) => ["groups", groupId] as const,
  groupMembers: (groupId: string) => ["groups", groupId, "members"] as const,
  groupExpenses: (groupId: string) => ["groups", groupId, "expenses"] as const,

  // Categories (static)
  categories: ["categories"] as const,

  // Settlements
  settlementSuggestions: (groupId: string) => ["settlements", groupId, "suggestions"] as const,
  settlementHistory: (groupId: string) => ["settlements", groupId, "history"] as const,

  // Contacts
  contacts: ["contacts"] as const,

  // Invite preview (public, no auth)
  invitePreview: (code: string) => ["invite", code] as const,
} as const;

// ---- Stale Times ----

export const staleTimes = {
  /** Balance data — NEVER trust stale cache for money */
  balance: 0,
  /** Settlement suggestions — derived from balances, always fresh */
  settlements: 0,
  /** Expenses — brief cache, refetch on focus */
  expenses: 10_000,
  /** Groups and members — moderate cache */
  groups: 30_000,
  members: 30_000,
  /** Activity feed */
  activity: 30_000,
  /** User profile */
  user: 2 * 60_000,
  /** Categories — static reference data */
  categories: 5 * 60_000,
  /** Invite preview — static per code */
  invitePreview: 60_000,
} as const;

// ---- Invalidation Helpers ----
// Call these after mutations to keep cache consistent

/**
 * After creating/updating/deleting an expense:
 * Invalidate the group's expenses, balance, activity, and settlement suggestions.
 */
export function invalidateAfterExpenseChange(groupId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.groupExpenses(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
  queryClient.invalidateQueries({ queryKey: queryKeys.userActivity });
  queryClient.invalidateQueries({ queryKey: queryKeys.settlementSuggestions(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
}

/**
 * After creating/deleting a settlement:
 * Invalidate suggestions, history, balance, and activity.
 */
export function invalidateAfterSettlementChange(groupId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.settlementSuggestions(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.settlementHistory(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
  queryClient.invalidateQueries({ queryKey: queryKeys.userActivity });
  queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
}

/**
 * After creating a group or joining a group:
 * Invalidate groups list and balance.
 */
export function invalidateAfterGroupChange() {
  queryClient.invalidateQueries({ queryKey: ["groups"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
}

/**
 * After adding/removing a member:
 * Invalidate that group's members, balance, and contacts.
 */
export function invalidateAfterMemberChange(groupId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
  queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
}

/**
 * After updating user profile:
 * Invalidate user data.
 */
export function invalidateAfterProfileUpdate() {
  queryClient.invalidateQueries({ queryKey: queryKeys.user });
}
