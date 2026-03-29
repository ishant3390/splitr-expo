import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert cents (API) to dollar amount. */
export function centsToAmount(cents: number): number {
  return cents / 100;
}

/** Convert dollar amount to cents (API). */
export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Parses a decimal money input string into integer cents without float math.
 * Returns null for invalid values.
 */
export function parseAmountInputToCents(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (!/^(?:\d+|\d+\.\d{0,2}|\.\d{1,2})$/.test(value)) return null;

  const [wholeRaw, fractionalRaw = ""] = value.split(".");
  const wholePart = wholeRaw.length > 0 ? wholeRaw : "0";
  const fractionalPart = fractionalRaw.padEnd(2, "0").slice(0, 2);

  const whole = BigInt(wholePart);
  const fractional = BigInt(fractionalPart || "0");
  const cents = whole * 100n + fractional;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;

  return Number(cents);
}

/**
 * Sanitize raw text input into a valid monetary amount string.
 * - Strips non-numeric characters (except decimal point)
 * - Allows only one decimal point
 * - Limits to 2 decimal places
 * - Returns the sanitized string (may equal previous value when rejecting input)
 */
export function sanitizeAmountInput(raw: string): string {
  // Strip non-numeric chars
  let cleaned = raw.replace(/[^0-9.]/g, "");
  // Only allow one decimal point — keep the first, remove the rest
  const dotIdx = cleaned.indexOf(".");
  if (dotIdx !== -1) {
    cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, "");
  }
  // Truncate to 2 decimal places
  if (dotIdx !== -1 && cleaned.length - dotIdx - 1 > 2) {
    cleaned = cleaned.slice(0, dotIdx + 3);
  }
  return cleaned;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format cents value as currency string. */
export function formatCents(cents: number, currency = "USD"): string {
  return formatCurrency(centsToAmount(cents), currency);
}

/** Extract the currency symbol (e.g. "$", "€", "£") for a given ISO currency code. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", KRW: "₩",
  INR: "₹", RUB: "₽", TRY: "₺", BRL: "R$", ZAR: "R", SEK: "kr",
  NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft", CHF: "CHF",
  CAD: "CA$", AUD: "A$", NZD: "NZ$", SGD: "S$", HKD: "HK$",
  MXN: "MX$", THB: "฿", MYR: "RM", PHP: "₱", IDR: "Rp", VND: "₫",
  AED: "د.إ", SAR: "﷼", ILS: "₪", EGP: "E£", NGN: "₦", KES: "KSh",
  COP: "COL$", ARS: "AR$", CLP: "CLP$", PEN: "S/.", TWD: "NT$",
  PKR: "₨", BDT: "৳", LKR: "Rs", NPR: "Rs", MMK: "K",
};

export function getCurrencySymbol(currency = "USD"): string {
  // Static map first — Hermes (React Native) has incomplete Intl.formatToParts support
  if (CURRENCY_SYMBOLS[currency]) return CURRENCY_SYMBOLS[currency];
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency }).formatToParts(0);
    const symbol = parts.find((p) => p.type === "currency")?.value;
    // Intl may return the ISO code itself (e.g. "GBP") — only use if it's actually a symbol
    if (symbol && symbol !== currency) return symbol;
  } catch {
    // fall through
  }
  return currency;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format a timestamp as a human-friendly relative time string for activity cards. */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Future dates — fall back to short date
  if (diffMs < 0) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHrs < 24) return diffHrs === 1 ? "1 hour ago" : `${diffHrs} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  if (diffDays < 21) return "2 weeks ago";
  if (diffDays < 60) return "Last month";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format a date as "Mar 2026" for member-since display. */
export function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Resolve a member's avatar URL, preferring profileImageUrl over avatarUrl.
 * Sanitizes double-https prefix from backend responses.
 */
export function getMemberAvatarUrl(user?: { avatarUrl?: string; profileImageUrl?: string }): string | undefined {
  const url = user?.profileImageUrl ?? user?.avatarUrl;
  if (!url) return undefined;
  return url.replace(/^(https?:\/\/)\1+/, "$1");
}

/** Extract invite code from a raw code string or full invite/join URL. */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:splitr\.ai|localhost:\d+)\/(?:invite|join)\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  return trimmed;
}

type FxLikeAmount = {
  amountCents?: number;
  currency?: string;
  convertedAmount?: { amountMinor: number; currency: string } | number;
  convertedAmountCents?: number;
  convertedCurrency?: string;
};

/**
 * Returns FX dual display values:
 * - primary: original amount/currency
 * - secondary: subtle converted amount (if backend provided and currency differs)
 */
export function getFxDisplayAmounts(
  item: FxLikeAmount
): { primary: string; secondary: string | null } {
  const baseAmount = item.amountCents ?? 0;
  const baseCurrency = item.currency ?? "USD";
  const primary = formatCents(baseAmount, baseCurrency);

  let convertedMinor: number | null = null;
  let convertedCurrency: string | undefined;

  if (typeof item.convertedAmount === "number") {
    convertedMinor = item.convertedAmount;
    convertedCurrency = item.convertedCurrency;
  } else if (item.convertedAmount && typeof item.convertedAmount.amountMinor === "number") {
    convertedMinor = item.convertedAmount.amountMinor;
    convertedCurrency = item.convertedAmount.currency;
  } else if (typeof item.convertedAmountCents === "number") {
    convertedMinor = item.convertedAmountCents;
    convertedCurrency = item.convertedCurrency;
  }

  if (convertedMinor == null || !convertedCurrency || convertedCurrency === baseCurrency) {
    return { primary, secondary: null };
  }

  return { primary, secondary: `≈ ${formatCents(convertedMinor, convertedCurrency)}` };
}
