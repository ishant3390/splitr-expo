import {
  cn,
  centsToAmount,
  amountToCents,
  formatCurrency,
  formatCents,
  formatDate,
  formatMemberSince,
  formatRelativeTime,
  getInitials,
  extractInviteCode,
  getCurrencySymbol,
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

describe("formatMemberSince", () => {
  it("formats date as 'Mon YYYY'", () => {
    expect(formatMemberSince("2026-03-15T12:00:00Z")).toBe("Mar 2026");
    expect(formatMemberSince("2025-01-01T00:00:00Z")).toBe("Jan 2025");
    expect(formatMemberSince("2024-12-25T18:30:00Z")).toBe("Dec 2024");
  });

  it("returns dash for invalid date", () => {
    expect(formatMemberSince("not-a-date")).toBe("—");
    expect(formatMemberSince("")).toBe("—");
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

describe("extractInviteCode", () => {
  it("passes through raw code", () => {
    expect(extractInviteCode("abc123")).toBe("abc123");
  });

  it("extracts code from full invite URL", () => {
    expect(extractInviteCode("https://splitr.ai/invite/abc123")).toBe("abc123");
  });

  it("extracts code from join URL", () => {
    expect(extractInviteCode("https://splitr.ai/join/abc123")).toBe("abc123");
  });

  it("extracts code from localhost URL", () => {
    expect(extractInviteCode("http://localhost:8081/invite/abc123")).toBe("abc123");
  });

  it("trims whitespace", () => {
    expect(extractInviteCode("  abc123  ")).toBe("abc123");
  });

  it("returns empty string for empty input", () => {
    expect(extractInviteCode("")).toBe("");
  });

  it("handles codes with hyphens and underscores", () => {
    expect(extractInviteCode("https://splitr.ai/invite/a-b_c")).toBe("a-b_c");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-03-15T12:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'Just now' for less than 1 minute ago", () => {
    expect(formatRelativeTime("2026-03-15T11:59:45Z")).toBe("Just now");
  });

  it("returns '1 min ago' for exactly 1 minute ago", () => {
    expect(formatRelativeTime("2026-03-15T11:59:00Z")).toBe("1 min ago");
  });

  it("returns 'X min ago' for minutes", () => {
    expect(formatRelativeTime("2026-03-15T11:55:00Z")).toBe("5 min ago");
    expect(formatRelativeTime("2026-03-15T11:21:00Z")).toBe("39 min ago");
  });

  it("returns '1 hour ago' for singular hour", () => {
    expect(formatRelativeTime("2026-03-15T11:00:00Z")).toBe("1 hour ago");
  });

  it("returns 'X hours ago' for plural hours", () => {
    expect(formatRelativeTime("2026-03-15T10:00:00Z")).toBe("2 hours ago");
    expect(formatRelativeTime("2026-03-15T00:30:00Z")).toBe("11 hours ago");
  });

  it("returns 'Yesterday' for 1 day ago", () => {
    expect(formatRelativeTime("2026-03-14T12:00:00Z")).toBe("Yesterday");
  });

  it("returns 'X days ago' for 2-6 days", () => {
    expect(formatRelativeTime("2026-03-12T12:00:00Z")).toBe("3 days ago");
    expect(formatRelativeTime("2026-03-09T12:00:00Z")).toBe("6 days ago");
  });

  it("returns 'Last week' for 7-13 days ago", () => {
    expect(formatRelativeTime("2026-03-08T12:00:00Z")).toBe("Last week");
    expect(formatRelativeTime("2026-03-02T12:00:00Z")).toBe("Last week");
  });

  it("returns '2 weeks ago' for 14-20 days ago", () => {
    expect(formatRelativeTime("2026-03-01T12:00:00Z")).toBe("2 weeks ago");
    expect(formatRelativeTime("2026-02-23T12:00:00Z")).toBe("2 weeks ago");
  });

  it("returns 'Last month' for 21-59 days ago", () => {
    expect(formatRelativeTime("2026-02-22T12:00:00Z")).toBe("Last month");
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("Last month");
  });

  it("returns short date for 60+ days ago", () => {
    expect(formatRelativeTime("2026-01-14T12:00:00Z")).toBe("Jan 14");
    expect(formatRelativeTime("2025-06-01T12:00:00Z")).toBe("Jun 1");
  });

  it("returns short date for future dates", () => {
    expect(formatRelativeTime("2026-03-20T12:00:00Z")).toBe("Mar 20");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatRelativeTime("not-a-date")).toBe("");
    expect(formatRelativeTime("")).toBe("");
  });
});


describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns symbol for known currencies", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("defaults to USD symbol when no argument given", () => {
    expect(getCurrencySymbol()).toBe("$");
  });

  it("returns currency code as fallback for unknown currency", () => {
    const result = getCurrencySymbol("XYZ");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
