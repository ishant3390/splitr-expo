/**
 * Payment deep link utilities for Splitr.
 *
 * Constructs URLs to open payment apps (Venmo, PayPal, Cash App, UPI, etc.)
 * with amount pre-filled where supported. Zero cost, zero APIs.
 *
 * Trust principle: We never claim a payment succeeded. Deep links hand off
 * to the payment app — we can't confirm the transfer happened.
 */

import { Linking, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { PaymentHandles } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentProvider =
  | "venmo"
  | "paypal"
  | "cashapp"
  | "zelle"
  | "upi"
  | "revolut"
  | "monzo";

export interface PaymentLinkResult {
  provider: PaymentProvider;
  url: string | null;
  clipboardText?: string;
  disclaimer?: string;
  /** Venmo web fallback URL — pre-built so we don't re-parse the native URL */
  webFallbackUrl?: string;
}

export interface PaymentLinkOptions {
  amount: number; // dollars (not cents)
  currency: string;
  creditorName: string;
  note?: string;
}

// ─── Region Mapping ──────────────────────────────────────────────────────────

export const CURRENCY_PROVIDERS: Record<string, PaymentProvider[]> = {
  USD: ["venmo", "paypal", "cashapp", "zelle"],
  INR: ["upi", "paypal"],
  GBP: ["paypal", "revolut", "monzo"],
  EUR: ["paypal", "revolut"],
  CAD: ["paypal"],
  AUD: ["paypal"],
};

const DEFAULT_PROVIDERS: PaymentProvider[] = ["paypal"];

/** All known providers — lazy-initialized from PROVIDER_INFO to stay in sync */
let _allProviders: PaymentProvider[] | null = null;
function getAllProviders(): PaymentProvider[] {
  if (!_allProviders) _allProviders = Object.keys(PROVIDER_INFO) as PaymentProvider[];
  return _allProviders;
}

/**
 * Shared helper: splits configured providers into region and non-region groups.
 */
function partitionProviders(
  currency: string,
  creditorHandles: PaymentHandles
): { region: PaymentProvider[]; other: PaymentProvider[] } {
  const regionProviders =
    CURRENCY_PROVIDERS[currency.toUpperCase()] ?? DEFAULT_PROVIDERS;

  const hasHandle = (provider: PaymentProvider) => {
    const handle = getHandleForProvider(provider, creditorHandles);
    return !!handle?.trim();
  };

  const region = regionProviders.filter(hasHandle);
  const other = getAllProviders().filter(
    (p) => !regionProviders.includes(p) && hasHandle(p)
  );

  return { region, other };
}

/**
 * Returns providers the creditor has configured.
 * Region-appropriate providers come first, then any additional configured providers
 * from other regions. This ensures a US user's Venmo still shows in a GBP group.
 */
export function getAvailableProviders(
  currency: string,
  creditorHandles?: PaymentHandles | null
): PaymentProvider[] {
  if (!creditorHandles) return [];
  const { region, other } = partitionProviders(currency, creditorHandles);
  return [...region, ...other];
}

/**
 * Returns the count of region-appropriate providers (for UI grouping).
 * Providers beyond this index are "other methods" from different regions.
 */
export function getRegionProviderCount(
  currency: string,
  creditorHandles?: PaymentHandles | null
): number {
  if (!creditorHandles) return 0;
  return partitionProviders(currency, creditorHandles).region.length;
}

/**
 * Returns payment method keys for the settle-up method selector, based on currency.
 *
 * When configuredProviders is provided and non-empty, only those app-specific
 * methods appear (so the user doesn't see "Zelle" if the creditor has no Zelle handle).
 * When not provided, falls back to all region providers.
 */
export function getRegionPaymentMethods(
  currency: string,
  configuredProviders?: PaymentProvider[]
): string[] {
  const base = ["cash"];

  const hasConfigured = configuredProviders && configuredProviders.length > 0;

  if (hasConfigured) {
    // Show only the providers the creditor has configured (region + non-region)
    return [...base, ...configuredProviders, "bank_transfer", "other"];
  }

  // Fallback: show all region providers when no creditor handles available
  const regionProviders =
    CURRENCY_PROVIDERS[currency.toUpperCase()] ?? DEFAULT_PROVIDERS;
  return [...base, ...regionProviders, "bank_transfer", "other"];
}

// ─── Handle Helpers ──────────────────────────────────────────────────────────

function getHandleForProvider(
  provider: PaymentProvider,
  handles: PaymentHandles
): string | undefined {
  switch (provider) {
    case "venmo":
      return handles.venmoUsername;
    case "paypal":
      return handles.paypalUsername;
    case "cashapp":
      return handles.cashAppTag;
    case "zelle":
      return handles.zelleContact;
    case "upi":
      return handles.upiVpa;
    case "revolut":
      return handles.revolutTag;
    case "monzo":
      return handles.monzoMe;
  }
}

// ─── Link Construction ───────────────────────────────────────────────────────

/**
 * Constructs a payment deep link URL for the given provider.
 * Returns null URL for Zelle (clipboard-only).
 */
export function buildPaymentLink(
  provider: PaymentProvider,
  handles: PaymentHandles,
  options: PaymentLinkOptions
): PaymentLinkResult {
  const { amount, currency, creditorName, note } = options;
  const payNote = note || `Splitr: payment to ${creditorName}`;
  const encodedNote = encodeURIComponent(payNote);

  switch (provider) {
    case "venmo": {
      const username = normalizeHandle("venmo", handles.venmoUsername ?? "");
      const encodedUsername = encodeURIComponent(username);
      const nativeUrl = `venmo://paycharge?txn=pay&recipients=${encodedUsername}&amount=${amount.toFixed(2)}&note=${encodedNote}`;
      const webFallbackUrl = `https://venmo.com/${encodedUsername}?txn=pay&amount=${amount.toFixed(2)}&note=${encodedNote}`;
      return { provider, url: nativeUrl, webFallbackUrl };
    }

    case "paypal": {
      const username = encodeURIComponent(normalizeHandle("paypal", handles.paypalUsername ?? ""));
      return {
        provider,
        url: `https://paypal.me/${username}/${amount.toFixed(2)}/${currency.toUpperCase()}`,
      };
    }

    case "cashapp": {
      const tag = encodeURIComponent(normalizeHandle("cashapp", handles.cashAppTag ?? ""));
      return {
        provider,
        url: `https://cash.app/$${tag}`,
        disclaimer: "Amount can't be pre-filled. You'll enter it in Cash App.",
      };
    }

    case "zelle": {
      const contact = handles.zelleContact ?? "";
      return {
        provider,
        url: null,
        clipboardText: contact,
        disclaimer:
          "We'll copy their contact. Open your banking app to send via Zelle.",
      };
    }

    case "upi": {
      const vpa = normalizeHandle("upi", handles.upiVpa ?? "");
      const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(creditorName)}&am=${amount.toFixed(2)}&tn=${encodedNote}&cu=INR`;
      return { provider, url: upiUrl };
    }

    case "revolut": {
      const tag = encodeURIComponent(normalizeHandle("revolut", handles.revolutTag ?? ""));
      return { provider, url: `https://revolut.me/${tag}` };
    }

    case "monzo": {
      const user = encodeURIComponent(normalizeHandle("monzo", handles.monzoMe ?? ""));
      return { provider, url: `https://monzo.me/${user}` };
    }
  }
}

// ─── Open Link ───────────────────────────────────────────────────────────────

/**
 * Opens the payment link. Handles Venmo native→web fallback.
 * For Zelle, copies contact to clipboard.
 * Returns true if the action was taken successfully.
 */
export async function openPaymentLink(
  result: PaymentLinkResult
): Promise<boolean> {
  // Zelle: clipboard only
  if (result.provider === "zelle" && result.clipboardText) {
    await Clipboard.setStringAsync(result.clipboardText);
    return true;
  }

  if (!result.url) return false;

  // Venmo: try native, fall back to web
  if (result.provider === "venmo") {
    try {
      const canOpen = await Linking.canOpenURL(result.url);
      if (canOpen) {
        await Linking.openURL(result.url);
        return true;
      }
    } catch {
      // Fall through to web
    }
    // Web fallback — use pre-built URL to avoid fragile URL re-parsing
    if (result.webFallbackUrl) {
      await Linking.openURL(result.webFallbackUrl);
      return true;
    }
    return false;
  }

  // All others: just open the URL
  await Linking.openURL(result.url);
  return true;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const VALIDATION_PATTERNS: Record<PaymentProvider, RegExp> = {
  venmo: /^[a-zA-Z0-9_-]{1,50}$/,
  paypal: /^[a-zA-Z0-9._-]{1,50}$/,
  cashapp: /^[a-zA-Z0-9_-]{1,50}$/,
  zelle: /^[^\s@]+@[^\s@]+\.[^\s@]+$|^\+?[\d\s()-]{7,20}$/,
  upi: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.]+$/,
  revolut: /^[a-zA-Z0-9._-]{1,50}$/,
  monzo: /^[a-zA-Z0-9._-]{1,50}$/,
};

/**
 * Validates a payment handle format for the given provider.
 */
export function validatePaymentHandle(
  provider: PaymentProvider,
  value: string
): boolean {
  if (!value?.trim()) return true; // Empty is valid (optional field)
  const normalized = normalizeHandle(provider, value);
  return VALIDATION_PATTERNS[provider].test(normalized);
}

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Normalizes a payment handle: strips @, $, trims whitespace.
 */
export function normalizeHandle(
  provider: PaymentProvider,
  value: string
): string {
  let cleaned = value.trim();

  switch (provider) {
    case "venmo":
      cleaned = cleaned.replace(/^@/, "");
      break;
    case "cashapp":
      cleaned = cleaned.replace(/^\$/, "");
      break;
    case "revolut":
      cleaned = cleaned.replace(/^@/, "");
      break;
    case "monzo":
      cleaned = cleaned.replace(/^@/, "");
      break;
  }

  return cleaned;
}

// ─── Provider Display Info ───────────────────────────────────────────────────

export const PROVIDER_INFO: Record<
  PaymentProvider,
  { label: string; placeholder: string; handleKey: keyof PaymentHandles }
> = {
  venmo: {
    label: "Venmo",
    placeholder: "username (no @)",
    handleKey: "venmoUsername",
  },
  paypal: {
    label: "PayPal",
    placeholder: "paypal.me username",
    handleKey: "paypalUsername",
  },
  cashapp: {
    label: "Cash App",
    placeholder: "$cashtag (no $)",
    handleKey: "cashAppTag",
  },
  zelle: {
    label: "Zelle",
    placeholder: "email or phone",
    handleKey: "zelleContact",
  },
  upi: {
    label: "UPI",
    placeholder: "you@okicici",
    handleKey: "upiVpa",
  },
  revolut: {
    label: "Revolut",
    placeholder: "revolut.me tag",
    handleKey: "revolutTag",
  },
  monzo: {
    label: "Monzo",
    placeholder: "monzo.me username",
    handleKey: "monzoMe",
  },
};
