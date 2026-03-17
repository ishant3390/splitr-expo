import {
  getAvailableProviders,
  getRegionProviderCount,
  getRegionPaymentMethods,
  buildPaymentLink,
  openPaymentLink,
  validatePaymentHandle,
  normalizeHandle,
  CURRENCY_PROVIDERS,
  PROVIDER_INFO,
  type PaymentProvider,
} from "@/lib/payment-links";
import type { PaymentHandles } from "@/lib/types";

// Mock Linking
const mockCanOpenURL = jest.fn(() => Promise.resolve(false));
const mockOpenURL = jest.fn(() => Promise.resolve(true));
jest.mock("react-native", () => ({
  Linking: {
    canOpenURL: (...args: any[]) => mockCanOpenURL(...args),
    openURL: (...args: any[]) => mockOpenURL(...args),
  },
  Platform: { OS: "ios" },
}));

// Mock Clipboard
const mockSetStringAsync = jest.fn(() => Promise.resolve());
jest.mock("expo-clipboard", () => ({
  setStringAsync: (...args: any[]) => mockSetStringAsync(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CURRENCY_PROVIDERS", () => {
  it("maps USD to venmo, paypal, cashapp, zelle", () => {
    expect(CURRENCY_PROVIDERS.USD).toEqual(["venmo", "paypal", "cashapp", "zelle"]);
  });

  it("maps INR to upi, paypal", () => {
    expect(CURRENCY_PROVIDERS.INR).toEqual(["upi", "paypal"]);
  });

  it("maps GBP to paypal, revolut, monzo", () => {
    expect(CURRENCY_PROVIDERS.GBP).toEqual(["paypal", "revolut", "monzo"]);
  });
});

describe("getAvailableProviders", () => {
  it("returns empty when no handles provided", () => {
    expect(getAvailableProviders("USD", null)).toEqual([]);
    expect(getAvailableProviders("USD", undefined)).toEqual([]);
  });

  it("returns empty when handles have no configured providers at all", () => {
    const handles: PaymentHandles = {};
    expect(getAvailableProviders("USD", handles)).toEqual([]);
  });

  it("returns non-region provider as other method when no region match", () => {
    const handles: PaymentHandles = { upiVpa: "test@upi" };
    // UPI is not in USD region, but still returned as an "other method"
    expect(getAvailableProviders("USD", handles)).toEqual(["upi"]);
  });

  it("returns matching providers for USD", () => {
    const handles: PaymentHandles = {
      venmoUsername: "alice",
      paypalUsername: "alice123",
    };
    expect(getAvailableProviders("USD", handles)).toEqual(["venmo", "paypal"]);
  });

  it("returns region providers first then other configured providers", () => {
    const handles: PaymentHandles = {
      paypalUsername: "alice",
      venmoUsername: "alice-venmo",
    };
    // GBP region has paypal, venmo is added as "other"
    expect(getAvailableProviders("GBP", handles)).toEqual(["paypal", "venmo"]);
  });

  it("returns matching providers for INR", () => {
    const handles: PaymentHandles = { upiVpa: "alice@okicici" };
    expect(getAvailableProviders("INR", handles)).toEqual(["upi"]);
  });

  it("returns matching providers for GBP", () => {
    const handles: PaymentHandles = { revolutTag: "alice", monzoMe: "alice" };
    expect(getAvailableProviders("GBP", handles)).toEqual(["revolut", "monzo"]);
  });

  it("falls back to paypal for unknown currency", () => {
    const handles: PaymentHandles = { paypalUsername: "alice" };
    expect(getAvailableProviders("JPY", handles)).toEqual(["paypal"]);
  });

  it("is case-insensitive on currency", () => {
    const handles: PaymentHandles = { venmoUsername: "alice" };
    expect(getAvailableProviders("usd", handles)).toEqual(["venmo"]);
  });

  it("filters out empty/whitespace handles", () => {
    const handles: PaymentHandles = { venmoUsername: "  ", paypalUsername: "alice" };
    expect(getAvailableProviders("USD", handles)).toEqual(["paypal"]);
  });
});

describe("getRegionProviderCount", () => {
  it("returns count of region-only providers", () => {
    const handles: PaymentHandles = {
      paypalUsername: "alice",
      venmoUsername: "alice-venmo",
    };
    // GBP region has paypal (1 match), venmo is non-region
    expect(getRegionProviderCount("GBP", handles)).toBe(1);
  });

  it("returns 0 when no region providers configured", () => {
    const handles: PaymentHandles = { upiVpa: "test@upi" };
    expect(getRegionProviderCount("USD", handles)).toBe(0);
  });

  it("returns 0 for null handles", () => {
    expect(getRegionProviderCount("USD", null)).toBe(0);
  });

  it("returns 0 for unknown currency with non-default provider", () => {
    const handles: PaymentHandles = { venmoUsername: "alice" };
    // JPY falls back to ["paypal"], venmo is not in that list
    expect(getRegionProviderCount("JPY", handles)).toBe(0);
  });
});

describe("getRegionPaymentMethods", () => {
  it("returns USD methods", () => {
    const methods = getRegionPaymentMethods("USD");
    expect(methods).toEqual(["cash", "venmo", "paypal", "cashapp", "zelle", "bank_transfer", "other"]);
  });

  it("returns INR methods", () => {
    const methods = getRegionPaymentMethods("INR");
    expect(methods).toEqual(["cash", "upi", "paypal", "bank_transfer", "other"]);
  });

  it("returns GBP methods", () => {
    const methods = getRegionPaymentMethods("GBP");
    expect(methods).toEqual(["cash", "paypal", "revolut", "monzo", "bank_transfer", "other"]);
  });

  it("returns fallback for unknown currency", () => {
    const methods = getRegionPaymentMethods("XYZ");
    expect(methods).toEqual(["cash", "paypal", "bank_transfer", "other"]);
  });

  it("shows only configured providers when creditor has handles", () => {
    // Creditor configured paypal + venmo. Only those should appear (not all GBP region providers)
    const methods = getRegionPaymentMethods("GBP", ["paypal", "venmo"]);
    expect(methods).toEqual(["cash", "paypal", "venmo", "bank_transfer", "other"]);
  });

  it("shows only the single configured provider", () => {
    const methods = getRegionPaymentMethods("USD", ["venmo"]);
    expect(methods).toEqual(["cash", "venmo", "bank_transfer", "other"]);
  });

  it("falls back to all region providers when configuredProviders is empty", () => {
    const methods = getRegionPaymentMethods("GBP", []);
    expect(methods).toEqual(["cash", "paypal", "revolut", "monzo", "bank_transfer", "other"]);
  });
});

describe("buildPaymentLink", () => {
  const handles: PaymentHandles = {
    venmoUsername: "alice-w",
    paypalUsername: "alicewadhara",
    cashAppTag: "$alice",
    zelleContact: "alice@test.com",
    upiVpa: "alice@okicici",
    revolutTag: "alice123",
    monzoMe: "alicew",
  };

  const baseOpts = {
    amount: 50,
    currency: "USD",
    creditorName: "Alice",
    note: "Dinner split",
  };

  it("builds Venmo native deep link with web fallback", () => {
    const result = buildPaymentLink("venmo", handles, baseOpts);
    expect(result.provider).toBe("venmo");
    expect(result.url).toContain("venmo://paycharge");
    expect(result.url).toContain("recipients=alice-w");
    expect(result.url).toContain("amount=50.00");
    expect(result.url).toContain("note=Dinner%20split");
    // Pre-built web fallback URL
    expect(result.webFallbackUrl).toContain("https://venmo.com/alice-w");
    expect(result.webFallbackUrl).toContain("amount=50.00");
  });

  it("builds PayPal link with amount and currency separated by slash", () => {
    const result = buildPaymentLink("paypal", handles, baseOpts);
    expect(result.url).toBe("https://paypal.me/alicewadhara/50.00/USD");
  });

  it("builds Cash App link without amount + disclaimer", () => {
    const result = buildPaymentLink("cashapp", handles, baseOpts);
    expect(result.url).toBe("https://cash.app/$alice");
    expect(result.disclaimer).toContain("Amount can't be pre-filled");
  });

  it("returns null URL for Zelle with clipboard text", () => {
    const result = buildPaymentLink("zelle", handles, baseOpts);
    expect(result.url).toBeNull();
    expect(result.clipboardText).toBe("alice@test.com");
    expect(result.disclaimer).toContain("banking app");
  });

  it("builds UPI intent link", () => {
    const result = buildPaymentLink("upi", handles, { ...baseOpts, currency: "INR" });
    expect(result.url).toContain("upi://pay");
    expect(result.url).toContain("pa=alice%40okicici");
    expect(result.url).toContain("am=50.00");
    expect(result.url).toContain("cu=INR");
  });

  it("builds Revolut link", () => {
    const result = buildPaymentLink("revolut", handles, { ...baseOpts, currency: "GBP" });
    expect(result.url).toBe("https://revolut.me/alice123");
  });

  it("builds Monzo link", () => {
    const result = buildPaymentLink("monzo", handles, { ...baseOpts, currency: "GBP" });
    expect(result.url).toBe("https://monzo.me/alicew");
  });

  it("uses default note when none provided", () => {
    const result = buildPaymentLink("venmo", handles, {
      amount: 25,
      currency: "USD",
      creditorName: "Alice",
    });
    expect(result.url).toContain("note=Splitr");
  });
});

describe("openPaymentLink — Zelle clipboard", () => {
  it("copies contact to clipboard for Zelle", async () => {
    const result = await openPaymentLink({
      provider: "zelle",
      url: null,
      clipboardText: "alice@test.com",
    });
    expect(result).toBe(true);
    expect(mockSetStringAsync).toHaveBeenCalledWith("alice@test.com");
  });
});

describe("openPaymentLink — Venmo fallback", () => {
  it("falls back to pre-built web URL when native link fails", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    await openPaymentLink({
      provider: "venmo",
      url: "venmo://paycharge?txn=pay&recipients=alice&amount=50.00&note=test",
      webFallbackUrl: "https://venmo.com/alice?txn=pay&amount=50.00&note=test",
    });
    expect(mockOpenURL).toHaveBeenCalledWith(
      "https://venmo.com/alice?txn=pay&amount=50.00&note=test"
    );
  });

  it("uses native link when available", async () => {
    mockCanOpenURL.mockResolvedValue(true);
    await openPaymentLink({
      provider: "venmo",
      url: "venmo://paycharge?txn=pay&recipients=alice&amount=50.00&note=test",
      webFallbackUrl: "https://venmo.com/alice?txn=pay&amount=50.00&note=test",
    });
    expect(mockOpenURL).toHaveBeenCalledWith(
      "venmo://paycharge?txn=pay&recipients=alice&amount=50.00&note=test"
    );
  });

  it("returns false when no web fallback and native fails", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const result = await openPaymentLink({
      provider: "venmo",
      url: "venmo://paycharge?txn=pay&recipients=alice&amount=50.00&note=test",
    });
    expect(result).toBe(false);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});

describe("openPaymentLink — standard providers", () => {
  it("opens PayPal URL", async () => {
    const result = await openPaymentLink({
      provider: "paypal",
      url: "https://paypal.me/alice/50.00USD",
    });
    expect(result).toBe(true);
    expect(mockOpenURL).toHaveBeenCalledWith("https://paypal.me/alice/50.00USD");
  });

  it("returns false for null URL non-Zelle provider", async () => {
    const result = await openPaymentLink({
      provider: "paypal",
      url: null,
    });
    expect(result).toBe(false);
  });
});

describe("normalizeHandle", () => {
  it("strips @ from venmo", () => {
    expect(normalizeHandle("venmo", "@alice")).toBe("alice");
  });

  it("strips $ from cashapp", () => {
    expect(normalizeHandle("cashapp", "$alice")).toBe("alice");
  });

  it("strips @ from revolut", () => {
    expect(normalizeHandle("revolut", "@alice123")).toBe("alice123");
  });

  it("strips @ from monzo", () => {
    expect(normalizeHandle("monzo", "@alice")).toBe("alice");
  });

  it("trims whitespace", () => {
    expect(normalizeHandle("paypal", "  alice  ")).toBe("alice");
  });

  it("leaves UPI VPA unchanged", () => {
    expect(normalizeHandle("upi", "alice@okicici")).toBe("alice@okicici");
  });
});

describe("validatePaymentHandle", () => {
  it("returns true for empty values (optional)", () => {
    expect(validatePaymentHandle("venmo", "")).toBe(true);
    expect(validatePaymentHandle("venmo", "  ")).toBe(true);
  });

  it("validates venmo username", () => {
    expect(validatePaymentHandle("venmo", "alice-w")).toBe(true);
    expect(validatePaymentHandle("venmo", "@alice")).toBe(true); // normalized first
    expect(validatePaymentHandle("venmo", "alice w")).toBe(false);
  });

  it("validates UPI VPA", () => {
    expect(validatePaymentHandle("upi", "alice@okicici")).toBe(true);
    expect(validatePaymentHandle("upi", "alice@pay.google")).toBe(true);
    expect(validatePaymentHandle("upi", "alice@ybl.sbi")).toBe(true);
    expect(validatePaymentHandle("upi", "not-valid")).toBe(false);
  });

  it("validates Zelle email", () => {
    expect(validatePaymentHandle("zelle", "alice@test.com")).toBe(true);
  });

  it("validates Zelle phone", () => {
    expect(validatePaymentHandle("zelle", "+1 555-123-4567")).toBe(true);
  });

  it("rejects invalid Zelle contact", () => {
    expect(validatePaymentHandle("zelle", "abc")).toBe(false);
  });
});

describe("PROVIDER_INFO", () => {
  it("has entries for all providers", () => {
    const providers: PaymentProvider[] = [
      "venmo", "paypal", "cashapp", "zelle", "upi", "revolut", "monzo",
    ];
    for (const p of providers) {
      expect(PROVIDER_INFO[p]).toBeDefined();
      expect(PROVIDER_INFO[p].label).toBeTruthy();
      expect(PROVIDER_INFO[p].placeholder).toBeTruthy();
      expect(PROVIDER_INFO[p].handleKey).toBeTruthy();
    }
  });
});
