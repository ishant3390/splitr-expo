import {
  cn,
  centsToAmount,
  amountToCents,
  formatCurrency,
  formatCents,
  formatDate,
  getInitials,
  categoryIconNames,
  categoryLabels,
} from "@/lib/utils";

describe("centsToAmount", () => {
  it("converts cents to dollars", () => {
    expect(centsToAmount(1500)).toBe(15);
    expect(centsToAmount(0)).toBe(0);
    expect(centsToAmount(99)).toBe(0.99);
    expect(centsToAmount(1)).toBe(0.01);
  });

  it("handles negative amounts", () => {
    expect(centsToAmount(-500)).toBe(-5);
  });
});

describe("amountToCents", () => {
  it("converts dollars to cents", () => {
    expect(amountToCents(15)).toBe(1500);
    expect(amountToCents(0)).toBe(0);
    expect(amountToCents(0.99)).toBe(99);
    expect(amountToCents(0.01)).toBe(1);
  });

  it("rounds floating point correctly", () => {
    // 19.99 * 100 = 1998.9999... without rounding
    expect(amountToCents(19.99)).toBe(1999);
    expect(amountToCents(10.005)).toBe(1001);
  });

  it("handles negative amounts", () => {
    expect(amountToCents(-5)).toBe(-500);
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(15)).toBe("$15.00");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats with specified currency", () => {
    const result = formatCurrency(100, "EUR");
    expect(result).toContain("100");
  });
});

describe("formatCents", () => {
  it("formats cents as currency", () => {
    expect(formatCents(1500)).toBe("$15.00");
    expect(formatCents(99)).toBe("$0.99");
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats large amounts", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
  });
});

describe("formatDate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'Today' for today's date", () => {
    const now = new Date("2026-03-05T12:00:00Z");
    jest.setSystemTime(now);
    expect(formatDate("2026-03-05T10:00:00Z")).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday's date", () => {
    const now = new Date("2026-03-05T12:00:00Z");
    jest.setSystemTime(now);
    expect(formatDate("2026-03-04T10:00:00Z")).toBe("Yesterday");
  });

  it("returns 'X days ago' for dates within a week", () => {
    const now = new Date("2026-03-05T12:00:00Z");
    jest.setSystemTime(now);
    expect(formatDate("2026-03-02T10:00:00Z")).toBe("3 days ago");
  });

  it("returns formatted date for older dates", () => {
    const now = new Date("2026-03-05T12:00:00Z");
    jest.setSystemTime(now);
    const result = formatDate("2026-01-15T10:00:00Z");
    expect(result).toBe("Jan 15");
  });
});

describe("getInitials", () => {
  it("returns initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("limits to 2 characters", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("handles uppercase correctly", () => {
    expect(getInitials("jane doe")).toBe("JD");
  });

  it("handles single character", () => {
    expect(getInitials("?")).toBe("?");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toContain("base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });

  it("handles undefined/null", () => {
    const result = cn("base", undefined, null);
    expect(result).toBe("base");
  });
});

describe("categoryIconNames", () => {
  it("has all expected categories", () => {
    expect(categoryIconNames.food).toBe("Utensils");
    expect(categoryIconNames.transport).toBe("Car");
    expect(categoryIconNames.accommodation).toBe("Home");
    expect(categoryIconNames.entertainment).toBe("Gamepad2");
    expect(categoryIconNames.shopping).toBe("ShoppingBag");
    expect(categoryIconNames.other).toBe("MoreHorizontal");
  });
});

describe("categoryLabels", () => {
  it("has human-readable labels", () => {
    expect(categoryLabels.food).toBe("Food & Drinks");
    expect(categoryLabels.other).toBe("Other");
  });
});
