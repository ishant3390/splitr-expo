// Pure helper functions extracted from screen components for testability.

// --- From add.tsx ---

const ICON_TO_EMOJI: Record<string, string> = {
  restaurant: "🍕", "food_and_drink": "🍔", food: "🍕", fastfood: "🍔",
  local_cafe: "☕", coffee: "☕", local_bar: "🍺", directions_car: "🚗",
  transport: "🚗", car: "🚗", flight: "✈️", travel: "✈️", hotel: "🏨",
  accommodation: "🏠", home: "🏠", house: "🏠", sports_esports: "🎮",
  entertainment: "🎮", movie: "🎬", theaters: "🎭", shopping_bag: "🛍️",
  shopping: "🛍️", shopping_cart: "🛒", groceries: "🛒",
  local_grocery_store: "🛒", receipt: "🧾", payments: "💳", health: "❤️",
  local_hospital: "🏥", fitness_center: "💪", card_giftcard: "🎁",
  gifts: "🎁", work: "💼", business: "💼", wifi: "📡", utilities: "📡",
  electric_bolt: "⚡", water_drop: "💧", pets: "🐾", school: "📚",
  education: "📚", other: "📋", more_horiz: "📋",
};

export function getCategoryEmoji(icon?: string): string {
  if (!icon) return "📋";
  if (/^\p{Emoji}/u.test(icon)) return icon;
  return ICON_TO_EMOJI[icon.toLowerCase()] ?? ICON_TO_EMOJI[icon] ?? "📋";
}

export type SplitType = "equal" | "percentage" | "fixed";

export function initSplitValues(
  memberIds: string[],
  type: SplitType,
  totalStr: string
): Record<string, string> {
  const map: Record<string, string> = {};
  if (memberIds.length === 0) return map;
  if (type === "percentage") {
    const even = (100 / memberIds.length).toFixed(2);
    memberIds.forEach((id) => { map[id] = even; });
  } else if (type === "fixed") {
    const total = parseFloat(totalStr) || 0;
    const even = (total / memberIds.length).toFixed(2);
    memberIds.forEach((id) => { map[id] = even; });
  }
  return map;
}

export function calculateEqualSplit(totalCents: number, count: number): number[] {
  if (count === 0) return [];
  const perPerson = Math.floor(totalCents / count);
  const remainder = totalCents - perPerson * count;
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? perPerson + remainder : perPerson
  );
}

export function validatePercentageSplit(percentages: Record<string, string>): { valid: boolean; total: number } {
  const total = Object.values(percentages).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  return { valid: Math.abs(total - 100) <= 0.5, total };
}

export function validateFixedSplit(fixedAmounts: Record<string, string>, totalCents: number): { valid: boolean; totalFixed: number } {
  const totalFixed = Object.values(fixedAmounts).reduce((s, v) => s + Math.round((parseFloat(v) || 0) * 100), 0);
  return { valid: Math.abs(totalFixed - totalCents) <= 1, totalFixed };
}

// --- Auto-category inference ---

const KEYWORD_TO_CATEGORY: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ["dinner", "lunch", "breakfast", "pizza", "burger", "coffee", "cafe", "restaurant", "food", "meal", "snack", "drink", "bar", "brunch", "sushi", "taco", "sandwich", "bakery", "dessert", "takeout", "takeaway", "doordash", "ubereats", "grubhub"],
    category: "food",
  },
  {
    keywords: ["uber", "lyft", "taxi", "cab", "gas", "fuel", "parking", "toll", "flight", "train", "bus", "metro", "subway", "transport", "commute", "ferry", "amtrak", "greyhound"],
    category: "transport",
  },
  {
    keywords: ["hotel", "airbnb", "hostel", "motel", "rent", "mortgage", "lodging", "accommodation"],
    category: "accommodation",
  },
  {
    keywords: ["movie", "cinema", "netflix", "concert", "show", "gaming", "ticket", "theater", "theatre", "spotify", "hulu", "disney", "streaming", "entertainment"],
    category: "entertainment",
  },
  {
    keywords: ["grocery", "groceries", "supermarket", "costco", "market", "produce", "walmart", "target", "trader joe", "whole foods", "safeway", "aldi"],
    category: "groceries",
  },
  {
    keywords: ["amazon", "shop", "store", "mall", "clothes", "clothing", "shoes", "outfit", "fashion", "apparel"],
    category: "shopping",
  },
  {
    keywords: ["pharmacy", "doctor", "medicine", "hospital", "clinic", "gym", "fitness", "dental", "dentist", "medical", "prescription", "vitamin", "therapy"],
    category: "health",
  },
  {
    keywords: ["electric", "electricity", "water bill", "internet", "wifi", "phone bill", "cable", "insurance", "utility", "utilities"],
    category: "utilities",
  },
  {
    keywords: ["office", "work", "business", "conference", "meeting", "subscription", "software", "aws", "github", "slack"],
    category: "work",
  },
  {
    keywords: ["tuition", "course", "textbook", "books", "school", "class", "workshop", "training", "education", "udemy", "coursera"],
    category: "education",
  },
];

/**
 * Infers the best matching category ID from a description string.
 * Returns null if no confident match is found or user hasn't picked one yet.
 */
export function inferCategoryFromDescription(
  description: string,
  categories: Array<{ id: string; name: string }>
): string | null {
  if (!description.trim() || categories.length === 0) return null;
  const lower = description.toLowerCase();
  for (const { keywords, category } of KEYWORD_TO_CATEGORY) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const match = categories.find((c) => c.name.toLowerCase().includes(category));
      if (match) return match.id;
    }
  }
  return null;
}

// --- From settle-up.tsx ---

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", emoji: "💵" },
  { key: "venmo", label: "Venmo", emoji: "💜" },
  { key: "zelle", label: "Zelle", emoji: "⚡" },
  { key: "paypal", label: "PayPal", emoji: "🅿️" },
  { key: "bank_transfer", label: "Bank", emoji: "🏦" },
  { key: "other", label: "Other", emoji: "💳" },
];

export function getPaymentMethodLabel(key: string): { label: string; emoji: string } | undefined {
  return PAYMENT_METHODS.find((m) => m.key === key);
}

export function getPaymentMethodEmoji(key?: string): string {
  if (!key) return "💳";
  return PAYMENT_METHODS.find((m) => m.key === key)?.emoji ?? "💳";
}

// --- From group/[id].tsx ---

export function dedupeMembers<T extends { id: string }>(raw: T[]): T[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

interface PayerLike {
  user?: { id?: string; name?: string } | null;
  guestUser?: { id?: string; name?: string } | null;
  amountPaid: number;
}

interface ExpenseLike {
  payers?: PayerLike[];
  amountCents?: number;
  category?: { name?: string } | null;
  description?: string;
  date?: string;
  createdAt?: string;
}

export function aggregateByPerson(expenses: ExpenseLike[]): Array<{ name: string; total: number }> {
  const byPerson: Record<string, { name: string; total: number }> = {};
  expenses.forEach((e) => {
    e.payers?.forEach((p) => {
      const name = p.user?.name ?? p.guestUser?.name ?? "Unknown";
      const key = p.user?.id ?? p.guestUser?.id ?? name;
      if (!byPerson[key]) byPerson[key] = { name, total: 0 };
      byPerson[key].total += p.amountPaid;
    });
  });
  return Object.values(byPerson).sort((a, b) => b.total - a.total);
}

export function aggregateByCategory(expenses: ExpenseLike[], topN = 5): Array<[string, number]> {
  const byCat: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category?.name ?? "Other";
    byCat[cat] = (byCat[cat] || 0) + (e.amountCents ?? 0);
  });
  return Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, topN);
}

export function aggregateByMonth(expenses: ExpenseLike[]): Array<{ month: string; total: number }> {
  const byMonth: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = e.date || e.createdAt;
    if (!d) return;
    const key = d.substring(0, 7); // "YYYY-MM"
    byMonth[key] = (byMonth[key] || 0) + (e.amountCents ?? 0);
  });
  return Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));
}

export function filterExpenses(expenses: ExpenseLike[], query: string): ExpenseLike[] {
  if (!query.trim()) return expenses;
  const q = query.toLowerCase();
  return expenses.filter((e) => {
    const desc = e.description?.toLowerCase() ?? "";
    const payer = (e.payers?.[0]?.user?.name ?? e.payers?.[0]?.guestUser?.name ?? "").toLowerCase();
    const cat = (e.category?.name ?? "").toLowerCase();
    return desc.includes(q) || payer.includes(q) || cat.includes(q);
  });
}

export function sortExpenses(expenses: ExpenseLike[], sortBy: "date" | "amount"): ExpenseLike[] {
  return [...expenses].sort((a, b) => {
    if (sortBy === "amount") return (b.amountCents ?? 0) - (a.amountCents ?? 0);
    const dateA = a.date || a.createdAt || "";
    const dateB = b.date || b.createdAt || "";
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

export function resolvePayerName(
  payer?: { user?: { id?: string; name?: string } | null; guestUser?: { id?: string; name?: string } | null },
  members?: Array<{ user?: { id?: string; name?: string } | null; guestUser?: { id?: string; name?: string } | null; displayName?: string }>,
  createdBy?: { name?: string } | null
): string {
  if (payer?.user?.name) return payer.user.name;
  if (payer?.guestUser?.name) return payer.guestUser.name;
  if (payer?.user?.id && members) {
    const m = members.find((m) => m.user?.id === payer.user!.id);
    if (m) return m.user?.name ?? m.displayName ?? "Member";
  }
  if (payer?.guestUser?.id && members) {
    const m = members.find((m) => m.guestUser?.id === payer.guestUser!.id);
    if (m) return m.guestUser?.name ?? m.displayName ?? "Member";
  }
  return createdBy?.name ?? "Someone";
}

// --- From index.tsx (home screen balance) ---

interface MemberBalanceLike {
  user?: { email?: string } | null;
  balance?: number | null;
}

export function computeBalancesFromMembers(
  memberResults: MemberBalanceLike[][],
  currentEmail: string
): { owed: number; owes: number } {
  let owed = 0;
  let owes = 0;
  memberResults.forEach((members) => {
    const list = Array.isArray(members) ? members : [];
    const me = list.find((m) => m.user?.email === currentEmail);
    if (me?.balance != null) {
      if (me.balance > 0) owed += me.balance;
      else if (me.balance < 0) owes += Math.abs(me.balance);
    }
  });
  return { owed, owes };
}
