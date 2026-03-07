import type { ContactDto, GroupDto, GroupMemberDto, MentionRecord } from "@/lib/types";
import type { RecentMention } from "./mention-recency";

export interface TriggerResult {
  trigger: "@" | "#";
  query: string;
  startIndex: number;
}

export interface MentionSegment {
  type: "text" | "mention";
  value: string;
  mentionType?: "@" | "#";
}

/**
 * Detect an active @/# trigger at the cursor position.
 * Returns the trigger character, the query typed after it, and its position.
 */
export function detectTrigger(
  text: string,
  cursorPos: number
): TriggerResult | null {
  const before = text.slice(0, cursorPos);

  // Find the last @ or # that could be a trigger
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];

    // Stop scanning at whitespace (no trigger in this word)
    if (ch === " " || ch === "\n") return null;

    if (ch === "@" || ch === "#") {
      // Trigger must be at start of text or preceded by whitespace
      if (i > 0 && before[i - 1] !== " " && before[i - 1] !== "\n")
        return null;

      const query = before.slice(i + 1);
      return { trigger: ch, query, startIndex: i };
    }
  }

  return null;
}

/**
 * Filter contacts by name (case-insensitive). startsWith matches first, then includes.
 */
export function filterContacts(
  contacts: ContactDto[],
  query: string
): ContactDto[] {
  if (!query) return contacts.slice(0, 5);
  const q = query.toLowerCase();
  const starts = contacts.filter((c) => c.name.toLowerCase().startsWith(q));
  const includes = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) && !c.name.toLowerCase().startsWith(q)
  );
  return [...starts, ...includes].slice(0, 5);
}

/**
 * Filter groups by name (case-insensitive). Excludes archived.
 */
export function filterGroups(groups: GroupDto[], query: string): GroupDto[] {
  const active = groups.filter((g) => !g.isArchived);
  if (!query) return active.slice(0, 5);
  const q = query.toLowerCase();
  const starts = active.filter((g) => g.name.toLowerCase().startsWith(q));
  const includes = active.filter(
    (g) =>
      g.name.toLowerCase().includes(q) && !g.name.toLowerCase().startsWith(q)
  );
  return [...starts, ...includes].slice(0, 5);
}

/**
 * Insert a mention into the text, replacing the trigger+query.
 * Returns the new text and where the cursor should be placed.
 */
export function insertMention(
  text: string,
  displayName: string,
  triggerChar: "@" | "#",
  triggerStartIndex: number,
  cursorPos: number
): { newText: string; newCursorPos: number } {
  const before = text.slice(0, triggerStartIndex);
  const after = text.slice(cursorPos);
  const mention = `${triggerChar}${displayName} `;
  return {
    newText: before + mention + after,
    newCursorPos: before.length + mention.length,
  };
}

/**
 * Transform display text to wire format before sending to BE.
 * Replaces `@Name` with `@[Name](id)` for each stored mention.
 */
export function replaceMentionsForWire(
  text: string,
  mentions: MentionRecord[]
): string {
  let result = text;
  // Process longest names first to avoid partial matches
  const sorted = [...mentions].sort(
    (a, b) => b.displayName.length - a.displayName.length
  );
  for (const m of sorted) {
    const pattern = `${m.trigger}${m.displayName}`;
    result = result.replace(pattern, `${m.trigger}[${m.displayName}](${m.id})`);
  }
  return result;
}

/**
 * Convert group members into ContactDto[].
 * Skips members with neither user nor guestUser.
 */
export function membersToContacts(members: GroupMemberDto[]): ContactDto[] {
  const result: ContactDto[] = [];
  for (const m of members) {
    if (m.user) {
      result.push({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        isGuest: false,
      });
    } else if (m.guestUser) {
      result.push({
        guestUserId: m.guestUser.id,
        name: m.guestUser.name,
        email: m.guestUser.email,
        isGuest: true,
      });
    }
  }
  return result;
}

/**
 * Deduplicate contacts by userId (or guestUserId for guests).
 * Falls back to name+email composite key to avoid collisions between
 * different people who happen to share the same name.
 * Keeps the first occurrence.
 */
export function dedupeContacts(contacts: ContactDto[]): ContactDto[] {
  const seen = new Set<string>();
  return contacts.filter((c) => {
    const key = c.userId
      ? `userId:${c.userId}`
      : c.guestUserId
        ? `guestUserId:${c.guestUserId}`
        : `name:${c.name}|email:${c.email ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Merge contacts with recent mentions: recents first (by lastMentionedAt DESC),
 * then remaining contacts alphabetically. No duplicates.
 */
export function mergeWithRecency(
  contacts: ContactDto[],
  recents: RecentMention[]
): ContactDto[] {
  if (recents.length === 0) return contacts;

  const recentMap = new Map<string, number>();
  for (let i = 0; i < recents.length; i++) {
    recentMap.set(recents[i].id, i); // already sorted DESC by caller
  }

  const contactKey = (c: ContactDto) =>
    c.userId
      ? `userId:${c.userId}`
      : c.guestUserId
        ? `guestUserId:${c.guestUserId}`
        : `name:${c.name}|email:${c.email ?? ""}`;

  const recentContacts: ContactDto[] = [];
  const otherContacts: ContactDto[] = [];

  for (const c of contacts) {
    const key = contactKey(c);
    if (recentMap.has(key)) {
      recentContacts.push(c);
    } else {
      otherContacts.push(c);
    }
  }

  // Sort recent by their recency order
  recentContacts.sort((a, b) => {
    const ai = recentMap.get(contactKey(a)) ?? Infinity;
    const bi = recentMap.get(contactKey(b)) ?? Infinity;
    return ai - bi;
  });

  // Sort others alphabetically
  otherContacts.sort((a, b) => a.name.localeCompare(b.name));

  return [...recentContacts, ...otherContacts];
}

const MENTION_REGEX = /(@|#)\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse wire-format content into segments for styled rendering in bubbles.
 */
export function parseMentionsForDisplay(content: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    segments.push({
      type: "mention",
      value: match[2], // display name
      mentionType: match[1] as "@" | "#",
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  // If no mentions found, return single text segment
  if (segments.length === 0) {
    segments.push({ type: "text", value: content });
  }

  return segments;
}
