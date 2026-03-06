import { queryKeys, staleTimes } from "@/lib/query";

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
