jest.unmock("@tanstack/react-query");

import {
  queryKeys,
  staleTimes,
  queryClient,
  invalidateAfterExpenseChange,
  invalidateAfterSettlementChange,
  invalidateAfterGroupChange,
  invalidateAfterMemberChange,
  invalidateAfterProfileUpdate,
} from "@/lib/query";

describe("queryKeys", () => {
  it("user keys are stable", () => {
    expect(queryKeys.user).toEqual(["user"]);
    expect(queryKeys.userBalance).toEqual(["user", "balance"]);
    expect(queryKeys.userActivity).toEqual(["user", "activity"]);
  });

  it("group keys include groupId", () => {
    expect(queryKeys.group("g1")).toEqual(["groups", "g1"]);
    expect(queryKeys.groupMembers("g1")).toEqual(["groups", "g1", "members"]);
    expect(queryKeys.groupExpenses("g1")).toEqual(["groups", "g1", "expenses"]);
  });

  it("groups key includes status", () => {
    expect(queryKeys.groups("active")).toEqual(["groups", "active"]);
    expect(queryKeys.groups("archived")).toEqual(["groups", "archived"]);
    expect(queryKeys.groups()).toEqual(["groups", "active"]);
  });

  it("settlement keys include groupId", () => {
    expect(queryKeys.settlementSuggestions("g1")).toEqual(["settlements", "g1", "suggestions"]);
    expect(queryKeys.settlementHistory("g1")).toEqual(["settlements", "g1", "history"]);
  });

  it("invite preview key includes code", () => {
    expect(queryKeys.invitePreview("abc")).toEqual(["invite", "abc"]);
  });

  it("categories and contacts are simple", () => {
    expect(queryKeys.categories).toEqual(["categories"]);
    expect(queryKeys.contacts).toEqual(["contacts"]);
  });
});

describe("staleTimes", () => {
  it("balance is always 0 (never trust stale money data)", () => {
    expect(staleTimes.balance).toBe(0);
  });

  it("settlements is always 0", () => {
    expect(staleTimes.settlements).toBe(0);
  });

  it("expenses have short stale time", () => {
    expect(staleTimes.expenses).toBe(10_000);
  });

  it("categories have long stale time (static data)", () => {
    expect(staleTimes.categories).toBe(5 * 60_000);
  });

  it("all stale times are non-negative numbers", () => {
    Object.values(staleTimes).forEach((t) => {
      expect(typeof t).toBe("number");
      expect(t).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("queryClient", () => {
  it("is a QueryClient instance with expected default options", () => {
    expect(queryClient).toBeDefined();
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.gcTime).toBe(5 * 60_000);
    expect(defaults.queries?.refetchOnReconnect).toBe(false);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(0);
  });
});

describe("invalidation helpers", () => {
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    invalidateSpy = jest.spyOn(queryClient, "invalidateQueries").mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    invalidateSpy.mockRestore();
  });

  describe("invalidateAfterExpenseChange", () => {
    it("invalidates group expenses, balance, activity, settlements, and group", () => {
      invalidateAfterExpenseChange("g1");

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.groupExpenses("g1") });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.userBalance });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.userActivity });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.settlementSuggestions("g1") });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.group("g1") });
      expect(invalidateSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe("invalidateAfterSettlementChange", () => {
    it("invalidates suggestions, history, balance, activity, and group", () => {
      invalidateAfterSettlementChange("g2");

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.settlementSuggestions("g2") });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.settlementHistory("g2") });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.userBalance });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.userActivity });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.group("g2") });
      expect(invalidateSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe("invalidateAfterGroupChange", () => {
    it("invalidates groups list and balance", () => {
      invalidateAfterGroupChange();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groups"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.userBalance });
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidateAfterMemberChange", () => {
    it("invalidates members, group, balance, and contacts", () => {
      invalidateAfterMemberChange("g3");

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.groupMembers("g3") });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.group("g3") });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.userBalance });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.contacts });
      expect(invalidateSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("invalidateAfterProfileUpdate", () => {
    it("invalidates user queries", () => {
      invalidateAfterProfileUpdate();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.user });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });
  });
});
