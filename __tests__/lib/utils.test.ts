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
  getInviteBaseUrl,
  getInviteUrl,
  getCurrencySymbol,
  sanitizeAmountInput,
  sanitizePercentInput,
  parseAmountInputToCents,
  getMemberAvatarUrl,
  getFxDisplayAmounts,
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

  it("extracts code from dev invite URL", () => {
    expect(extractInviteCode("https://dev.splitr.ai/invite/abc123")).toBe("abc123");
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

describe("getInviteBaseUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_SITE_URL;
    delete process.env.EXPO_PUBLIC_APP_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses explicit invite base URL when configured", () => {
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "https://dev.splitr.ai";
    expect(getInviteBaseUrl()).toBe("https://dev.splitr.ai");
  });

  it("uses dev invite origin when API points to dev backend", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api-dev.splitr.ai/api";
    expect(getInviteBaseUrl()).toBe("https://dev.splitr.ai");
  });

  it("defaults to production origin", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:8085/api";
    expect(getInviteBaseUrl()).toBe("https://splitr.ai");
  });
});

describe("getInviteUrl", () => {
  it("builds invite URL from selected base URL", () => {
    expect(getInviteUrl("abc123", "https://dev.splitr.ai")).toBe("https://dev.splitr.ai/invite/abc123");
  });

  it("encodes invite code safely", () => {
    expect(getInviteUrl("a b/c", "https://splitr.ai")).toBe("https://splitr.ai/invite/a%20b%2Fc");
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

describe("sanitizeAmountInput", () => {
  // Basic numeric input
  it("passes through simple integers", () => {
    expect(sanitizeAmountInput("5")).toBe("5");
    expect(sanitizeAmountInput("123")).toBe("123");
    expect(sanitizeAmountInput("0")).toBe("0");
  });

  it("passes through valid decimal amounts", () => {
    expect(sanitizeAmountInput("1.50")).toBe("1.50");
    expect(sanitizeAmountInput("25.99")).toBe("25.99");
    expect(sanitizeAmountInput("0.01")).toBe("0.01");
  });

  it("allows partial decimal input (typing in progress)", () => {
    expect(sanitizeAmountInput("1.")).toBe("1.");
    expect(sanitizeAmountInput("1.5")).toBe("1.5");
    expect(sanitizeAmountInput(".5")).toBe(".5");
    expect(sanitizeAmountInput(".")).toBe(".");
  });

  // THE BUG: typing a 3rd decimal digit must preserve the existing value
  it("truncates to 2 decimal places without losing integer part", () => {
    expect(sanitizeAmountInput("1.777")).toBe("1.77");
    expect(sanitizeAmountInput("1.999")).toBe("1.99");
    expect(sanitizeAmountInput("25.123")).toBe("25.12");
    expect(sanitizeAmountInput("0.001")).toBe("0.00");
  });

  it("handles rapid typing beyond 2 decimals", () => {
    // Simulates: user has "1.77" and types "7" → TextInput sends "1.777"
    expect(sanitizeAmountInput("1.777")).toBe("1.77");
    // Simulates: user has "99.99" and types "9" → TextInput sends "99.999"
    expect(sanitizeAmountInput("99.999")).toBe("99.99");
  });

  it("handles many decimal digits", () => {
    expect(sanitizeAmountInput("1.123456789")).toBe("1.12");
  });

  // Non-numeric character stripping
  it("strips alphabetic characters", () => {
    expect(sanitizeAmountInput("abc")).toBe("");
    expect(sanitizeAmountInput("12abc34")).toBe("1234");
    expect(sanitizeAmountInput("$50")).toBe("50");
    expect(sanitizeAmountInput("£25.50")).toBe("25.50");
    expect(sanitizeAmountInput("GBP100")).toBe("100");
  });

  it("strips currency symbols and special characters", () => {
    expect(sanitizeAmountInput("$1,234.56")).toBe("1234.56");
    expect(sanitizeAmountInput("€99.99")).toBe("99.99");
    expect(sanitizeAmountInput("¥1000")).toBe("1000");
  });

  // Multiple decimal points
  it("allows only one decimal point", () => {
    expect(sanitizeAmountInput("1.2.3")).toBe("1.23");
    expect(sanitizeAmountInput("1..5")).toBe("1.5");
    expect(sanitizeAmountInput("...")).toBe(".");
    expect(sanitizeAmountInput("1.2.3.4")).toBe("1.23");
  });

  // Empty and edge cases
  it("returns empty string for empty input", () => {
    expect(sanitizeAmountInput("")).toBe("");
  });

  it("returns empty string for all non-numeric input", () => {
    expect(sanitizeAmountInput("abc")).toBe("");
    expect(sanitizeAmountInput("---")).toBe("");
    expect(sanitizeAmountInput("   ")).toBe("");
  });

  it("handles leading zeros", () => {
    expect(sanitizeAmountInput("007")).toBe("007");
    expect(sanitizeAmountInput("00.50")).toBe("00.50");
  });

  // Sequential typing simulation (the key regression scenario)
  it("simulates sequential typing: 1 → 1. → 1.7 → 1.77 → 1.77 (3rd digit rejected)", () => {
    let amount = "";
    amount = sanitizeAmountInput("1"); // type "1"
    expect(amount).toBe("1");
    amount = sanitizeAmountInput("1."); // type "."
    expect(amount).toBe("1.");
    amount = sanitizeAmountInput("1.7"); // type "7"
    expect(amount).toBe("1.7");
    amount = sanitizeAmountInput("1.77"); // type "7"
    expect(amount).toBe("1.77");
    // User types another "7" — TextInput would send "1.777"
    amount = sanitizeAmountInput("1.777");
    expect(amount).toBe("1.77"); // Must stay "1.77", NOT become "7"
  });

  it("simulates sequential typing with backspace and retype", () => {
    let amount = sanitizeAmountInput("25.50");
    expect(amount).toBe("25.50");
    // User backspaces the "0" → "25.5"
    amount = sanitizeAmountInput("25.5");
    expect(amount).toBe("25.5");
    // User types "3" → "25.53"
    amount = sanitizeAmountInput("25.53");
    expect(amount).toBe("25.53");
  });
});

describe("sanitizePercentInput", () => {
  it("passes through valid percentages unchanged", () => {
    expect(sanitizePercentInput("50")).toBe("50");
    expect(sanitizePercentInput("99.5")).toBe("99.5");
    expect(sanitizePercentInput("100")).toBe("100");
    expect(sanitizePercentInput("0")).toBe("0");
  });

  it("caps values above 100", () => {
    expect(sanitizePercentInput("101")).toBe("100");
    expect(sanitizePercentInput("150.5")).toBe("100");
  });

  it("strips non-numeric characters", () => {
    expect(sanitizePercentInput("abc")).toBe("");
  });

  it("limits to 2 decimal places", () => {
    expect(sanitizePercentInput("50.123")).toBe("50.12");
  });

  it("handles empty string", () => {
    expect(sanitizePercentInput("")).toBe("");
  });
});

describe("parseAmountInputToCents", () => {
  it("parses integer and decimal inputs", () => {
    expect(parseAmountInputToCents("1")).toBe(100);
    expect(parseAmountInputToCents("1.23")).toBe(123);
    expect(parseAmountInputToCents("0.01")).toBe(1);
    expect(parseAmountInputToCents("0")).toBe(0);
    expect(parseAmountInputToCents(".5")).toBe(50);
    expect(parseAmountInputToCents("12.")).toBe(1200);
  });

  it("handles leading/trailing whitespace", () => {
    expect(parseAmountInputToCents(" 10.50 ")).toBe(1050);
  });

  it("returns null for invalid precision or malformed values", () => {
    expect(parseAmountInputToCents("1.234")).toBeNull();
    expect(parseAmountInputToCents("1..2")).toBeNull();
    expect(parseAmountInputToCents("1.2.3")).toBeNull();
    expect(parseAmountInputToCents("-5")).toBeNull();
    expect(parseAmountInputToCents("+3.50")).toBeNull();
    expect(parseAmountInputToCents("1e5")).toBeNull();
    expect(parseAmountInputToCents("abc")).toBeNull();
    expect(parseAmountInputToCents("")).toBeNull();
  });
});

describe("getMemberAvatarUrl", () => {
  it("returns undefined when user is undefined", () => {
    expect(getMemberAvatarUrl(undefined)).toBeUndefined();
  });

  it("returns undefined when user has no image fields", () => {
    expect(getMemberAvatarUrl({})).toBeUndefined();
  });

  it("prefers profileImageUrl over avatarUrl", () => {
    expect(
      getMemberAvatarUrl({
        avatarUrl: "https://clerk.com/avatar.jpg",
        profileImageUrl: "https://s3.aws.com/profile.jpg",
      })
    ).toBe("https://s3.aws.com/profile.jpg");
  });

  it("falls back to avatarUrl when profileImageUrl is missing", () => {
    expect(
      getMemberAvatarUrl({ avatarUrl: "https://clerk.com/avatar.jpg" })
    ).toBe("https://clerk.com/avatar.jpg");
  });

  it("falls back to avatarUrl when profileImageUrl is undefined", () => {
    expect(
      getMemberAvatarUrl({
        avatarUrl: "https://clerk.com/avatar.jpg",
        profileImageUrl: undefined,
      })
    ).toBe("https://clerk.com/avatar.jpg");
  });

  it("sanitizes double-https prefix", () => {
    expect(
      getMemberAvatarUrl({
        profileImageUrl: "https://https://s3.aws.com/profile.jpg",
      })
    ).toBe("https://s3.aws.com/profile.jpg");
  });

  it("sanitizes double-https on avatarUrl fallback", () => {
    expect(
      getMemberAvatarUrl({
        avatarUrl: "https://https://clerk.com/avatar.jpg",
      })
    ).toBe("https://clerk.com/avatar.jpg");
  });
});

describe("getFxDisplayAmounts", () => {
  it("returns primary only when no converted amount is present", () => {
    expect(getFxDisplayAmounts({ amountCents: 5000, currency: "USD" })).toEqual({
      primary: "$50.00",
      secondary: null,
    });
  });

  it("returns secondary from object convertedAmount when currency differs", () => {
    expect(
      getFxDisplayAmounts({
        amountCents: 5000,
        currency: "USD",
        convertedAmount: { amountMinor: 4600, currency: "EUR" },
      })
    ).toEqual({
      primary: "$50.00",
      secondary: "≈ €46.00",
    });
  });

  it("supports numeric convertedAmount with convertedCurrency", () => {
    expect(
      getFxDisplayAmounts({
        amountCents: 3000,
        currency: "USD",
        convertedAmount: 2700,
        convertedCurrency: "GBP",
      })
    ).toEqual({
      primary: "$30.00",
      secondary: "≈ £27.00",
    });
  });

  it("supports convertedAmountCents legacy shape", () => {
    expect(
      getFxDisplayAmounts({
        amountCents: 7000,
        currency: "USD",
        convertedAmountCents: 6400,
        convertedCurrency: "EUR",
      })
    ).toEqual({
      primary: "$70.00",
      secondary: "≈ €64.00",
    });
  });

  it("suppresses secondary when converted currency equals base currency", () => {
    expect(
      getFxDisplayAmounts({
        amountCents: 2500,
        currency: "USD",
        convertedAmountCents: 2500,
        convertedCurrency: "USD",
      })
    ).toEqual({
      primary: "$25.00",
      secondary: null,
    });
  });
});
