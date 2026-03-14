import {
  getCategoryEmoji,
  initSplitValues,
  calculateEqualSplit,
  validatePercentageSplit,
  validateFixedSplit,
  getPaymentMethodLabel,
  getPaymentMethodEmoji,
  dedupeMembers,
  aggregateByPerson,
  aggregateByCategory,
  aggregateByMonth,
  filterExpenses,
  sortExpenses,
  resolvePayerName,
  computeBalancesFromMembers,
} from "../../lib/screen-helpers";

// ---------------------------------------------------------------------------
// getCategoryEmoji
// ---------------------------------------------------------------------------
describe("getCategoryEmoji", () => {
  it("returns emoji for a known icon name", () => {
    expect(getCategoryEmoji("restaurant")).toBe("🍕");
    expect(getCategoryEmoji("coffee")).toBe("☕");
    expect(getCategoryEmoji("flight")).toBe("✈️");
    expect(getCategoryEmoji("shopping")).toBe("🛍️");
    expect(getCategoryEmoji("hotel")).toBe("🏨");
  });

  it("is case-insensitive for known icons", () => {
    expect(getCategoryEmoji("RESTAURANT")).toBe("🍕");
    expect(getCategoryEmoji("Coffee")).toBe("☕");
    expect(getCategoryEmoji("FLIGHT")).toBe("✈️");
  });

  it("returns default emoji for undefined/null input", () => {
    expect(getCategoryEmoji(undefined)).toBe("📋");
    expect(getCategoryEmoji("")).toBe("📋");
  });

  it("passes through an already-emoji string", () => {
    expect(getCategoryEmoji("🎉")).toBe("🎉");
    expect(getCategoryEmoji("🍕")).toBe("🍕");
    expect(getCategoryEmoji("💰")).toBe("💰");
  });

  it("returns default emoji for an unknown icon name", () => {
    expect(getCategoryEmoji("nonexistent_icon")).toBe("📋");
    expect(getCategoryEmoji("xyz")).toBe("📋");
  });
});

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
// getPaymentMethodLabel
// ---------------------------------------------------------------------------
describe("getPaymentMethodLabel", () => {
  it("returns label and emoji for cash", () => {
    const result = getPaymentMethodLabel("cash");
    expect(result).toMatchObject({ label: "Cash", emoji: "💵" });
  });

  it("returns label and emoji for venmo", () => {
    const result = getPaymentMethodLabel("venmo");
    expect(result).toMatchObject({ label: "Venmo", emoji: "💜" });
  });

  it("returns label and emoji for zelle", () => {
    const result = getPaymentMethodLabel("zelle");
    expect(result).toMatchObject({ label: "Zelle", emoji: "⚡" });
  });

  it("returns label and emoji for paypal", () => {
    const result = getPaymentMethodLabel("paypal");
    expect(result).toMatchObject({ label: "PayPal", emoji: "🅿️" });
  });

  it("returns label and emoji for bank_transfer", () => {
    const result = getPaymentMethodLabel("bank_transfer");
    expect(result).toMatchObject({ label: "Bank", emoji: "🏦" });
  });

  it("returns label and emoji for other", () => {
    const result = getPaymentMethodLabel("other");
    expect(result).toMatchObject({ label: "Other", emoji: "💳" });
  });

  it("returns undefined for unknown key", () => {
    expect(getPaymentMethodLabel("bitcoin")).toBeUndefined();
    expect(getPaymentMethodLabel("")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getPaymentMethodEmoji
// ---------------------------------------------------------------------------
describe("getPaymentMethodEmoji", () => {
  it("returns correct emoji for known keys", () => {
    expect(getPaymentMethodEmoji("cash")).toBe("💵");
    expect(getPaymentMethodEmoji("venmo")).toBe("💜");
    expect(getPaymentMethodEmoji("bank_transfer")).toBe("🏦");
  });

  it("returns default emoji for unknown key", () => {
    expect(getPaymentMethodEmoji("bitcoin")).toBe("💳");
  });

  it("returns default emoji for undefined", () => {
    expect(getPaymentMethodEmoji(undefined)).toBe("💳");
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
