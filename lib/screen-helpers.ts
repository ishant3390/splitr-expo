// Pure helper functions extracted from screen components for testability.

import type { GroupMemberDto } from "./types";

// Re-export icon utilities from centralized module
export { getCategoryIcon, getActivityIcon, getPaymentMethodIcon, inferCategoryIconFromDescription } from "./category-icons";

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

import { KEYWORD_TO_CATEGORY } from "./category-keywords";
export { KEYWORD_TO_CATEGORY };

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
  currentUserId: string | null | undefined,
  options?: { includeGroupName?: boolean }
): string {
  const isYou = !!(currentUserId && activity.actorUserId === currentUserId);
  const fullName = activity.actorUserName ?? activity.actorGuestName ?? "Someone";
  const actorName = isYou ? "You" : shortenName(fullName);

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

  // Resolve group suffix for cross-group screens (Home, Activity tab)
  const resolvedGroupName = activity.groupName ?? (activity.details?.groupName as string) ?? "";
  const groupSuffix = options?.includeGroupName && resolvedGroupName
    ? ` in ${resolvedGroupName}`
    : "";

  switch (activity.activityType) {
    case "expense_created":
    case "expense_updated":
    case "expense_deleted":
      return description
        ? `${actorName} ${verb} ${description}${groupSuffix}`
        : `${actorName} ${verb} an expense${groupSuffix}`;
    case "settlement_created":
      return `${actorName} ${verb}${groupSuffix}`;
    case "member_joined":
    case "member_joined_via_invite":
      return `${actorName} ${verb}`; // group name shown in subtitle on cross-group screens
    case "member_added": {
      const targetId = activity.details?.targetUserId as string | undefined;
      const isTargetYou = !!(currentUserId && targetId === currentUserId);
      const targetFullName = ((activity.details?.targetUserName ??
            activity.details?.memberName ??
            activity.details?.addedMemberName ??
            "a member") as string);
      const targetName = isTargetYou ? "you" : firstName(targetFullName);
      return `${actorName} ${verb} ${targetName}`;
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
      return `${actorName} ${verb}`;
    case "group_created":
    case "group_archived":
    case "group_unarchived":
    case "group_deleted":
    case "group_updated":
      return `${actorName} ${verb}`;
    default:
      return `${actorName}: ${verb}`;
  }
}

// --- Activity feed involvement indicators ---

export interface ActivityInvolvement {
  /** null = not an expense activity or no involvement data from BE */
  text: string | null;
  /** Semantic color token */
  color: "success" | "destructive" | "muted" | null;
  /** Optional amount in cents to display alongside the text */
  amountCents?: number;
}

/**
 * Returns involvement text + color for an activity item.
 * BE sends `yourShareCents` (absent = not involved), `yourPaidCents` (how much user paid),
 * and `involvedCount` on expense activities.
 *
 * When `yourPaidCents` is present and > 0, user is a payer → "you lent" (success/green).
 * Otherwise user only has a split → "you borrowed" (destructive/red).
 * Fallback when `yourPaidCents` is absent (backend not yet deployed): treat as non-payer.
 */
export function formatActivityInvolvement(
  activity: ActivityLogDto
): ActivityInvolvement {
  const isExpense = activity.activityType.startsWith("expense_");
  if (!isExpense) return { text: null, color: null };

  const involvedCount = activity.details?.involvedCount as number | undefined;
  if (involvedCount == null) return { text: null, color: null };

  const yourShareCents = activity.details?.yourShareCents as number | undefined;
  const yourPaidCents = (activity.details?.yourPaidCents as number | undefined) ?? 0;

  if (yourShareCents == null) {
    return { text: "Not involved", color: "muted" };
  }

  if (yourPaidCents > 0) {
    // User is a payer — they lent (paid - share)
    const lentAmount = yourPaidCents - yourShareCents;
    return { text: "you lent", color: "success", amountCents: lentAmount };
  }

  // User only has a split — they borrowed
  return { text: "you borrowed", color: "destructive", amountCents: yourShareCents };
}

/**
 * Resolves the group name for an activity item.
 * Falls back to details.groupName when the top-level groupName is absent.
 */
export function resolveActivityGroupName(activity: ActivityLogDto): string | null {
  const name = activity.groupName ?? (activity.details?.groupName as string) ?? null;
  return name || null;
}

/** Format cents as a dollar string (no sign prefix). */
export function formatCentsForInvolvement(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `$${dollars.toFixed(2)}`;
}

// --- Expense card display (Splitwise-style) ---

/** Shorten "Ajay Wadhara" → "Ajay W.", single name unchanged, empty → empty */
export function shortenName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export interface ExpenseCardDisplay {
  subtitle: string;
  rightLabel: string;
  rightAmountCents: number | null;
  rightColor: "success" | "destructive" | "muted";
}

/**
 * Compute Splitwise-style expense card display for the current user.
 * Shows "You paid £100" / "you lent £50" (green) or "Ajay W. paid £100" / "you borrowed £50" (red).
 */
export function computeExpenseCardDisplay(
  expense: {
    payers?: Array<{ user?: { id?: string; name?: string } | null; guestUser?: { id?: string; name?: string } | null; amountPaid: number }>;
    splits?: Array<{ user?: { id?: string } | null; guestUser?: { id?: string } | null; splitAmount: number }>;
    amountCents?: number;
    createdBy?: { name?: string } | null;
  },
  currentUserId: string | null | undefined,
  members?: Array<{ user?: { id?: string; name?: string } | null; guestUser?: { id?: string; name?: string } | null; displayName?: string }>,
  createdBy?: { name?: string } | null,
  formatAmount?: (cents: number) => string,
): ExpenseCardDisplay {
  const fmt = formatAmount ?? ((c: number) => `${(c / 100).toFixed(2)}`);
  const payers = expense.payers ?? [];
  const splits = expense.splits ?? [];
  const totalCents = expense.amountCents ?? payers.reduce((s, p) => s + p.amountPaid, 0);

  // Current user's paid total across all payers
  const userPaidTotal = currentUserId
    ? payers.filter((p) => (p.user?.id ?? p.guestUser?.id) === currentUserId).reduce((s, p) => s + p.amountPaid, 0)
    : 0;

  // Current user's split amount
  const userSplit = currentUserId
    ? splits.find((s) => (s.user?.id ?? s.guestUser?.id) === currentUserId)
    : undefined;
  const userSplitAmount = userSplit?.splitAmount ?? 0;

  // Resolve primary payer display name
  const primaryPayer = payers[0];
  const isCurrentUserPrimaryPayer = !!(currentUserId && (primaryPayer?.user?.id ?? primaryPayer?.guestUser?.id) === currentUserId);
  const fullPayerName = resolvePayerName(primaryPayer, members, createdBy ?? expense.createdBy);
  const payerDisplay = isCurrentUserPrimaryPayer ? "You" : shortenName(fullPayerName);

  const subtitle = `${payerDisplay} paid ${fmt(totalCents)}`;

  // Determine right side based on user involvement
  const isInvolved = userPaidTotal > 0 || userSplitAmount > 0;

  if (!isInvolved || !currentUserId) {
    return { subtitle, rightLabel: "not involved", rightAmountCents: null, rightColor: "muted" };
  }

  if (userPaidTotal > 0) {
    // User is a payer — they lent (paid - their share)
    return { subtitle, rightLabel: "you lent", rightAmountCents: userPaidTotal - userSplitAmount, rightColor: "success" };
  }

  // User only has a split (they borrowed)
  return { subtitle, rightLabel: "you borrowed", rightAmountCents: userSplitAmount, rightColor: "destructive" };
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
