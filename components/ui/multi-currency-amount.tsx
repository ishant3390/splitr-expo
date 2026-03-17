import React from "react";
import { Text } from "react-native";
import { formatCents } from "@/lib/utils";
import type { CurrencyAmount } from "@/lib/types";

interface MultiCurrencyAmountProps {
  amounts: CurrencyAmount[];
  fallbackCurrency?: string;
  className?: string;
  style?: any;
  selectable?: boolean;
}

/**
 * Renders a CurrencyAmount[] array as a formatted string.
 * - 0 entries: Shows "$0.00" (or fallback currency zero)
 * - 1 entry: Shows the single formatted amount
 * - 2+ entries: Shows amounts joined with " + " (zero-amount entries filtered out)
 */
export function MultiCurrencyAmount({
  amounts,
  fallbackCurrency = "USD",
  className,
  style,
  selectable,
}: MultiCurrencyAmountProps) {
  const nonZero = amounts.filter((a) => a.amount > 0);

  const text =
    nonZero.length === 0
      ? formatCents(0, fallbackCurrency)
      : nonZero.map((a) => formatCents(a.amount, a.currency)).join(" + ");

  const accessibilityLabel =
    nonZero.length === 0
      ? formatCents(0, fallbackCurrency)
      : nonZero.map((a) => formatCents(a.amount, a.currency)).join(" and ");

  return (
    <Text
      className={className}
      style={style}
      selectable={selectable}
      accessibilityLabel={accessibilityLabel}
    >
      {text}
    </Text>
  );
}

/**
 * Pure function version for use in string interpolation contexts.
 */
export function formatMultiCurrency(
  amounts: CurrencyAmount[],
  fallbackCurrency = "USD"
): string {
  const nonZero = amounts.filter((a) => a.amount > 0);
  if (nonZero.length === 0) return formatCents(0, fallbackCurrency);
  return nonZero.map((a) => formatCents(a.amount, a.currency)).join(" + ");
}
