import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ExpenseCategory } from "./types";

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

// Icon name mappings for lucide-react-native (resolved at component level)
export const categoryIconNames: Record<ExpenseCategory, string> = {
  food: "Utensils",
  transport: "Car",
  accommodation: "Home",
  entertainment: "Gamepad2",
  shopping: "ShoppingBag",
  other: "MoreHorizontal",
};

export const categoryLabels: Record<ExpenseCategory, string> = {
  food: "Food & Drinks",
  transport: "Transport",
  accommodation: "Accommodation",
  entertainment: "Entertainment",
  shopping: "Shopping",
  other: "Other",
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
