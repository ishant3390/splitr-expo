import { getLocales } from "expo-localization";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "EUR", symbol: "\u20AC", flag: "\u{1F1EA}\u{1F1FA}" },
  { code: "GBP", symbol: "\u00A3", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "INR", symbol: "\u20B9", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "CAD", symbol: "C$", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "AUD", symbol: "A$", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "JPY", symbol: "\u00A5", flag: "\u{1F1EF}\u{1F1F5}" },
];

/** Map of ISO 3166-1 alpha-2 region codes to currency codes. */
const REGION_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  UK: "GBP",
  IN: "INR",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", LT: "EUR",
  LV: "EUR", EE: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
};

/**
 * Detect the user's likely default currency from their device locale.
 * Falls back to USD if the region is unknown or not in our supported list.
 */
export function detectDefaultCurrency(): string {
  try {
    const locales = getLocales();
    const region = locales[0]?.regionCode?.toUpperCase();
    if (region && REGION_TO_CURRENCY[region]) {
      return REGION_TO_CURRENCY[region];
    }
  } catch {
    // expo-localization may not be available in all environments
  }
  return "USD";
}

/** Get currency codes as a simple string array. */
export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
