// Pure helper functions extracted from screen components for testability.

import type { GroupMemberDto } from "./types";

// Re-export icon utilities from centralized module
export { getCategoryIcon, getActivityIcon, getPaymentMethodIcon } from "./category-icons";

/** Returns true if any member has a non-zero balance (unsettled debts). */
export function hasUnsettledBalances(members: GroupMemberDto[]): boolean {
  return members.some((m) => (m.balance ?? 0) !== 0);
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

// --- Activity feed descriptive titles ---

import type { ActivityLogDto } from "./types";

const ACTIVITY_VERB_MAP: Record<string, string> = {
  expense_created: "added",
  expense_updated: "updated",
  expense_deleted: "deleted",
  settlement_created: "settled up",
  member_joined: "joined",
  member_joined_via_invite: "joined",
  member_added: "added",
  member_removed: "removed",
  member_left: "left",
  group_created: "created",
  group_archived: "archived",
  group_unarchived: "unarchived",
  group_deleted: "deleted",
  group_updated: "updated",
};

/** Extract first name from a full name. Returns fallback phrases like "a member" unchanged. */
function firstName(name: string): string {
  if (name.startsWith("a ") || name === "Someone") return name;
  return name.split(" ")[0];
}

export function formatActivityTitle(
  activity: ActivityLogDto,
  currentUserId: string | null | undefined
): string {
  const isYou = !!(currentUserId && activity.actorUserId === currentUserId);
  const fullName = activity.actorUserName ?? activity.actorGuestName ?? "Someone";
  const actorName = isYou ? "You" : firstName(fullName);

  const verb = ACTIVITY_VERB_MAP[activity.activityType];
  if (!verb) {
    // Fallback for unknown types
    const label = activity.activityType
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    return `${actorName}: ${label}`;
  }

  const description =
    (activity.details?.newDescription as string) ??
    (activity.details?.description as string) ??
    "";

  switch (activity.activityType) {
    case "expense_created":
    case "expense_updated":
    case "expense_deleted":
      return description
        ? `${actorName} ${verb} ${description}`
        : `${actorName} ${verb} an expense`;
    case "settlement_created":
      return `${actorName} ${verb}`;
    case "member_joined":
    case "member_joined_via_invite":
      return `${actorName} ${verb} ${activity.groupName ?? (activity.details?.groupName as string) ?? ""}`.trim();
    case "member_added": {
      const targetId = activity.details?.targetUserId as string | undefined;
      const isTargetYou = !!(currentUserId && targetId === currentUserId);
      const targetFullName = ((activity.details?.targetUserName ??
            activity.details?.memberName ??
            activity.details?.addedMemberName ??
            "a member") as string);
      const targetName = isTargetYou ? "you" : firstName(targetFullName);
      const groupPart = activity.groupName ? ` to ${activity.groupName}` : "";
      return `${actorName} ${verb} ${targetName}${groupPart}`;
    }
    case "member_removed": {
      const removedFullName =
        (activity.details?.removedMemberName as string) ??
        (activity.details?.targetUserName as string) ??
        (activity.details?.memberName as string) ??
        "a member";
      const removedName = firstName(removedFullName);
      return `${actorName} ${verb} ${removedName}`;
    }
    case "member_left":
      return `${actorName} ${verb} ${activity.groupName ?? (activity.details?.groupName as string) ?? "the group"}`;
    case "group_created":
    case "group_archived":
    case "group_unarchived":
    case "group_deleted":
    case "group_updated":
      return `${actorName} ${verb} ${activity.groupName ?? (activity.details?.groupName as string) ?? ""}`.trim();
    default:
      return `${actorName}: ${verb}`;
  }
}

// --- Activity feed involvement indicators ---

export interface ActivityInvolvement {
  /** null = not an expense activity or no involvement data from BE */
  text: string | null;
  /** Tailwind-friendly color token */
  color: "teal" | "red" | "muted" | null;
}

/**
 * Returns involvement text + color for an activity item.
 * BE sends `yourShareCents` (absent = not involved) and `involvedCount` on expense activities.
 */
export function formatActivityInvolvement(
  activity: ActivityLogDto
): ActivityInvolvement {
  const isExpense = activity.activityType.startsWith("expense_");
  if (!isExpense) return { text: null, color: null };

  const involvedCount = activity.details?.involvedCount as number | undefined;
  if (involvedCount == null) return { text: null, color: null };

  const yourShareCents = activity.details?.yourShareCents as number | undefined;

  if (yourShareCents == null) {
    return { text: "Not involved", color: "muted" };
  }

  // Negative share means you're owed, positive means you owe
  // But yourShareCents is always the user's split amount (positive),
  // so we just show their share
  return {
    text: formatCentsForInvolvement(yourShareCents),
    color: "teal",
  };
}

function formatCentsForInvolvement(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `-$${dollars.toFixed(2)}`;
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
