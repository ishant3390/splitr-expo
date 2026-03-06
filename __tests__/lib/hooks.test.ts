/**
 * Tests for lib/hooks.ts — React Query hooks for Splitr.
 *
 * Strategy: We use renderHook from @testing-library/react-native to call hooks
 * in a valid React context. Since useQuery/useMutation are mocked globally,
 * we extract the config passed to them and test queryFn/mutationFn logic.
 */

import { renderHook } from "@testing-library/react-native";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, staleTimes } from "@/lib/query";

// Mock API modules
jest.mock("@/lib/api", () => ({
  usersApi: {
    me: jest.fn(),
    balance: jest.fn(),
    activity: jest.fn(),
    updateMe: jest.fn(),
  },
  groupsApi: {
    list: jest.fn(),
    get: jest.fn(),
    listMembers: jest.fn(),
    listExpenses: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createExpense: jest.fn(),
    addMember: jest.fn(),
    addGuestMember: jest.fn(),
    removeMember: jest.fn(),
  },
  categoriesApi: { list: jest.fn() },
  settlementsApi: {
    suggestions: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  inviteApi: {
    preview: jest.fn(),
    join: jest.fn(),
    regenerate: jest.fn(),
  },
  contactsApi: { list: jest.fn() },
  expensesApi: { update: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/query", () => ({
  queryKeys: {
    user: ["user"],
    userBalance: ["user", "balance"],
    userActivity: ["user", "activity"],
    groups: (status?: string) => ["groups", status ?? "active"],
    group: (id: string) => ["groups", id],
    groupMembers: (id: string) => ["groups", id, "members"],
    groupExpenses: (id: string) => ["groups", id, "expenses"],
    categories: ["categories"],
    settlementSuggestions: (id: string) => ["settlements", id, "suggestions"],
    settlementHistory: (id: string) => ["settlements", id, "history"],
    contacts: ["contacts"],
    invitePreview: (code: string) => ["invite", code],
  },
  staleTimes: {
    balance: 0,
    settlements: 0,
    expenses: 10_000,
    groups: 30_000,
    members: 30_000,
    activity: 30_000,
    user: 120_000,
    categories: 300_000,
    invitePreview: 60_000,
  },
  invalidateAfterExpenseChange: jest.fn(),
  invalidateAfterSettlementChange: jest.fn(),
  invalidateAfterGroupChange: jest.fn(),
  invalidateAfterMemberChange: jest.fn(),
  invalidateAfterProfileUpdate: jest.fn(),
}));

jest.mock("@/lib/screen-helpers", () => ({
  dedupeMembers: jest.fn((arr: any[]) => arr),
  computeBalancesFromMembers: jest.fn(() => ({ owed: 100, owes: 50 })),
}));

import {
  usersApi,
  groupsApi,
  categoriesApi,
  settlementsApi,
  inviteApi,
  contactsApi,
  expensesApi,
} from "@/lib/api";
import { dedupeMembers, computeBalancesFromMembers } from "@/lib/screen-helpers";
import {
  invalidateAfterExpenseChange,
  invalidateAfterSettlementChange,
  invalidateAfterGroupChange,
  invalidateAfterMemberChange,
  invalidateAfterProfileUpdate,
} from "@/lib/query";

import {
  useUserProfile,
  useUserBalance,
  useUserActivity,
  useGroups,
  useGroup,
  useGroupMembers,
  useGroupExpenses,
  useCategories,
  useSettlementSuggestions,
  useSettlementHistory,
  useContacts,
  useInvitePreview,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreateGroup,
  useArchiveGroup,
  useDeleteGroup,
  useCreateSettlement,
  useDeleteSettlement,
  useAddMember,
  useRemoveMember,
  useUpdateProfile,
  useJoinGroup,
  useRegenerateInvite,
} from "@/lib/hooks";

const mockUseQuery = useQuery as jest.Mock;
const mockUseInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseQueryClient = useQueryClient as jest.Mock;

/** Helper: render a hook and return the config passed to useQuery */
function renderQueryHook(hookFn: () => any) {
  renderHook(hookFn);
  return mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
}

/** Helper: render a hook and return the config passed to useInfiniteQuery */
function renderInfiniteQueryHook(hookFn: () => any) {
  renderHook(hookFn);
  return mockUseInfiniteQuery.mock.calls[mockUseInfiniteQuery.mock.calls.length - 1][0];
}

/** Helper: render a hook and return the config passed to useMutation */
function renderMutationHook(hookFn: () => any) {
  renderHook(hookFn);
  return mockUseMutation.mock.calls[mockUseMutation.mock.calls.length - 1][0];
}

describe("hooks.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: jest.fn() });
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [], pageParams: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockUseQueryClient.mockReturnValue({ setQueryData: jest.fn(), invalidateQueries: jest.fn() });
  });

  // ---- Query hooks ----

  describe("useUserProfile", () => {
    it("calls useQuery with user queryKey and staleTime", () => {
      const config = renderQueryHook(() => useUserProfile());
      expect(config.queryKey).toEqual(queryKeys.user);
      expect(config.staleTime).toBe(staleTimes.user);
    });

    it("queryFn fetches token and calls usersApi.me", async () => {
      const config = renderQueryHook(() => useUserProfile());
      const mockUser = { id: "u1", name: "Test" };
      (usersApi.me as jest.Mock).mockResolvedValue(mockUser);

      const result = await config.queryFn();
      expect(usersApi.me).toHaveBeenCalledWith("mock-token");
      expect(result).toEqual(mockUser);
    });
  });

  describe("useUserBalance", () => {
    it("calls useQuery with balance queryKey and staleTime 0", () => {
      const config = renderQueryHook(() => useUserBalance());
      expect(config.queryKey).toEqual(queryKeys.userBalance);
      expect(config.staleTime).toBe(0);
    });

    it("queryFn normalizes multi-currency balance from aggregate endpoint", async () => {
      const config = renderQueryHook(() => useUserBalance());

      (usersApi.balance as jest.Mock).mockResolvedValue({
        totalOwed: [
          { currency: "USD", amount: 1000 },
          { currency: "EUR", amount: 500 },
        ],
        totalOwing: [
          { currency: "USD", amount: 300 },
        ],
        groupBalances: [],
      });

      const result = await config.queryFn();
      expect(result).toEqual({
        totalOwedCents: 1500,
        totalOwesCents: 300,
        netBalanceCents: 1200,
        groupBalances: [],
      });
    });

    it("queryFn handles empty totalOwed/totalOwing arrays", async () => {
      const config = renderQueryHook(() => useUserBalance());

      (usersApi.balance as jest.Mock).mockResolvedValue({
        totalOwed: [],
        totalOwing: [],
        groupBalances: [],
      });

      const result = await config.queryFn();
      expect(result).toEqual({
        totalOwedCents: 0,
        totalOwesCents: 0,
        netBalanceCents: 0,
        groupBalances: [],
      });
    });

    it("queryFn handles undefined totalOwed/totalOwing", async () => {
      const config = renderQueryHook(() => useUserBalance());

      (usersApi.balance as jest.Mock).mockResolvedValue({
        groupBalances: [],
      });

      const result = await config.queryFn();
      expect(result).toEqual({
        totalOwedCents: 0,
        totalOwesCents: 0,
        netBalanceCents: 0,
        groupBalances: [],
      });
    });

    it("queryFn falls back to N+1 when aggregate endpoint throws", async () => {
      const config = renderQueryHook(() => useUserBalance());

      (usersApi.balance as jest.Mock).mockRejectedValue(new Error("404"));
      (groupsApi.list as jest.Mock).mockResolvedValue([
        { id: "g1" },
        { id: "g2" },
      ]);
      (groupsApi.listMembers as jest.Mock).mockResolvedValue([]);

      const result = await config.queryFn();
      expect(groupsApi.list).toHaveBeenCalled();
      expect(groupsApi.listMembers).toHaveBeenCalledTimes(2);
      expect(computeBalancesFromMembers).toHaveBeenCalled();
      expect(result).toEqual({
        totalOwedCents: 100,
        totalOwesCents: 50,
        netBalanceCents: 50,
      });
    });

    it("queryFn handles non-array groups in fallback", async () => {
      const config = renderQueryHook(() => useUserBalance());

      (usersApi.balance as jest.Mock).mockRejectedValue(new Error("404"));
      (groupsApi.list as jest.Mock).mockResolvedValue(null);

      await config.queryFn();
      expect(groupsApi.listMembers).not.toHaveBeenCalled();
    });

    it("queryFn sums CurrencyAmount amounts correctly with nullish values", async () => {
      const config = renderQueryHook(() => useUserBalance());

      (usersApi.balance as jest.Mock).mockResolvedValue({
        totalOwed: [
          { currency: "USD", amount: 0 },
          { currency: "EUR", amount: undefined },
        ],
        totalOwing: [
          { currency: "USD", amount: null },
        ],
        groupBalances: [],
      });

      const result = await config.queryFn();
      // amount: 0 + (undefined ?? 0) = 0; (null ?? 0) = 0
      expect(result.totalOwedCents).toBe(0);
      expect(result.totalOwesCents).toBe(0);
    });
  });

  describe("useUserActivity", () => {
    it("calls useInfiniteQuery with activity queryKey", () => {
      const config = renderInfiniteQueryHook(() => useUserActivity());
      expect(config.queryKey).toEqual(queryKeys.userActivity);
      expect(config.staleTime).toBe(staleTimes.activity);
      expect(config.initialPageParam).toBe(0);
    });

    it("queryFn fetches activity with page param", async () => {
      const config = renderInfiniteQueryHook(() => useUserActivity());

      const items = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}` }));
      (usersApi.activity as jest.Mock).mockResolvedValue(items);

      const result = await config.queryFn({ pageParam: 0 });
      expect(usersApi.activity).toHaveBeenCalledWith("mock-token", { page: 0, limit: 20 });
      expect(result).toHaveLength(20);
    });

    it("queryFn returns empty array for non-array response", async () => {
      const config = renderInfiniteQueryHook(() => useUserActivity());

      (usersApi.activity as jest.Mock).mockResolvedValue(null);
      const result = await config.queryFn({ pageParam: 0 });
      expect(result).toEqual([]);
    });

    it("getNextPageParam returns next page when full page received", () => {
      const config = renderInfiniteQueryHook(() => useUserActivity());
      const fullPage = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}` }));
      expect(config.getNextPageParam(fullPage, [fullPage])).toBe(1);
    });

    it("getNextPageParam returns undefined when last page is partial", () => {
      const config = renderInfiniteQueryHook(() => useUserActivity());
      const partialPage = [{ id: "a1" }];
      expect(config.getNextPageParam(partialPage, [partialPage])).toBeUndefined();
    });

    it("flattens pages into data array", () => {
      mockUseInfiniteQuery.mockReturnValue({
        data: { pages: [[{ id: "a1" }], [{ id: "a2" }]], pageParams: [0, 1] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });

      const { result } = renderHook(() => useUserActivity());
      expect(result.current.data).toEqual([{ id: "a1" }, { id: "a2" }]);
    });
  });

  describe("useGroups", () => {
    it("calls useQuery with groups queryKey and default status", () => {
      const config = renderQueryHook(() => useGroups());
      expect(config.queryKey).toEqual(queryKeys.groups("active"));
      expect(config.staleTime).toBe(staleTimes.groups);
    });

    it("calls useQuery with custom status", () => {
      const config = renderQueryHook(() => useGroups("archived"));
      expect(config.queryKey).toEqual(queryKeys.groups("archived"));
    });

    it("queryFn returns empty array for non-array response", async () => {
      const config = renderQueryHook(() => useGroups());

      (groupsApi.list as jest.Mock).mockResolvedValue("not-an-array");
      const result = await config.queryFn();
      expect(result).toEqual([]);
    });

    it("queryFn returns groups array as-is", async () => {
      const config = renderQueryHook(() => useGroups());

      const groups = [{ id: "g1", name: "Trip" }];
      (groupsApi.list as jest.Mock).mockResolvedValue(groups);
      const result = await config.queryFn();
      expect(result).toEqual(groups);
    });
  });

  describe("useGroup", () => {
    it("calls useQuery with group queryKey and enabled=true", () => {
      const config = renderQueryHook(() => useGroup("g1"));
      expect(config.queryKey).toEqual(queryKeys.group("g1"));
      expect(config.enabled).toBe(true);
    });

    it("is disabled when groupId is empty", () => {
      const config = renderQueryHook(() => useGroup(""));
      expect(config.enabled).toBe(false);
    });

    it("queryFn calls groupsApi.get with groupId and token", async () => {
      const config = renderQueryHook(() => useGroup("g1"));

      const group = { id: "g1", name: "Trip" };
      (groupsApi.get as jest.Mock).mockResolvedValue(group);
      const result = await config.queryFn();
      expect(groupsApi.get).toHaveBeenCalledWith("g1", "mock-token");
      expect(result).toEqual(group);
    });
  });

  describe("useGroupMembers", () => {
    it("calls useQuery with members queryKey", () => {
      const config = renderQueryHook(() => useGroupMembers("g1"));
      expect(config.queryKey).toEqual(queryKeys.groupMembers("g1"));
      expect(config.staleTime).toBe(staleTimes.members);
      expect(config.enabled).toBe(true);
    });

    it("queryFn deduplicates members", async () => {
      const config = renderQueryHook(() => useGroupMembers("g1"));

      const members = [{ id: "m1" }, { id: "m2" }];
      (groupsApi.listMembers as jest.Mock).mockResolvedValue(members);

      await config.queryFn();
      expect(dedupeMembers).toHaveBeenCalledWith(members);
    });

    it("queryFn handles non-array response", async () => {
      const config = renderQueryHook(() => useGroupMembers("g1"));

      (groupsApi.listMembers as jest.Mock).mockResolvedValue(null);
      await config.queryFn();
      expect(dedupeMembers).toHaveBeenCalledWith([]);
    });

    it("is disabled when groupId is empty", () => {
      const config = renderQueryHook(() => useGroupMembers(""));
      expect(config.enabled).toBe(false);
    });
  });

  describe("useGroupExpenses", () => {
    it("calls useQuery with expenses queryKey", () => {
      const config = renderQueryHook(() => useGroupExpenses("g1"));
      expect(config.queryKey).toEqual(queryKeys.groupExpenses("g1"));
      expect(config.staleTime).toBe(staleTimes.expenses);
      expect(config.enabled).toBe(true);
    });

    it("queryFn extracts data from paginated response", async () => {
      const config = renderQueryHook(() => useGroupExpenses("g1"));

      const expenses = [{ id: "e1" }];
      (groupsApi.listExpenses as jest.Mock).mockResolvedValue({ data: expenses });
      const result = await config.queryFn();
      expect(result).toEqual(expenses);
    });

    it("queryFn returns empty array when data is undefined", async () => {
      const config = renderQueryHook(() => useGroupExpenses("g1"));

      (groupsApi.listExpenses as jest.Mock).mockResolvedValue({});
      const result = await config.queryFn();
      expect(result).toEqual([]);
    });
  });

  describe("useCategories", () => {
    it("calls useQuery with categories queryKey and long staleTime", () => {
      const config = renderQueryHook(() => useCategories());
      expect(config.queryKey).toEqual(queryKeys.categories);
      expect(config.staleTime).toBe(staleTimes.categories);
    });

    it("queryFn returns empty array for non-array response", async () => {
      const config = renderQueryHook(() => useCategories());

      (categoriesApi.list as jest.Mock).mockResolvedValue(null);
      const result = await config.queryFn();
      expect(result).toEqual([]);
    });
  });

  describe("useSettlementSuggestions", () => {
    it("calls useQuery with staleTime 0 (always fresh)", () => {
      const config = renderQueryHook(() => useSettlementSuggestions("g1"));
      expect(config.queryKey).toEqual(queryKeys.settlementSuggestions("g1"));
      expect(config.staleTime).toBe(0);
      expect(config.enabled).toBe(true);
    });

    it("queryFn returns array from API", async () => {
      const config = renderQueryHook(() => useSettlementSuggestions("g1"));

      const suggestions = [{ from: "m1", to: "m2", amount: 100 }];
      (settlementsApi.suggestions as jest.Mock).mockResolvedValue(suggestions);
      const result = await config.queryFn();
      expect(result).toEqual(suggestions);
    });

    it("queryFn returns empty array for non-array", async () => {
      const config = renderQueryHook(() => useSettlementSuggestions("g1"));

      (settlementsApi.suggestions as jest.Mock).mockResolvedValue(null);
      const result = await config.queryFn();
      expect(result).toEqual([]);
    });
  });

  describe("useSettlementHistory", () => {
    it("calls useQuery with settlement history queryKey", () => {
      const config = renderQueryHook(() => useSettlementHistory("g1"));
      expect(config.queryKey).toEqual(queryKeys.settlementHistory("g1"));
      expect(config.staleTime).toBe(0);
      expect(config.enabled).toBe(true);
    });

    it("queryFn returns array from API", async () => {
      const config = renderQueryHook(() => useSettlementHistory("g1"));

      const settlements = [{ id: "s1" }];
      (settlementsApi.list as jest.Mock).mockResolvedValue(settlements);
      const result = await config.queryFn();
      expect(result).toEqual(settlements);
    });
  });

  describe("useContacts", () => {
    it("calls useQuery with contacts queryKey", () => {
      const config = renderQueryHook(() => useContacts());
      expect(config.queryKey).toEqual(queryKeys.contacts);
      expect(config.staleTime).toBe(staleTimes.groups);
    });

    it("queryFn calls contactsApi.list with token", async () => {
      const config = renderQueryHook(() => useContacts());

      const contacts = [{ id: "c1", name: "Alice" }];
      (contactsApi.list as jest.Mock).mockResolvedValue(contacts);
      const result = await config.queryFn();
      expect(contactsApi.list).toHaveBeenCalledWith("mock-token");
      expect(result).toEqual(contacts);
    });
  });

  describe("useInvitePreview", () => {
    it("calls useQuery with invite preview queryKey (no auth)", () => {
      const config = renderQueryHook(() => useInvitePreview("abc123"));
      expect(config.queryKey).toEqual(queryKeys.invitePreview("abc123"));
      expect(config.staleTime).toBe(staleTimes.invitePreview);
      expect(config.enabled).toBe(true);
    });

    it("is disabled when code is empty", () => {
      const config = renderQueryHook(() => useInvitePreview(""));
      expect(config.enabled).toBe(false);
    });

    it("queryFn calls inviteApi.preview directly", async () => {
      const config = renderQueryHook(() => useInvitePreview("abc123"));

      const preview = { groupName: "Trip", memberCount: 3 };
      (inviteApi.preview as jest.Mock).mockResolvedValue(preview);
      const result = await config.queryFn();
      expect(inviteApi.preview).toHaveBeenCalledWith("abc123");
      expect(result).toEqual(preview);
    });
  });

  // ---- Mutation hooks ----

  describe("useCreateExpense", () => {
    it("calls useMutation with mutationFn and onSuccess", () => {
      const config = renderMutationHook(() => useCreateExpense("g1"));
      expect(config.mutationFn).toEqual(expect.any(Function));
      expect(config.onSuccess).toEqual(expect.any(Function));
    });

    it("mutationFn calls groupsApi.createExpense with token", async () => {
      const config = renderMutationHook(() => useCreateExpense("g1"));

      const expenseData = { description: "Dinner", amountCents: 5000 };
      (groupsApi.createExpense as jest.Mock).mockResolvedValue({ id: "e1" });

      await config.mutationFn(expenseData);
      expect(groupsApi.createExpense).toHaveBeenCalledWith("g1", expenseData, "mock-token");
    });

    it("onSuccess invalidates expense-related queries", () => {
      const config = renderMutationHook(() => useCreateExpense("g1"));
      config.onSuccess();
      expect(invalidateAfterExpenseChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useUpdateExpense", () => {
    it("mutationFn calls expensesApi.update and invalidates", async () => {
      const config = renderMutationHook(() => useUpdateExpense());

      (expensesApi.update as jest.Mock).mockResolvedValue({ id: "e1" });

      await config.mutationFn({ expenseId: "e1", data: { description: "Updated" }, groupId: "g1" });
      expect(expensesApi.update).toHaveBeenCalledWith("e1", { description: "Updated" }, "mock-token");
      expect(invalidateAfterExpenseChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useDeleteExpense", () => {
    it("mutationFn calls expensesApi.delete and invalidates", async () => {
      const config = renderMutationHook(() => useDeleteExpense());

      (expensesApi.delete as jest.Mock).mockResolvedValue(undefined);

      await config.mutationFn({ expenseId: "e1", groupId: "g1" });
      expect(expensesApi.delete).toHaveBeenCalledWith("e1", "mock-token");
      expect(invalidateAfterExpenseChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useCreateGroup", () => {
    it("mutationFn calls groupsApi.create with token", async () => {
      const config = renderMutationHook(() => useCreateGroup());

      const groupData = { name: "Trip" };
      (groupsApi.create as jest.Mock).mockResolvedValue({ id: "g1" });

      await config.mutationFn(groupData);
      expect(groupsApi.create).toHaveBeenCalledWith(groupData, "mock-token");
    });

    it("onSuccess invalidates group-related queries", () => {
      const config = renderMutationHook(() => useCreateGroup());
      config.onSuccess();
      expect(invalidateAfterGroupChange).toHaveBeenCalled();
    });
  });

  describe("useArchiveGroup", () => {
    it("mutationFn calls groupsApi.update with archive flag", async () => {
      const config = renderMutationHook(() => useArchiveGroup());

      (groupsApi.update as jest.Mock).mockResolvedValue({ id: "g1" });

      await config.mutationFn({ groupId: "g1", version: 1, archive: true });
      expect(groupsApi.update).toHaveBeenCalledWith(
        "g1",
        { isArchived: true, version: 1 },
        "mock-token"
      );
    });

    it("mutationFn passes archive=false for unarchive", async () => {
      const config = renderMutationHook(() => useArchiveGroup());

      (groupsApi.update as jest.Mock).mockResolvedValue({ id: "g1" });

      await config.mutationFn({ groupId: "g1", version: 2, archive: false });
      expect(groupsApi.update).toHaveBeenCalledWith(
        "g1",
        { isArchived: false, version: 2 },
        "mock-token"
      );
    });

    it("onSuccess invalidates group-related queries", () => {
      const config = renderMutationHook(() => useArchiveGroup());
      config.onSuccess();
      expect(invalidateAfterGroupChange).toHaveBeenCalled();
    });
  });

  describe("useDeleteGroup", () => {
    it("mutationFn calls groupsApi.delete", async () => {
      const config = renderMutationHook(() => useDeleteGroup());

      (groupsApi.delete as jest.Mock).mockResolvedValue(undefined);

      await config.mutationFn("g1");
      expect(groupsApi.delete).toHaveBeenCalledWith("g1", "mock-token");
    });

    it("onSuccess invalidates group-related queries", () => {
      const config = renderMutationHook(() => useDeleteGroup());
      config.onSuccess();
      expect(invalidateAfterGroupChange).toHaveBeenCalled();
    });
  });

  describe("useCreateSettlement", () => {
    it("mutationFn calls settlementsApi.create", async () => {
      const config = renderMutationHook(() => useCreateSettlement("g1"));

      const data = { fromMemberId: "m1", toMemberId: "m2", amountCents: 500 };
      (settlementsApi.create as jest.Mock).mockResolvedValue({ id: "s1" });

      await config.mutationFn(data);
      expect(settlementsApi.create).toHaveBeenCalledWith("g1", data, "mock-token");
    });

    it("onSuccess invalidates settlement-related queries", () => {
      const config = renderMutationHook(() => useCreateSettlement("g1"));
      config.onSuccess();
      expect(invalidateAfterSettlementChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useDeleteSettlement", () => {
    it("mutationFn calls settlementsApi.delete", async () => {
      const config = renderMutationHook(() => useDeleteSettlement("g1"));

      (settlementsApi.delete as jest.Mock).mockResolvedValue(undefined);

      await config.mutationFn("s1");
      expect(settlementsApi.delete).toHaveBeenCalledWith("s1", "mock-token");
    });

    it("onSuccess invalidates settlement-related queries", () => {
      const config = renderMutationHook(() => useDeleteSettlement("g1"));
      config.onSuccess();
      expect(invalidateAfterSettlementChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useAddMember", () => {
    it("mutationFn calls addGuestMember when payload has name", async () => {
      const config = renderMutationHook(() => useAddMember("g1"));

      (groupsApi.addGuestMember as jest.Mock).mockResolvedValue({ id: "m1" });

      await config.mutationFn({ name: "Alice" });
      expect(groupsApi.addGuestMember).toHaveBeenCalledWith("g1", { name: "Alice" }, "mock-token");
    });

    it("mutationFn calls addMember when payload has email", async () => {
      const config = renderMutationHook(() => useAddMember("g1"));

      (groupsApi.addMember as jest.Mock).mockResolvedValue({ id: "m1" });

      await config.mutationFn({ email: "alice@test.com" });
      expect(groupsApi.addMember).toHaveBeenCalledWith("g1", { email: "alice@test.com" }, "mock-token");
    });

    it("onSuccess invalidates member-related queries", () => {
      const config = renderMutationHook(() => useAddMember("g1"));
      config.onSuccess();
      expect(invalidateAfterMemberChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useRemoveMember", () => {
    it("mutationFn calls groupsApi.removeMember", async () => {
      const config = renderMutationHook(() => useRemoveMember("g1"));

      (groupsApi.removeMember as jest.Mock).mockResolvedValue(undefined);

      await config.mutationFn("m1");
      expect(groupsApi.removeMember).toHaveBeenCalledWith("g1", "m1", "mock-token");
    });

    it("onSuccess invalidates member-related queries", () => {
      const config = renderMutationHook(() => useRemoveMember("g1"));
      config.onSuccess();
      expect(invalidateAfterMemberChange).toHaveBeenCalledWith("g1");
    });
  });

  describe("useUpdateProfile", () => {
    it("mutationFn calls usersApi.updateMe", async () => {
      const config = renderMutationHook(() => useUpdateProfile());

      (usersApi.updateMe as jest.Mock).mockResolvedValue({ id: "u1" });

      await config.mutationFn({ name: "Updated Name" });
      expect(usersApi.updateMe).toHaveBeenCalledWith({ name: "Updated Name" }, "mock-token");
    });

    it("onSuccess invalidates profile queries", () => {
      const config = renderMutationHook(() => useUpdateProfile());
      config.onSuccess();
      expect(invalidateAfterProfileUpdate).toHaveBeenCalled();
    });
  });

  describe("useJoinGroup", () => {
    it("mutationFn calls inviteApi.join with invite code", async () => {
      const config = renderMutationHook(() => useJoinGroup());

      (inviteApi.join as jest.Mock).mockResolvedValue({ id: "g1" });

      await config.mutationFn("abc123");
      expect(inviteApi.join).toHaveBeenCalledWith({ inviteCode: "abc123" }, "mock-token");
    });

    it("onSuccess invalidates group-related queries", () => {
      const config = renderMutationHook(() => useJoinGroup());
      config.onSuccess();
      expect(invalidateAfterGroupChange).toHaveBeenCalled();
    });
  });

  describe("useRegenerateInvite", () => {
    it("mutationFn calls inviteApi.regenerate", async () => {
      const config = renderMutationHook(() => useRegenerateInvite("g1"));

      (inviteApi.regenerate as jest.Mock).mockResolvedValue({ inviteCode: "new-code" });

      await config.mutationFn();
      expect(inviteApi.regenerate).toHaveBeenCalledWith("g1", "mock-token");
    });

    it("onSuccess updates group cache with new invite code", () => {
      const mockSetQueryData = jest.fn();
      mockUseQueryClient.mockReturnValue({ setQueryData: mockSetQueryData, invalidateQueries: jest.fn() });

      const config = renderMutationHook(() => useRegenerateInvite("g1"));

      config.onSuccess({ inviteCode: "new-code" });
      expect(mockSetQueryData).toHaveBeenCalledWith(
        queryKeys.group("g1"),
        expect.any(Function)
      );

      // Test the updater function
      const updater = mockSetQueryData.mock.calls[0][1];
      const oldGroup = { id: "g1", name: "Trip", inviteCode: "old-code" };
      expect(updater(oldGroup)).toEqual({ ...oldGroup, inviteCode: "new-code" });
      expect(updater(undefined)).toBeUndefined();
    });
  });
});
