import {
  initSplitValues,
  calculateEqualSplit,
  validatePercentageSplit,
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
  it("returns 'You settled up' for settlement_created by current user", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "me",
    });
    expect(formatActivityTitle(a, "me")).toBe("You settled up");
  });

  it("returns 'Carol settled up' for settlement_created by someone else", () => {
    const a = makeActivity({
      activityType: "settlement_created",
      actorUserId: "u4",
      actorUserName: "Carol",
    });
    expect(formatActivityTitle(a, "me")).toBe("Carol settled up");
  });

  // member_joined
  it("returns 'You joined Road Trip' for member_joined by current user", () => {
    const a = makeActivity({
      activityType: "member_joined",
      actorUserId: "me",
      groupName: "Road Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("You joined Road Trip");
  });

  it("returns 'Dave joined Road Trip' for member_joined by someone else", () => {
    const a = makeActivity({
      activityType: "member_joined",
      actorUserId: "u5",
      actorUserName: "Dave",
      groupName: "Road Trip",
    });
    expect(formatActivityTitle(a, "me")).toBe("Dave joined Road Trip");
  });

  // group_created
  it("returns 'You created Weekend' for group_created by current user", () => {
    const a = makeActivity({
      activityType: "group_created",
      actorUserId: "me",
      groupName: "Weekend",
    });
    expect(formatActivityTitle(a, "me")).toBe("You created Weekend");
  });

  it("returns 'Eve created Weekend' for group_created by someone else", () => {
    const a = makeActivity({
      activityType: "group_created",
      actorUserId: "u6",
      actorUserName: "Eve",
      groupName: "Weekend",
    });
    expect(formatActivityTitle(a, "me")).toBe("Eve created Weekend");
  });

  // Fallback for unknown types
  it("returns fallback format for unknown activity type", () => {
    const a = makeActivity({
      activityType: "group_updated",
      actorUserId: "u7",
      actorUserName: "Frank",
    });
    expect(formatActivityTitle(a, "me")).toBe("Frank: Group updated");
  });

  it("returns 'You: ...' for unknown type when current user is actor", () => {
    const a = makeActivity({
      activityType: "member_left",
      actorUserId: "me",
    });
    expect(formatActivityTitle(a, "me")).toBe("You: Member left");
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

  it("returns null for group_created", () => {
    const a = makeActivity({ activityType: "group_created" });
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

  it("returns formatted share when yourShareCents is present", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { description: "Dinner", amountCents: 6000, involvedCount: 3, yourShareCents: 2000 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$20.00", color: "teal" });
  });

  it("formats small cents correctly", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { amountCents: 300, involvedCount: 2, yourShareCents: 150 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$1.50", color: "teal" });
  });

  it("handles yourShareCents of 0 as involved", () => {
    // Edge case: 0 cents share (e.g., payer pays full, split is 0 for them)
    // 0 is a number so it IS present — user is technically involved
    const a = makeActivity({
      activityType: "expense_created",
      details: { amountCents: 5000, involvedCount: 2, yourShareCents: 0 },
    });
    // 0 is falsy but !== undefined, so should show as involved
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$0.00", color: "teal" });
  });

  it("works for expense_updated", () => {
    const a = makeActivity({
      activityType: "expense_updated",
      details: { newDescription: "Lunch", involvedCount: 4, yourShareCents: 1250 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$12.50", color: "teal" });
  });

  it("works for expense_deleted", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      details: { description: "Coffee", involvedCount: 2 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "Not involved", color: "muted" });
  });

  it("returns share for expense_deleted when involved", () => {
    const a = makeActivity({
      activityType: "expense_deleted",
      details: { description: "Coffee", involvedCount: 2, yourShareCents: 350 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$3.50", color: "teal" });
  });

  it("handles penny amounts", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { involvedCount: 3, yourShareCents: 1 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$0.01", color: "teal" });
  });

  it("handles large amounts", () => {
    const a = makeActivity({
      activityType: "expense_created",
      details: { involvedCount: 5, yourShareCents: 150000 },
    });
    expect(formatActivityInvolvement(a)).toEqual({ text: "-$1500.00", color: "teal" });
  });
});
