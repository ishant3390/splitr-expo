import {
  initSplitValues,
  calculateEqualSplit,
  validatePercentageSplit,
  redistributePercentages,
  validateFixedSplit,
  dedupeMembers,
  aggregateByPerson,
  aggregateByCategory,
  aggregateByMonth,
  filterExpenses,
  sortExpenses,
  resolvePayerName,
  computeBalancesFromMembers,
  formatActivityTitle,
  formatActivityInvolvement,
  formatCentsForInvolvement,
  shortenName,
  computeExpenseCardDisplay,
  resolveActivityGroupName,
} from "../../lib/screen-helpers";
import type { ActivityLogDto } from "../../lib/types";

// ---------------------------------------------------------------------------
// initSplitValues
// ---------------------------------------------------------------------------
describe("initSplitValues", () => {
  const members = ["u1", "u2", "u3"];

  it("returns percentage split evenly for 3 members", () => {
    const result = initSplitValues(members, "percentage", "100");
    expect(Object.keys(result)).toHaveLength(3);
    expect(result["u1"]).toBe("33.33");
    expect(result["u2"]).toBe("33.33");
    expect(result["u3"]).toBe("33.33");
  });

  it("returns percentage split evenly for 2 members", () => {
    const result = initSplitValues(["a", "b"], "percentage", "0");
    expect(result["a"]).toBe("50.00");
    expect(result["b"]).toBe("50.00");
  });

  it("returns fixed split evenly for $100 among 3 members", () => {
    const result = initSplitValues(members, "fixed", "100");
    expect(result["u1"]).toBe("33.33");
    expect(result["u2"]).toBe("33.33");
    expect(result["u3"]).toBe("33.33");
  });

  it("returns fixed split for $50 among 2 members", () => {
    const result = initSplitValues(["a", "b"], "fixed", "50");
    expect(result["a"]).toBe("25.00");
    expect(result["b"]).toBe("25.00");
  });

  it("returns empty map for empty members array", () => {
    expect(initSplitValues([], "percentage", "100")).toEqual({});
    expect(initSplitValues([], "fixed", "100")).toEqual({});
    expect(initSplitValues([], "equal", "100")).toEqual({});
  });

  it("returns empty map for equal split type (no per-member values needed)", () => {
    const result = initSplitValues(members, "equal", "100");
    expect(result).toEqual({});
  });

  it("handles non-numeric totalStr for fixed split", () => {
    const result = initSplitValues(members, "fixed", "abc");
    expect(result["u1"]).toBe("0.00");
  });
});

// ---------------------------------------------------------------------------
// calculateEqualSplit
// ---------------------------------------------------------------------------
describe("calculateEqualSplit", () => {
  it("splits evenly when divisible", () => {
    expect(calculateEqualSplit(300, 3)).toEqual([100, 100, 100]);
    expect(calculateEqualSplit(400, 2)).toEqual([200, 200]);
  });

  it("assigns remainder to last person", () => {
    const result = calculateEqualSplit(100, 3);
    // 33, 33, 34
    expect(result).toEqual([33, 33, 34]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("handles remainder of 2", () => {
    const result = calculateEqualSplit(1001, 3);
    // 333, 333, 335
    expect(result[0]).toBe(333);
    expect(result[1]).toBe(333);
    expect(result[2]).toBe(335);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it("returns empty array for zero count", () => {
    expect(calculateEqualSplit(100, 0)).toEqual([]);
  });

  it("returns full amount for single person", () => {
    expect(calculateEqualSplit(500, 1)).toEqual([500]);
  });

  it("handles zero total", () => {
    expect(calculateEqualSplit(0, 3)).toEqual([0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// validatePercentageSplit
// ---------------------------------------------------------------------------
describe("validatePercentageSplit", () => {
  it("validates when percentages sum to exactly 100", () => {
    const result = validatePercentageSplit({ a: "50", b: "50" });
    expect(result.valid).toBe(true);
    expect(result.total).toBe(100);
  });

  it("invalidates when percentages sum to 95", () => {
    const result = validatePercentageSplit({ a: "50", b: "45" });
    expect(result.valid).toBe(false);
    expect(result.total).toBe(95);
  });

  it("invalidates when percentages sum to 105", () => {
    const result = validatePercentageSplit({ a: "55", b: "50" });
    expect(result.valid).toBe(false);
    expect(result.total).toBe(105);
  });

  it("allows within 0.5 tolerance (99.6)", () => {
    const result = validatePercentageSplit({ a: "33.20", b: "33.20", c: "33.20" });
    // total = 99.60 => |99.60 - 100| = 0.40 <= 0.5 => valid
    expect(result.valid).toBe(true);
  });

  it("allows within 0.5 tolerance (100.4)", () => {
    const result = validatePercentageSplit({ a: "33.47", b: "33.47", c: "33.46" });
    // total = 100.40 => |100.40 - 100| = 0.40 <= 0.5 => valid
    expect(result.valid).toBe(true);
  });

  it("rejects just outside tolerance (99.4)", () => {
    const result = validatePercentageSplit({ a: "33.10", b: "33.10", c: "33.20" });
    // total = 99.40 => |99.40 - 100| = 0.60 > 0.5 => invalid
    expect(result.valid).toBe(false);
  });

  it("handles empty percentages", () => {
    const result = validatePercentageSplit({});
    expect(result.valid).toBe(false);
    expect(result.total).toBe(0);
  });

  it("handles non-numeric values gracefully", () => {
    const result = validatePercentageSplit({ a: "abc", b: "50" });
    expect(result.total).toBe(50);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// redistributePercentages
// ---------------------------------------------------------------------------
describe("redistributePercentages", () => {
  it("redistributes evenly across the other 3 when one of 4 is changed to 10", () => {
    const current = { a: "25.00", b: "25.00", c: "25.00", d: "25.00" };
    const result = redistributePercentages(current, "a", "10", ["a", "b", "c", "d"], []);
    expect(result.a).toBe("10");
    expect(parseFloat(result.b) + parseFloat(result.c) + parseFloat(result.d)).toBeCloseTo(90, 2);
    // Each unlocked = 30
    expect(result.b).toBe("30.00");
    expect(result.c).toBe("30.00");
    expect(result.d).toBe("30.00");
  });

  it("preserves previously locked members and only redistributes among remaining", () => {
    const current = { a: "10", b: "30.00", c: "30.00", d: "30.00" };
    const result = redistributePercentages(current, "b", "20", ["a", "b", "c", "d"], ["a"]);
    expect(result.a).toBe("10");
    expect(result.b).toBe("20");
    // Remaining = 100 - 10 - 20 = 70 split across c,d → 35 each
    expect(result.c).toBe("35.00");
    expect(result.d).toBe("35.00");
  });

  it("handles rounding remainder (1/3 split) so total reaches exactly 100", () => {
    const current = { a: "33.33", b: "33.33", c: "33.34" };
    const result = redistributePercentages(current, "a", "10", ["a", "b", "c"], []);
    const total = parseFloat(result.a) + parseFloat(result.b) + parseFloat(result.c);
    expect(total).toBeCloseTo(100, 2);
  });

  it("returns 0 for unlocked members when locked sum exceeds 100", () => {
    const current = { a: "60", b: "20.00", c: "20.00" };
    const result = redistributePercentages(current, "a", "120", ["a", "b", "c"], []);
    // changedMember kept as user typed, but unlocked redistributed against negative remaining → 0
    expect(parseFloat(result.b)).toBe(0);
    expect(parseFloat(result.c)).toBe(0);
  });

  it("returns the new value as-is when no other selected members exist", () => {
    const current = { a: "100" };
    const result = redistributePercentages(current, "a", "50", ["a"], []);
    expect(result.a).toBe("50");
  });

  it("treats empty string input as 0 for the changed member", () => {
    const current = { a: "25.00", b: "25.00", c: "25.00", d: "25.00" };
    const result = redistributePercentages(current, "a", "", ["a", "b", "c", "d"], []);
    expect(result.a).toBe("");
    // Unlocked b,c,d split (100 - 0) = 100 → 33.33 each (with rounding remainder on first)
    const total = parseFloat(result.b) + parseFloat(result.c) + parseFloat(result.d);
    expect(total).toBeCloseTo(100, 2);
  });

  it("ignores locked members that are no longer selected", () => {
    const current = { a: "50", b: "25", c: "25" };
    // 'a' was locked previously but is no longer in selectedMemberIds
    const result = redistributePercentages(current, "b", "20", ["b", "c"], ["a"]);
    expect(result.b).toBe("20");
    expect(result.c).toBe("80.00");
  });
});

// ---------------------------------------------------------------------------
// validateFixedSplit
// ---------------------------------------------------------------------------
describe("validateFixedSplit", () => {
  it("validates when fixed amounts match total", () => {
    // 25.00 + 25.00 = 5000 cents, totalCents = 5000
    const result = validateFixedSplit({ a: "25.00", b: "25.00" }, 5000);
    expect(result.valid).toBe(true);
    expect(result.totalFixed).toBe(5000);
  });

  it("invalidates when fixed amounts do not match total", () => {
    const result = validateFixedSplit({ a: "20.00", b: "25.00" }, 5000);
    expect(result.valid).toBe(false);
    expect(result.totalFixed).toBe(4500);
  });

  it("allows within 1 cent tolerance", () => {
    // 33.33 + 33.33 + 33.33 = 9999 cents, totalCents = 10000
    const result = validateFixedSplit({ a: "33.33", b: "33.33", c: "33.33" }, 10000);
    expect(result.totalFixed).toBe(9999);
    expect(result.valid).toBe(true);
  });

  it("rejects outside 1 cent tolerance", () => {
    const result = validateFixedSplit({ a: "33.33", b: "33.33", c: "33.30" }, 10000);
    expect(result.totalFixed).toBe(9996);
    expect(result.valid).toBe(false);
  });

  it("handles empty amounts", () => {
    const result = validateFixedSplit({}, 5000);
    expect(result.valid).toBe(false);
    expect(result.totalFixed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// dedupeMembers
// ---------------------------------------------------------------------------
describe("dedupeMembers", () => {
  it("removes duplicate members by id", () => {
    const input = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "1", name: "Alice duplicate" },
    ];
    const result = dedupeMembers(input);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Bob");
  });

  it("returns all members when no duplicates", () => {
    const input = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
    ];
    expect(dedupeMembers(input)).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(dedupeMembers([])).toEqual([]);
  });

  it("preserves original order", () => {
    const input = [
      { id: "3", name: "Charlie" },
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie dup" },
    ];
    const result = dedupeMembers(input);
    expect(result.map((m) => m.id)).toEqual(["3", "1", "2"]);
  });

  it("handles single member", () => {
    expect(dedupeMembers([{ id: "1", name: "Solo" }])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// aggregateByPerson
// ---------------------------------------------------------------------------
describe("aggregateByPerson", () => {
  it("aggregates amounts by user across expenses", () => {
    const expenses = [
      { payers: [{ user: { id: "u1", name: "Alice" }, amountPaid: 500 }] },
      { payers: [{ user: { id: "u1", name: "Alice" }, amountPaid: 300 }] },
      { payers: [{ user: { id: "u2", name: "Bob" }, amountPaid: 200 }] },
    ];
    const result = aggregateByPerson(expenses);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Alice", total: 800 });
    expect(result[1]).toEqual({ name: "Bob", total: 200 });
  });

  it("handles guest users", () => {
    const expenses = [
      { payers: [{ guestUser: { id: "g1", name: "Guest1" }, amountPaid: 100 }] },
    ];
    const result = aggregateByPerson(expenses);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "Guest1", total: 100 });
  });

  it("falls back to 'Unknown' when no name available", () => {
    const expenses = [
      { payers: [{ amountPaid: 50 }] },
    ];
    const result = aggregateByPerson(expenses);
    expect(result[0].name).toBe("Unknown");
  });

  it("returns empty array for no payers", () => {
    const expenses = [{ payers: [] }, {}];
    expect(aggregateByPerson(expenses)).toEqual([]);
  });

  it("sorts by total descending", () => {
    const expenses = [
      { payers: [
        { user: { id: "u1", name: "Alice" }, amountPaid: 100 },
        { user: { id: "u2", name: "Bob" }, amountPaid: 500 },
      ]},
    ];
    const result = aggregateByPerson(expenses);
    expect(result[0].name).toBe("Bob");
    expect(result[1].name).toBe("Alice");
  });
});

// ---------------------------------------------------------------------------
// aggregateByCategory
// ---------------------------------------------------------------------------
describe("aggregateByCategory", () => {
  it("aggregates amounts by category name", () => {
    const expenses = [
      { category: { name: "Food" }, amountCents: 1000 },
      { category: { name: "Food" }, amountCents: 500 },
      { category: { name: "Transport" }, amountCents: 300 },
    ];
    const result = aggregateByCategory(expenses);
    expect(result).toEqual([
      ["Food", 1500],
      ["Transport", 300],
    ]);
  });

  it("falls back to 'Other' for null/undefined category", () => {
    const expenses = [
      { category: null, amountCents: 200 },
      { amountCents: 100 },
    ];
    const result = aggregateByCategory(expenses);
    expect(result).toEqual([["Other", 300]]);
  });

  it("limits to top N categories", () => {
    const expenses = [
      { category: { name: "A" }, amountCents: 100 },
      { category: { name: "B" }, amountCents: 200 },
      { category: { name: "C" }, amountCents: 300 },
      { category: { name: "D" }, amountCents: 400 },
      { category: { name: "E" }, amountCents: 500 },
      { category: { name: "F" }, amountCents: 600 },
    ];
    const result = aggregateByCategory(expenses, 3);
    expect(result).toHaveLength(3);
    expect(result[0][0]).toBe("F");
    expect(result[2][0]).toBe("D");
  });

  it("returns empty array for empty expenses", () => {
    expect(aggregateByCategory([])).toEqual([]);
  });

  it("uses default topN of 5", () => {
    const expenses = Array.from({ length: 8 }, (_, i) => ({
      category: { name: `Cat${i}` },
      amountCents: (i + 1) * 100,
    }));
    expect(aggregateByCategory(expenses)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// aggregateByMonth
// ---------------------------------------------------------------------------
describe("aggregateByMonth", () => {
  it("groups expenses by YYYY-MM and sorts chronologically", () => {
    const expenses = [
      { date: "2026-01-15", amountCents: 1000 },
      { date: "2026-01-20", amountCents: 500 },
      { date: "2026-02-05", amountCents: 800 },
    ];
    const result = aggregateByMonth(expenses);
    expect(result).toEqual([
      { month: "2026-01", total: 1500 },
      { month: "2026-02", total: 800 },
    ]);
  });

  it("falls back to createdAt when date is missing", () => {
    const expenses = [
      { createdAt: "2026-03-01T12:00:00Z", amountCents: 200 },
      { createdAt: "2026-03-15T12:00:00Z", amountCents: 300 },
    ];
    const result = aggregateByMonth(expenses);
    expect(result).toEqual([{ month: "2026-03", total: 500 }]);
  });

  it("returns empty array for no expenses", () => {
    expect(aggregateByMonth([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// filterExpenses
// ---------------------------------------------------------------------------
describe("filterExpenses", () => {
  const expenses = [
    {
      description: "Lunch at cafe",
      payers: [{ user: { name: "Alice" }, amountPaid: 100 }],
      category: { name: "Food" },
    },
    {
      description: "Uber ride",
      payers: [{ user: { name: "Bob" }, amountPaid: 200 }],
      category: { name: "Transport" },
    },
    {
      description: "Movie tickets",
      payers: [{ guestUser: { name: "Charlie" }, amountPaid: 150 }],
      category: { name: "Entertainment" },
    },
  ];

  it("filters by description match", () => {
    const result = filterExpenses(expenses, "lunch");
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Lunch at cafe");
  });

  it("filters by payer name", () => {
    const result = filterExpenses(expenses, "bob");
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Uber ride");
  });

  it("filters by category name", () => {
    const result = filterExpenses(expenses, "entertainment");
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Movie tickets");
  });

  it("returns all expenses for empty query", () => {
    expect(filterExpenses(expenses, "")).toHaveLength(3);
    expect(filterExpenses(expenses, "   ")).toHaveLength(3);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterExpenses(expenses, "nonexistent")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(filterExpenses(expenses, "UBER")).toHaveLength(1);
    expect(filterExpenses(expenses, "ALICE")).toHaveLength(1);
  });

  it("handles expenses with missing fields", () => {
    const sparse = [{ amountCents: 100 }];
    expect(filterExpenses(sparse, "test")).toHaveLength(0);
    expect(filterExpenses(sparse, "")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// sortExpenses
// ---------------------------------------------------------------------------
describe("sortExpenses", () => {
  it("sorts by date descending", () => {
    const expenses = [
      { description: "Old", date: "2025-01-01" },
      { description: "New", date: "2025-06-15" },
      { description: "Mid", date: "2025-03-10" },
    ];
    const result = sortExpenses(expenses, "date");
    expect(result.map((e) => e.description)).toEqual(["New", "Mid", "Old"]);
  });

  it("sorts by amount descending", () => {
    const expenses = [
      { description: "Small", amountCents: 100 },
      { description: "Large", amountCents: 5000 },
      { description: "Medium", amountCents: 1500 },
    ];
    const result = sortExpenses(expenses, "amount");
    expect(result.map((e) => e.description)).toEqual(["Large", "Medium", "Small"]);
  });

  it("falls back to createdAt when date is missing", () => {
    const expenses = [
      { description: "A", createdAt: "2025-01-01T00:00:00Z" },
      { description: "B", createdAt: "2025-06-01T00:00:00Z" },
    ];
    const result = sortExpenses(expenses, "date");
    expect(result[0].description).toBe("B");
  });

  it("handles missing dates gracefully", () => {
    const expenses = [
      { description: "No date" },
      { description: "Has date", date: "2025-01-01" },
    ];
    // Should not throw
    const result = sortExpenses(expenses, "date");
    expect(result).toHaveLength(2);
  });

  it("does not mutate the original array", () => {
    const expenses = [
      { description: "B", amountCents: 200 },
      { description: "A", amountCents: 100 },
    ];
    const original = [...expenses];
    sortExpenses(expenses, "amount");
    expect(expenses[0].description).toBe(original[0].description);
  });

  it("handles empty array", () => {
    expect(sortExpenses([], "date")).toEqual([]);
    expect(sortExpenses([], "amount")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolvePayerName
// ---------------------------------------------------------------------------
describe("resolvePayerName", () => {
  it("returns user name when available", () => {
    const payer = { user: { id: "u1", name: "Alice" } };
    expect(resolvePayerName(payer)).toBe("Alice");
  });

  it("returns guest user name when no user name", () => {
    const payer = { guestUser: { id: "g1", name: "Guest Bob" } };
    expect(resolvePayerName(payer)).toBe("Guest Bob");
  });

  it("looks up user by ID in members list", () => {
    const payer = { user: { id: "u1" } };
    const members = [
      { user: { id: "u1", name: "Alice from members" } },
    ];
    expect(resolvePayerName(payer, members)).toBe("Alice from members");
  });

  it("looks up guest user by ID in members list", () => {
    const payer = { guestUser: { id: "g1" } };
    const members = [
      { guestUser: { id: "g1", name: "Guest from members" } },
    ];
    expect(resolvePayerName(payer, members)).toBe("Guest from members");
  });

  it("falls back to displayName when member name is missing", () => {
    const payer = { user: { id: "u1" } };
    const members = [
      { user: { id: "u1" }, displayName: "Display Alice" },
    ];
    expect(resolvePayerName(payer, members)).toBe("Display Alice");
  });

  it("falls back to 'Member' when no name or displayName in members", () => {
    const payer = { user: { id: "u1" } };
    const members = [{ user: { id: "u1" } }];
    expect(resolvePayerName(payer, members)).toBe("Member");
  });

  it("falls back to createdBy name", () => {
    const payer = { user: { id: "u1" } };
    const createdBy = { name: "Creator" };
    expect(resolvePayerName(payer, [], createdBy)).toBe("Creator");
  });

  it("falls back to 'Someone' when nothing available", () => {
    expect(resolvePayerName(undefined)).toBe("Someone");
    expect(resolvePayerName({}, [])).toBe("Someone");
    expect(resolvePayerName(undefined, undefined, null)).toBe("Someone");
  });

  it("prefers user name over guest name", () => {
    const payer = {
      user: { id: "u1", name: "Alice" },
      guestUser: { id: "g1", name: "Guest" },
    };
    expect(resolvePayerName(payer)).toBe("Alice");
  });

  it("falls back to guest user displayName in members", () => {
    const payer = { guestUser: { id: "g1" } };
    const members = [
      { guestUser: { id: "g1" }, displayName: "Guest Display" },
    ];
    expect(resolvePayerName(payer, members)).toBe("Guest Display");
  });
});

// --- computeBalancesFromMembers ---

describe("computeBalancesFromMembers", () => {
  it("returns zero for empty array", () => {
    expect(computeBalancesFromMembers([], "me@test.com")).toEqual({ owed: 0, owes: 0 });
  });

  it("sums positive balances as owed", () => {
    const members = [
      [
        { user: { email: "me@test.com" }, balance: 5000 },
        { user: { email: "other@test.com" }, balance: -5000 },
      ],
      [
        { user: { email: "me@test.com" }, balance: 3000 },
      ],
    ];
    const result = computeBalancesFromMembers(members, "me@test.com");
    expect(result.owed).toBe(8000);
    expect(result.owes).toBe(0);
  });

  it("sums negative balances as owes (absolute value)", () => {
    const members = [
      [{ user: { email: "me@test.com" }, balance: -2000 }],
      [{ user: { email: "me@test.com" }, balance: -1500 }],
    ];
    const result = computeBalancesFromMembers(members, "me@test.com");
    expect(result.owed).toBe(0);
    expect(result.owes).toBe(3500);
  });

  it("handles mixed positive and negative", () => {
    const members = [
      [{ user: { email: "me@test.com" }, balance: 5000 }],
      [{ user: { email: "me@test.com" }, balance: -3000 }],
    ];
    const result = computeBalancesFromMembers(members, "me@test.com");
    expect(result.owed).toBe(5000);
    expect(result.owes).toBe(3000);
  });

  it("skips groups where user is not found", () => {
    const members = [
      [{ user: { email: "other@test.com" }, balance: 9999 }],
    ];
    expect(computeBalancesFromMembers(members, "me@test.com")).toEqual({ owed: 0, owes: 0 });
  });

  it("skips members with null balance", () => {
    const members = [
      [{ user: { email: "me@test.com" }, balance: null }],
    ];
    expect(computeBalancesFromMembers(members, "me@test.com")).toEqual({ owed: 0, owes: 0 });
  });

  it("skips zero balance", () => {
    const members = [
      [{ user: { email: "me@test.com" }, balance: 0 }],
    ];
    expect(computeBalancesFromMembers(members, "me@test.com")).toEqual({ owed: 0, owes: 0 });
  });

  it("handles non-array member results gracefully", () => {
    const members = [null as any, undefined as any];
    expect(computeBalancesFromMembers(members, "me@test.com")).toEqual({ owed: 0, owes: 0 });
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: validateFixedSplit with undefined amountCents
// ---------------------------------------------------------------------------
describe("validateFixedSplit — edge branches", () => {
  it("treats non-numeric fixed values as 0", () => {
    const result = validateFixedSplit({ a: "", b: "abc" }, 100);
    expect(result.totalFixed).toBe(0);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: dedupeMembers with non-array input
// ---------------------------------------------------------------------------
describe("dedupeMembers — non-array input", () => {
  it("returns empty array for non-array input", () => {
    expect(dedupeMembers(null as any)).toEqual([]);
    expect(dedupeMembers(undefined as any)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: aggregateByCategory with undefined amountCents
// ---------------------------------------------------------------------------
describe("aggregateByCategory — undefined amountCents", () => {
  it("treats undefined amountCents as 0", () => {
    const expenses = [
      { category: { name: "Food" } },
    ];
    const result = aggregateByCategory(expenses);
    expect(result).toEqual([["Food", 0]]);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: aggregateByMonth — skips expenses without date/createdAt
// ---------------------------------------------------------------------------
describe("aggregateByMonth — no date or createdAt", () => {
  it("skips expenses with neither date nor createdAt", () => {
    const expenses = [
      { amountCents: 100 },
      { date: "2026-01-15", amountCents: 200 },
    ];
    const result = aggregateByMonth(expenses);
    expect(result).toEqual([{ month: "2026-01", total: 200 }]);
  });

  it("treats undefined amountCents as 0", () => {
    const expenses = [
      { date: "2026-05-10" },
    ];
    const result = aggregateByMonth(expenses);
    expect(result).toEqual([{ month: "2026-05", total: 0 }]);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: sortExpenses — amount with undefined amountCents
// ---------------------------------------------------------------------------
describe("sortExpenses — undefined amountCents", () => {
  it("treats undefined amountCents as 0 when sorting by amount", () => {
    const expenses = [
      { description: "No amount" },
      { description: "Has amount", amountCents: 500 },
    ];
    const result = sortExpenses(expenses, "amount");
    expect(result[0].description).toBe("Has amount");
    expect(result[1].description).toBe("No amount");
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: resolvePayerName — guest member fallback to "Member"
// ---------------------------------------------------------------------------
describe("resolvePayerName — guest member with no name or displayName", () => {
  it("falls back to 'Member' when guest member found but has no name or displayName", () => {
    const payer = { guestUser: { id: "g1" } };
    const members = [{ guestUser: { id: "g1" } }];
    expect(resolvePayerName(payer, members)).toBe("Member");
  });
});

// ---------------------------------------------------------------------------
// formatActivityTitle
// ---------------------------------------------------------------------------

function makeActivity(overrides: Partial<ActivityLogDto>): ActivityLogDto {
  return {
    id: "a1",
    activityType: "expense_created",
    createdAt: "2026-03-05T10:00:00Z",
    ...overrides,
  };
}

describe("formatActivityTitle", () => {
  // expense_created
  it("returns 'You added Dinner' when current user is the actor", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      details: { description: "Dinner" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You added Dinner");
  });

  it("returns 'Sean added Dinner' when someone else is the actor", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u2",
      actorUserName: "Sean",
      details: { description: "Dinner" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Sean added Dinner");
  });

  // expense_updated
  it("returns 'You updated Lunch' for expense_updated by current user", () => {
    const a = makeActivity({
      activityType: "expense_updated",
      actorUserId: "me",
      actorUserName: "Ajay",
      details: { newDescription: "Lunch" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You updated Lunch");
  });

  it("returns 'Bob updated Lunch' for expense_updated by another user", () => {
    const a = makeActivity({
      activityType: "expense_updated",
      actorUserId: "u2",
      actorUserName: "Bob",
      details: { newDescription: "Lunch" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Bob updated Lunch");
  });

  // expense_deleted
  it("returns 'You deleted Coffee' for expense_deleted by current user", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      actorUserId: "me",
      details: { description: "Coffee" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You deleted Coffee");
  });

  it("returns 'Alice deleted Coffee' for expense_deleted by someone else", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      actorUserId: "u3",
      actorUserName: "Alice",
      details: { description: "Coffee" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Alice deleted Coffee");
  });

  // settlement_created
  it("returns 'You settled up' for settlement_created with no payee info", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "me",
    });
    expect(formatActivityTitle(a, "me")).toBe("You settled up");
  });

  it("returns 'Carol settled up' for settlement_created by someone else with no payee info", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "u4",
      actorUserName: "Carol",
    });
    expect(formatActivityTitle(a, "me")).toBe("Carol settled up");
  });

  it("returns 'You settled up with Bob' when payeeUserName is present", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "me",
      details: { payeeUserId: "u2", payeeUserName: "Bob Smith" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You settled up with Bob");
  });

  it("returns 'Carol settled up with you' when payee is current user", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "u4",
      actorUserName: "Carol",
      details: { payeeUserId: "me", payeeUserName: "Me" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Carol settled up with you");
  });

  it("returns 'Alice settled up with Bob' for third-party settlement", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "u1",
      actorUserName: "Alice",
      details: { payeeUserId: "u2", payeeUserName: "Bob" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Alice settled up with Bob");
  });

  it("falls back to payeeGuestName when payeeUserName absent", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "me",
      details: { payeeGuestName: "Charlie Guest" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You settled up with Charlie");
  });

  // member_joined — group name now shown as subtitle, not in title
  it("returns 'You joined' for member_joined by current user", () => {
    const a = makeActivity({
      activityType: "member_joined",
      actorUserId: "me",
      groupName: "Road Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("You joined");
  });

  it("returns 'Dave joined' for member_joined by someone else", () => {
    const a = makeActivity({
      activityType: "member_joined",
      actorUserId: "u5",
      actorUserName: "Dave",
      groupName: "Road Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("Dave joined");
  });

  // member_joined_via_invite
  it("returns 'John joined' for member_joined_via_invite", () => {
    const a = makeActivity({
      activityType: "member_joined_via_invite",
      actorUserId: "u8",
      actorUserName: "John",
      groupName: "Road Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("John joined");
  });

  it("returns 'You joined' for member_joined_via_invite by current user", () => {
    const a = makeActivity({
      activityType: "member_joined_via_invite",
      actorUserId: "me",
      groupName: "Road Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("You joined");
  });

  it("returns title without group name for member_joined_via_invite when groupName is null", () => {
    const a = makeActivity({
      activityType: "member_joined_via_invite",
      actorUserId: "u8",
      actorUserName: "Chinam",
      details: { groupName: "RoadTrip" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Chinam joined");
  });

  it("returns title without group name for member_joined when groupName is null", () => {
    const a = makeActivity({
      activityType: "member_joined",
      actorUserId: "u8",
      actorUserName: "Dave",
      details: { groupName: "Beach Trip" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Dave joined");
  });

  // member_added — group name now shown as subtitle, not in title
  it("returns 'You added Bob' for member_added by current user", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "me",
      groupName: "Road Trip",
      details: { targetUserName: "Bob", targetUserId: "u5" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You added Bob");
  });

  it("returns 'Ajay added you' when target is current user", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "u1",
      actorUserName: "Ajay",
      groupName: "Road Trip",
      details: { targetUserName: "Bob", targetUserId: "me" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Ajay added you");
  });

  it("returns 'Ajay added Bob' for member_added by someone else", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "u1",
      actorUserName: "Ajay",
      groupName: "Road Trip",
      details: { targetUserName: "Bob", targetUserId: "u5" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Ajay added Bob");
  });

  it("falls back to memberName in member_added details", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "u1",
      actorUserName: "Ajay",
      groupName: "Trip",
      details: { memberName: "Charlie" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Ajay added Charlie");
  });

  it("falls back to addedMemberName in member_added details", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "u1",
      actorUserName: "Ajay",
      groupName: "Trip",
      details: { addedMemberName: "Dana" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Ajay added Dana");
  });

  it("falls back to 'a member' when no target name in member_added", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "u1",
      actorUserName: "Ajay",
      groupName: "Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("Ajay added a member");
  });

  it("omits group name when groupName is null in member_added", () => {
    const a = makeActivity({
      activityType: "member_added",
      actorUserId: "u1",
      actorUserName: "Ajay",
      details: { targetUserName: "Bob" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Ajay added Bob");
  });

  // group_created — group name included in title
  it("returns 'You created group Weekend' for group_created by current user", () => {
    const a = makeActivity({
      activityType: "group_created",
      actorUserId: "me",
      groupName: "Weekend",
    });
    expect(formatActivityTitle(a, "me")).toBe("You created group Weekend");
  });

  it("returns 'Eve created group Weekend' for group_created by someone else", () => {
    const a = makeActivity({
      activityType: "group_created",
      actorUserId: "u6",
      actorUserName: "Eve",
      groupName: "Weekend",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve created group Weekend");
  });

  it("returns 'You created a group' for group_created with no group name", () => {
    const a = makeActivity({
      activityType: "group_created",
      actorUserId: "me",
    });
    expect(formatActivityTitle(a, "me")).toBe("You created a group");
  });

  // group_updated
  it("returns 'You updated' for group_updated by current user", () => {
    const a = makeActivity({
      activityType: "group_updated",
      actorUserId: "me",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("You updated");
  });

  it("returns 'Eve updated' for group_updated by someone else", () => {
    const a = makeActivity({
      activityType: "group_updated",
      actorUserId: "u6",
      actorUserName: "Eve",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve updated");
  });

  it("returns title without group name for group_updated when groupName is null", () => {
    const a = makeActivity({
      activityType: "group_updated",
      actorUserId: "u6",
      actorUserName: "Eve",
      details: { groupName: "Road Trip" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve updated");
  });

  // group_archived
  it("returns 'You archived group Trip to Paris' for group_archived by current user", () => {
    const a = makeActivity({
      activityType: "group_archived",
      actorUserId: "me",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("You archived group Trip to Paris");
  });

  it("returns 'Eve archived group Trip to Paris' for group_archived by someone else", () => {
    const a = makeActivity({
      activityType: "group_archived",
      actorUserId: "u6",
      actorUserName: "Eve",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve archived group Trip to Paris");
  });

  it("returns 'Eve archived a group' for group_archived when no group name available", () => {
    const a = makeActivity({
      activityType: "group_archived",
      actorUserId: "u6",
      actorUserName: "Eve",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve archived a group");
  });

  it("falls back to details.groupName for group_archived", () => {
    const a = makeActivity({
      activityType: "group_archived",
      actorUserId: "u6",
      actorUserName: "Eve",
      details: { action: "archived", groupName: "Road Trip" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve archived group Road Trip");
  });

  // group_unarchived
  it("returns 'You unarchived' for group_unarchived by current user", () => {
    const a = makeActivity({
      activityType: "group_unarchived",
      actorUserId: "me",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("You unarchived");
  });

  it("returns 'Eve unarchived' for group_unarchived by someone else", () => {
    const a = makeActivity({
      activityType: "group_unarchived",
      actorUserId: "u6",
      actorUserName: "Eve",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve unarchived");
  });

  it("returns title without group name for group_unarchived when groupName is null", () => {
    const a = makeActivity({
      activityType: "group_unarchived",
      actorUserId: "u6",
      actorUserName: "Eve",
      details: { action: "unarchived", groupName: "Road Trip" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve unarchived");
  });

  // group_deleted
  it("returns 'You deleted' for group_deleted by current user", () => {
    const a = makeActivity({
      activityType: "group_deleted",
      actorUserId: "me",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("You deleted");
  });

  it("returns 'Eve deleted' for group_deleted by someone else", () => {
    const a = makeActivity({
      activityType: "group_deleted",
      actorUserId: "u6",
      actorUserName: "Eve",
      groupName: "Trip to Paris",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve deleted");
  });

  it("returns title without group name for group_deleted when groupName is null", () => {
    const a = makeActivity({
      activityType: "group_deleted",
      actorUserId: "u6",
      actorUserName: "Eve",
      details: { groupName: "Road Trip" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve deleted");
  });

  // Fallback for unknown types
  it("returns fallback format for unknown activity type", () => {
    const a = makeActivity({
      activityType: "some_future_type",
      actorUserId: "u7",
      actorUserName: "Frank",
    });
    expect(formatActivityTitle(a, "me")).toBe("Frank: Some future type");
  });

  it("returns 'You left' for member_left when current user is actor", () => {
    const a = makeActivity({
      activityType: "member_left",
      actorUserId: "me",
      groupName: "Beach Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("You left");
  });

  it("returns 'You removed {name}' for member_removed with details", () => {
    const a = makeActivity({
      activityType: "member_removed",
      actorUserId: "me",
      details: { removedMemberName: "Charlie" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You removed Charlie");
  });

  it("returns 'Someone removed a member' when member_removed has no details", () => {
    const a = makeActivity({
      activityType: "member_removed",
      actorUserName: "Alice",
      actorUserId: "u9",
    });
    expect(formatActivityTitle(a, "me")).toBe("Alice removed a member");
  });

  it("falls back to targetUserName in member_removed details", () => {
    const a = makeActivity({
      activityType: "member_removed",
      actorUserId: "me",
      details: { targetUserName: "Dan" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You removed Dan");
  });

  it("returns 'You: ...' for truly unknown activity type", () => {
    const a = makeActivity({
      activityType: "payment_refunded",
      actorUserId: "me",
    });
    expect(formatActivityTitle(a, "me")).toBe("You: Payment refunded");
  });

  // Actor name fallbacks
  it("uses actorGuestName when actorUserName is null", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u8",
      actorGuestName: "GuestBob",
      details: { description: "Tacos" },
    });
    expect(formatActivityTitle(a, "me")).toBe("GuestBob added Tacos");
  });

  it("uses 'Someone' when both actor names are null", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Pizza" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Someone added Pizza");
  });

  // No description fallback
  it("returns 'You added an expense' when description is missing", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "me",
      details: {},
    });
    expect(formatActivityTitle(a, "me")).toBe("You added an expense");
  });

  // Null/undefined currentUserId
  it("never shows 'You' when currentUserId is null", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u1",
      actorUserName: "Alice",
      details: { description: "Dinner" },
    });
    expect(formatActivityTitle(a, null)).toBe("Alice added Dinner");
  });

  it("never shows 'You' when currentUserId is undefined", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u1",
      actorUserName: "Alice",
      details: { description: "Dinner" },
    });
    expect(formatActivityTitle(a, undefined)).toBe("Alice added Dinner");
  });

  // Prefers newDescription over description
  it("prefers newDescription over description for expense_created", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u1",
      actorUserName: "Alice",
      details: { description: "Old Name", newDescription: "New Name" },
    });
    expect(formatActivityTitle(a, "me")).toBe("Alice added New Name");
  });

  // --- includeGroupName option ---

  it("appends group name for expense_created when includeGroupName is true", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      groupName: "Party",
      details: { description: "Pizza" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("You added Pizza in Party");
  });

  it("appends group name for expense_updated when includeGroupName is true", () => {
    const a = makeActivity({
      activityType: "expense_updated",
      actorUserId: "u1",
      actorUserName: "Bob",
      groupName: "Trip",
      details: { newDescription: "Lunch" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("Bob updated Lunch in Trip");
  });

  it("appends group name for expense_deleted when includeGroupName is true", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      actorUserId: "u1",
      actorUserName: "Alice",
      groupName: "Roommates",
      details: { description: "Coffee" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("Alice deleted Coffee in Roommates");
  });

  it("appends group name for settlement_created when includeGroupName is true", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      groupName: "Vacation",
      details: { payeeUserId: "u2", payeeUserName: "Bob" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("You settled up with Bob in Vacation");
  });

  it("appends group name for settlement_created with no payee when includeGroupName is true", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      groupName: "Vacation",
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("You settled up in Vacation");
  });

  it("does not append group name when flag is omitted (backward compat)", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      groupName: "Party",
      details: { description: "Pizza" },
    });
    expect(formatActivityTitle(a, "me")).toBe("You added Pizza");
  });

  it("does not append group name when flag is false", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      groupName: "Party",
      details: { description: "Pizza" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: false })).toBe("You added Pizza");
  });

  it("falls back to details.groupName when groupName is missing", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u1",
      actorUserName: "Alice",
      details: { description: "Dinner", groupName: "Fallback Group" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("Alice added Dinner in Fallback Group");
  });

  it("does not append suffix when no group name is available", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "u1",
      actorUserName: "Alice",
      details: { description: "Dinner" },
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("Alice added Dinner");
  });

  it("does not include group name in title for member_joined even with includeGroupName", () => {
    const a = makeActivity({
      activityType: "member_joined",
      actorUserId: "u1",
      actorUserName: "Dave",
      groupName: "Road Trip",
    });
    // member_joined shows group name as subtitle, not in title
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("Dave joined");
  });

  it("appends group name for expense with no description", () => {
    const a = makeActivity({
      activityType: "expense_created",
      actorUserId: "me",
      actorUserName: "Ajay",
      groupName: "Party",
    });
    expect(formatActivityTitle(a, "me", { includeGroupName: true })).toBe("You added an expense in Party");
  });
});

// ---------------------------------------------------------------------------
// resolveActivityGroupName
// ---------------------------------------------------------------------------

describe("resolveActivityGroupName", () => {
  it("returns groupName when present on activity", () => {
    const a = { groupName: "Trip", details: {} } as unknown as ActivityLogDto;
    expect(resolveActivityGroupName(a)).toBe("Trip");
  });

  it("falls back to details.groupName when groupName is null", () => {
    const a = { groupName: null, details: { groupName: "Fallback Group" } } as unknown as ActivityLogDto;
    expect(resolveActivityGroupName(a)).toBe("Fallback Group");
  });

  it("returns null when both are absent", () => {
    const a = { groupName: null, details: {} } as unknown as ActivityLogDto;
    expect(resolveActivityGroupName(a)).toBeNull();
  });

  it("returns null for empty strings", () => {
    const a = { groupName: "", details: { groupName: "" } } as unknown as ActivityLogDto;
    expect(resolveActivityGroupName(a)).toBeNull();
  });

  it("returns null when details is undefined", () => {
    const a = { groupName: null } as unknown as ActivityLogDto;
    expect(resolveActivityGroupName(a)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatActivityInvolvement
// ---------------------------------------------------------------------------

describe("formatActivityInvolvement", () => {
  it("returns null for non-expense activity types", () => {
    const a = makeActivity({ activityType: "settlement_created" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for member_joined", () => {
    const a = makeActivity({ activityType: "member_joined" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for member_added", () => {
    const a = makeActivity({ activityType: "member_added" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for member_joined_via_invite", () => {
    const a = makeActivity({ activityType: "member_joined_via_invite" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for group_created", () => {
    const a = makeActivity({ activityType: "group_created" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for group_archived", () => {
    const a = makeActivity({ activityType: "group_archived" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for group_unarchived", () => {
    const a = makeActivity({ activityType: "group_unarchived" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for group_deleted", () => {
    const a = makeActivity({ activityType: "group_deleted" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null for group_updated", () => {
    const a = makeActivity({ activityType: "group_updated" });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns null when involvedCount is missing (old BE data)", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Dinner", amountCents: 5000 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: null, color: null });
  });

  it("returns 'Not involved' when yourShareCents is absent", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Dinner", amountCents: 5000, involvedCount: 3 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "Not involved", color: "muted" });
  });

  // --- Payer: "you lent" (success) ---
  it("returns 'you lent' when user is payer (yourPaidCents > 0)", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Dinner", amountCents: 4500, involvedCount: 2, yourShareCents: 2250, yourPaidCents: 4500 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you lent", color: "success", amountCents: 2250 });
  });

  // --- Non-payer: "you borrowed" (destructive) ---
  it("returns 'you borrowed' when user is non-payer (yourPaidCents = 0)", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Dinner", amountCents: 4500, involvedCount: 2, yourShareCents: 2250, yourPaidCents: 0 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 2250 });
  });

  // --- Fallback: no yourPaidCents field → treat as non-payer ---
  it("returns 'you borrowed' when yourPaidCents is absent (backend fallback)", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Dinner", amountCents: 6000, involvedCount: 3, yourShareCents: 2000 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 2000 });
  });

  it("formats small cents correctly as borrowed", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { amountCents: 300, involvedCount: 2, yourShareCents: 150 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 150 });
  });

  it("handles yourShareCents of 0 as borrowed with 0 amount", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { amountCents: 5000, involvedCount: 2, yourShareCents: 0 },
    });
    // 0 is falsy but !== undefined, so should show as involved (borrowed $0)
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 0 });
  });

  it("works for expense_updated as borrowed", () => {
    const a = makeActivity({
      activityType: "expense_updated",
      details: { newDescription: "Lunch", involvedCount: 4, yourShareCents: 1250 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 1250 });
  });

  it("works for expense_deleted not involved", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      details: { description: "Coffee", involvedCount: 2 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "Not involved", color: "muted" });
  });

  it("returns borrowed for expense_deleted when involved", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      details: { description: "Coffee", involvedCount: 2, yourShareCents: 350 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 350 });
  });

  it("handles penny amounts", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { involvedCount: 3, yourShareCents: 1 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 1 });
  });

  it("handles large amounts", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { involvedCount: 5, yourShareCents: 150000 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you borrowed", color: "destructive", amountCents: 150000 });
  });

  it("payer lent amount = paid - share", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { involvedCount: 3, yourShareCents: 1500, yourPaidCents: 4500 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you lent", color: "success", amountCents: 3000 });
  });

  it("payer who paid exactly their share lends $0", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { involvedCount: 2, yourShareCents: 2500, yourPaidCents: 2500 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "you lent", color: "success", amountCents: 0 });
  });
});

// ---------------------------------------------------------------------------
// formatCentsForInvolvement
// ---------------------------------------------------------------------------
describe("formatCentsForInvolvement", () => {
  it("formats cents as dollars without sign prefix", () => {
    expect(formatCentsForInvolvement(2250)).toBe("$22.50");
  });

  it("formats zero", () => {
    expect(formatCentsForInvolvement(0)).toBe("$0.00");
  });

  it("handles negative input via abs", () => {
    expect(formatCentsForInvolvement(-500)).toBe("$5.00");
  });

  it("formats with explicit currency GBP", () => {
    expect(formatCentsForInvolvement(2500, "GBP")).toBe("£25.00");
  });

  it("formats with explicit currency EUR", () => {
    expect(formatCentsForInvolvement(1050, "EUR")).toBe("€10.50");
  });

  it("defaults to USD when no currency provided", () => {
    expect(formatCentsForInvolvement(100)).toBe("$1.00");
  });
});

// ---------------------------------------------------------------------------
// shortenName
// ---------------------------------------------------------------------------
describe("shortenName", () => {
  it("shortens two-part name to first + last initial", () => {
    expect(shortenName("Ajay Wadhara")).toBe("Ajay W.");
  });

  it("returns single name unchanged", () => {
    expect(shortenName("Ajay")).toBe("Ajay");
  });

  it("shortens multi-part name using first + last initial", () => {
    expect(shortenName("Ajay Kumar Wadhara")).toBe("Ajay W.");
  });

  it("returns empty string for empty input", () => {
    expect(shortenName("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// computeExpenseCardDisplay
// ---------------------------------------------------------------------------
describe("computeExpenseCardDisplay", () => {
  const fmt = (c: number) => `£${(c / 100).toFixed(2)}`;

  it("shows 'You paid' and 'you lent' when current user is the payer", () => {
    const expense = {
      payers: [{ user: { id: "u1", name: "Ajay Wadhara" }, amountPaid: 10000 }],
      splits: [
        { user: { id: "u1" }, splitAmount: 5000 },
        { user: { id: "u2" }, splitAmount: 5000 },
      ],
      amountCents: 10000,
    };
    const result = computeExpenseCardDisplay(expense, "u1", [], null, fmt);
    expect(result.subtitle).toBe("You paid £100.00");
    expect(result.rightLabel).toBe("you lent");
    expect(result.rightAmountCents).toBe(5000);
    expect(result.rightColor).toBe("success");
  });

  it("shows shortened payer name and 'you borrowed' when current user only has a split", () => {
    const expense = {
      payers: [{ user: { id: "u1", name: "Ajay Wadhara" }, amountPaid: 10000 }],
      splits: [
        { user: { id: "u1" }, splitAmount: 5000 },
        { user: { id: "u2" }, splitAmount: 5000 },
      ],
      amountCents: 10000,
    };
    const result = computeExpenseCardDisplay(expense, "u2", [], null, fmt);
    expect(result.subtitle).toBe("Ajay W. paid £100.00");
    expect(result.rightLabel).toBe("you borrowed");
    expect(result.rightAmountCents).toBe(5000);
    expect(result.rightColor).toBe("destructive");
  });

  it("shows 'not involved' when current user is not in payers or splits", () => {
    const expense = {
      payers: [{ user: { id: "u1", name: "Ajay Wadhara" }, amountPaid: 10000 }],
      splits: [{ user: { id: "u1" }, splitAmount: 10000 }],
      amountCents: 10000,
    };
    const result = computeExpenseCardDisplay(expense, "u3", [], null, fmt);
    expect(result.subtitle).toBe("Ajay W. paid £100.00");
    expect(result.rightLabel).toBe("not involved");
    expect(result.rightAmountCents).toBeNull();
    expect(result.rightColor).toBe("muted");
  });

  it("handles multi-payer where current user is one payer", () => {
    const expense = {
      payers: [
        { user: { id: "u1", name: "Alice Smith" }, amountPaid: 6000 },
        { user: { id: "u2", name: "Bob Jones" }, amountPaid: 4000 },
      ],
      splits: [
        { user: { id: "u1" }, splitAmount: 5000 },
        { user: { id: "u2" }, splitAmount: 5000 },
      ],
      amountCents: 10000,
    };
    const result = computeExpenseCardDisplay(expense, "u2", [], null, fmt);
    // u2 paid 4000, split 5000 — but they paid, so "you lent" = 4000 - 5000 = -1000
    expect(result.rightLabel).toBe("you lent");
    expect(result.rightAmountCents).toBe(-1000);
    expect(result.rightColor).toBe("success");
  });

  it("returns lent 0 when user paid exactly their share", () => {
    const expense = {
      payers: [{ user: { id: "u1", name: "Ajay" }, amountPaid: 5000 }],
      splits: [
        { user: { id: "u1" }, splitAmount: 5000 },
        { user: { id: "u2" }, splitAmount: 5000 },
      ],
      amountCents: 10000,
    };
    const result = computeExpenseCardDisplay(expense, "u1", [], null, fmt);
    expect(result.rightLabel).toBe("you lent");
    expect(result.rightAmountCents).toBe(0);
    expect(result.rightColor).toBe("success");
  });

  it("uses guest user name for payer", () => {
    const expense = {
      payers: [{ guestUser: { id: "g1", name: "Guest User" }, amountPaid: 3000 }],
      splits: [{ user: { id: "u1" }, splitAmount: 3000 }],
      amountCents: 3000,
    };
    const result = computeExpenseCardDisplay(expense, "u1", [], null, fmt);
    expect(result.subtitle).toBe("Guest U. paid £30.00");
    expect(result.rightLabel).toBe("you borrowed");
    expect(result.rightAmountCents).toBe(3000);
  });

  it("handles no payers gracefully", () => {
    const expense = {
      payers: [],
      splits: [{ user: { id: "u1" }, splitAmount: 1000 }],
      amountCents: 1000,
    };
    const result = computeExpenseCardDisplay(expense, "u1", [], null, fmt);
    expect(result.subtitle).toBe("Someone paid £10.00");
    expect(result.rightLabel).toBe("you borrowed");
  });

  it("treats null currentUserId as not involved", () => {
    const expense = {
      payers: [{ user: { id: "u1", name: "Ajay Wadhara" }, amountPaid: 5000 }],
      splits: [{ user: { id: "u1" }, splitAmount: 5000 }],
      amountCents: 5000,
    };
    const result = computeExpenseCardDisplay(expense, null, [], null, fmt);
    expect(result.rightLabel).toBe("not involved");
    expect(result.rightAmountCents).toBeNull();
    expect(result.rightColor).toBe("muted");
  });
});
