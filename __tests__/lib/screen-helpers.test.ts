import { inferCategoryFromDescription, hasUnsettledBalances } from "@/lib/screen-helpers";
import type { GroupMemberDto } from "@/lib/types";

describe("hasUnsettledBalances", () => {
  it("returns false for empty members array", () => {
    expect(hasUnsettledBalances([])).toBe(false);
  });

  it("returns false when all balances are zero", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", balance: 0, joinedAt: "2026-01-01" },
      { id: "m2", balance: 0, joinedAt: "2026-01-01" },
    ];
    expect(hasUnsettledBalances(members)).toBe(false);
  });

  it("returns false when all balances are undefined", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", joinedAt: "2026-01-01" },
      { id: "m2", joinedAt: "2026-01-01" },
    ];
    expect(hasUnsettledBalances(members)).toBe(false);
  });

  it("returns true when a member has positive balance", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", balance: 500, joinedAt: "2026-01-01" },
      { id: "m2", balance: 0, joinedAt: "2026-01-01" },
    ];
    expect(hasUnsettledBalances(members)).toBe(true);
  });

  it("returns true when a member has negative balance", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", balance: 0, joinedAt: "2026-01-01" },
      { id: "m2", balance: -300, joinedAt: "2026-01-01" },
    ];
    expect(hasUnsettledBalances(members)).toBe(true);
  });

  it("returns true with mix of positive, negative, and zero balances", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", balance: 500, joinedAt: "2026-01-01" },
      { id: "m2", balance: -500, joinedAt: "2026-01-01" },
      { id: "m3", balance: 0, joinedAt: "2026-01-01" },
    ];
    expect(hasUnsettledBalances(members)).toBe(true);
  });
});

const categories = [
  { id: "cat-food", name: "Food & Drink" },
  { id: "cat-transport", name: "Transport" },
  { id: "cat-accommodation", name: "Accommodation" },
  { id: "cat-entertainment", name: "Entertainment" },
  { id: "cat-groceries", name: "Groceries" },
  { id: "cat-shopping", name: "Shopping" },
  { id: "cat-health", name: "Health & Fitness" },
  { id: "cat-utilities", name: "Utilities" },
  { id: "cat-work", name: "Work" },
  { id: "cat-education", name: "Education" },
  { id: "cat-other", name: "Other" },
];

describe("inferCategoryFromDescription", () => {
  it("should return null for empty description", () => {
    expect(inferCategoryFromDescription("", categories)).toBeNull();
  });

  it("should return null for whitespace-only description", () => {
    expect(inferCategoryFromDescription("   ", categories)).toBeNull();
  });

  it("should return null for empty categories list", () => {
    expect(inferCategoryFromDescription("dinner", [])).toBeNull();
  });

  it("should return null when no keyword matches", () => {
    expect(inferCategoryFromDescription("random stuff xyz", categories)).toBeNull();
  });

  it("should infer food for dinner", () => {
    expect(inferCategoryFromDescription("Dinner with friends", categories)).toBe("cat-food");
  });

  it("should infer food for lunch", () => {
    expect(inferCategoryFromDescription("Lunch at the office", categories)).toBe("cat-food");
  });

  it("should infer food for coffee", () => {
    expect(inferCategoryFromDescription("Morning coffee", categories)).toBe("cat-food");
  });

  it("should infer food for restaurant", () => {
    expect(inferCategoryFromDescription("Italian restaurant", categories)).toBe("cat-food");
  });

  it("should infer transport for uber", () => {
    expect(inferCategoryFromDescription("Uber to airport", categories)).toBe("cat-transport");
  });

  it("should infer transport for gas", () => {
    expect(inferCategoryFromDescription("Gas station fill-up", categories)).toBe("cat-transport");
  });

  it("should infer transport for flight", () => {
    expect(inferCategoryFromDescription("Flight to NYC", categories)).toBe("cat-transport");
  });

  it("should infer accommodation for hotel", () => {
    expect(inferCategoryFromDescription("Hotel room NYC", categories)).toBe("cat-accommodation");
  });

  it("should infer accommodation for airbnb", () => {
    expect(inferCategoryFromDescription("Airbnb for the weekend", categories)).toBe("cat-accommodation");
  });

  it("should infer entertainment for movie", () => {
    expect(inferCategoryFromDescription("Movie tickets", categories)).toBe("cat-entertainment");
  });

  it("should infer entertainment for concert", () => {
    expect(inferCategoryFromDescription("Concert tickets", categories)).toBe("cat-entertainment");
  });

  it("should infer groceries for grocery", () => {
    expect(inferCategoryFromDescription("Weekly grocery run", categories)).toBe("cat-groceries");
  });

  it("should infer groceries for supermarket", () => {
    expect(inferCategoryFromDescription("Supermarket", categories)).toBe("cat-groceries");
  });

  it("should infer shopping for amazon", () => {
    expect(inferCategoryFromDescription("Amazon order", categories)).toBe("cat-shopping");
  });

  it("should infer health for gym", () => {
    expect(inferCategoryFromDescription("Gym membership", categories)).toBe("cat-health");
  });

  it("should infer health for pharmacy", () => {
    expect(inferCategoryFromDescription("Pharmacy prescription", categories)).toBe("cat-health");
  });

  it("should infer utilities for internet", () => {
    expect(inferCategoryFromDescription("Internet bill", categories)).toBe("cat-utilities");
  });

  it("should infer utilities for electric", () => {
    expect(inferCategoryFromDescription("Electric bill", categories)).toBe("cat-utilities");
  });

  it("should infer work for software subscription", () => {
    expect(inferCategoryFromDescription("Software subscription", categories)).toBe("cat-work");
  });

  it("should infer education for course", () => {
    expect(inferCategoryFromDescription("Online course", categories)).toBe("cat-education");
  });

  it("should be case-insensitive", () => {
    expect(inferCategoryFromDescription("DINNER WITH ALICE", categories)).toBe("cat-food");
  });

  it("should match partial word in description", () => {
    expect(inferCategoryFromDescription("ubereats order", categories)).toBe("cat-food");
  });

  it("should return null when category keyword has no matching category", () => {
    const limitedCategories = [{ id: "cat-other", name: "Other" }];
    expect(inferCategoryFromDescription("dinner with friends", limitedCategories)).toBeNull();
  });
});
