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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Extract invite code from a raw code string or full invite/join URL. */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:splitr\.ai|localhost:\d+)\/(?:invite|join)\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  return trimmed;
}
