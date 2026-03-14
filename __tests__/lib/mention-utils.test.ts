import {
  detectTrigger,
  filterContacts,
  filterGroups,
  insertMention,
  replaceMentionsForWire,
  parseMentionsForDisplay,
  membersToContacts,
  dedupeContacts,
  mergeWithRecency,
} from "@/lib/mention-utils";
import type { ContactDto, GroupDto, GroupMemberDto, MentionRecord } from "@/lib/types";
import type { RecentMention } from "@/lib/mention-recency";

// ---- membersToContacts ----

describe("membersToContacts", () => {
  it("maps members with user to ContactDto", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", user: { id: "u1", name: "Alice", email: "alice@test.com" } },
      { id: "m2", user: { id: "u2", name: "Bob", email: "bob@test.com", avatarUrl: "https://img.com/bob" } },
    ];
    const result = membersToContacts(members);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      userId: "u1",
      name: "Alice",
      email: "alice@test.com",
      avatarUrl: undefined,
      isGuest: false,
    });
  });

  it("maps guest members to ContactDto", () => {
    const members: GroupMemberDto[] = [
      { id: "m1", guestUser: { id: "g1", name: "Guest Alex", email: "alex@test.com" } },
    ];
    const result = membersToContacts(members);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      guestUserId: "g1",
      name: "Guest Alex",
      email: "alex@test.com",
      isGuest: true,
    });
  });

  it("skips members with neither user nor guestUser", () => {
    const members: GroupMemberDto[] = [
      { id: "m1" },
      { id: "m2", user: { id: "u1", name: "Alice", email: "a@t.com" } },
    ];
    const result = membersToContacts(members);
    expect(result).toHaveLength(1);
  });

  it("prefers user over guestUser when both are present", () => {
    const members: GroupMemberDto[] = [
      {
        id: "m1",
        user: { id: "u1", name: "Alice (user)", email: "alice@test.com", avatarUrl: "https://img.com/alice" },
        guestUser: { id: "g1", name: "Alice (guest)", email: "alice-guest@test.com" },
      },
    ];
    const result = membersToContacts(members);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      userId: "u1",
      name: "Alice (user)",
      email: "alice@test.com",
      avatarUrl: "https://img.com/alice",
      isGuest: false,
    });
    // Should NOT have guestUserId
    expect(result[0]).not.toHaveProperty("guestUserId");
  });
});

// ---- dedupeContacts ----

describe("dedupeContacts", () => {
  it("removes duplicates by userId", () => {
    const contacts: ContactDto[] = [
      { userId: "u1", name: "Alice", isGuest: false },
      { userId: "u1", name: "Alice (dup)", isGuest: false },
      { userId: "u2", name: "Bob", isGuest: false },
    ];
    const result = dedupeContacts(contacts);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
  });

  it("removes duplicates by guestUserId", () => {
    const contacts: ContactDto[] = [
      { guestUserId: "g1", name: "Guest", isGuest: true },
      { guestUserId: "g1", name: "Guest Dup", isGuest: true },
    ];
    const result = dedupeContacts(contacts);
    expect(result).toHaveLength(1);
  });

  it("deduplicates mixed userId and guestUserId contacts independently", () => {
    const contacts: ContactDto[] = [
      { userId: "u1", name: "Alice", isGuest: false },
      { guestUserId: "g1", name: "Guest Bob", isGuest: true },
      { userId: "u1", name: "Alice Dup", isGuest: false },
      { guestUserId: "g1", name: "Guest Bob Dup", isGuest: true },
      { userId: "u2", name: "Charlie", isGuest: false },
    ];
    const result = dedupeContacts(contacts);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual(["Alice", "Guest Bob", "Charlie"]);
  });

  it("falls back to name as dedup key when no userId or guestUserId", () => {
    const contacts: ContactDto[] = [
      { name: "Unknown", isGuest: false },
      { name: "Unknown", isGuest: false },
      { name: "Other", isGuest: false },
    ];
    const result = dedupeContacts(contacts);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(["Unknown", "Other"]);
  });
});

// ---- mergeWithRecency ----

describe("mergeWithRecency", () => {
  const contacts: ContactDto[] = [
    { userId: "u1", name: "Alice", isGuest: false },
    { userId: "u2", name: "Bob", isGuest: false },
    { userId: "u3", name: "Charlie", isGuest: false },
  ];

  it("returns contacts as-is when no recents", () => {
    const result = mergeWithRecency(contacts, []);
    expect(result).toEqual(contacts);
  });

  it("puts recent contacts first", () => {
    const recents: RecentMention[] = [
      { id: "userId:u3", name: "Charlie", isGuest: false, lastMentionedAt: "2026-03-07T00:00:00Z" },
    ];
    const result = mergeWithRecency(contacts, recents);
    expect(result[0].name).toBe("Charlie");
    expect(result).toHaveLength(3);
  });

  it("orders multiple recents by lastMentionedAt DESC", () => {
    const recents: RecentMention[] = [
      { id: "userId:u2", name: "Bob", isGuest: false, lastMentionedAt: "2026-03-07T00:00:00Z" },
      { id: "userId:u3", name: "Charlie", isGuest: false, lastMentionedAt: "2026-03-06T00:00:00Z" },
    ];
    const result = mergeWithRecency(contacts, recents);
    expect(result[0].name).toBe("Bob");
    expect(result[1].name).toBe("Charlie");
    expect(result[2].name).toBe("Alice");
  });

  it("produces no duplicates", () => {
    const recents: RecentMention[] = [
      { id: "userId:u1", name: "Alice", isGuest: false, lastMentionedAt: "2026-03-07T00:00:00Z" },
    ];
    const result = mergeWithRecency(contacts, recents);
    expect(result).toHaveLength(3);
    const names = result.map((c) => c.name);
    expect(new Set(names).size).toBe(3);
  });

  it("handles guest user contacts with guestUserId-based keys", () => {
    const mixedContacts: ContactDto[] = [
      { userId: "u1", name: "Alice", isGuest: false },
      { guestUserId: "g1", name: "Guest Dan", isGuest: true },
      { userId: "u2", name: "Bob", isGuest: false },
    ];
    const recents: RecentMention[] = [
      { id: "guestUserId:g1", name: "Guest Dan", isGuest: true, lastMentionedAt: "2026-03-07T00:00:00Z" },
    ];
    const result = mergeWithRecency(mixedContacts, recents);
    // Guest Dan should be first (recent), then Alice & Bob alphabetically
    expect(result[0].name).toBe("Guest Dan");
    expect(result[1].name).toBe("Alice");
    expect(result[2].name).toBe("Bob");
    expect(result).toHaveLength(3);
  });

  it("ignores recents that have no matching contact", () => {
    const recents: RecentMention[] = [
      { id: "userId:u999", name: "Nobody", isGuest: false, lastMentionedAt: "2026-03-07T00:00:00Z" },
    ];
    const result = mergeWithRecency(contacts, recents);
    // All contacts returned, no extra entry for u999
    expect(result).toHaveLength(3);
    // Sorted alphabetically since no recents match
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Bob");
    expect(result[2].name).toBe("Charlie");
  });
});

// ---- detectTrigger ----

describe("detectTrigger", () => {
  it("detects @ at start of text", () => {
    expect(detectTrigger("@sar", 4)).toEqual({
      trigger: "@",
      query: "sar",
      startIndex: 0,
    });
  });

  it("detects @ after space", () => {
    expect(detectTrigger("hello @sar", 10)).toEqual({
      trigger: "@",
      query: "sar",
      startIndex: 6,
    });
  });

  it("detects # at start of text", () => {
    expect(detectTrigger("#bea", 4)).toEqual({
      trigger: "#",
      query: "bea",
      startIndex: 0,
    });
  });

  it("detects # after space", () => {
    expect(detectTrigger("in #beach", 9)).toEqual({
      trigger: "#",
      query: "beach",
      startIndex: 3,
    });
  });

  it("returns null when no trigger", () => {
    expect(detectTrigger("hello world", 11)).toBeNull();
  });

  it("returns null when @ is mid-word (not preceded by space)", () => {
    expect(detectTrigger("email@test", 10)).toBeNull();
  });

  it("returns empty query when just @ typed", () => {
    expect(detectTrigger("@", 1)).toEqual({
      trigger: "@",
      query: "",
      startIndex: 0,
    });
  });

  it("returns null when cursor is before the trigger", () => {
    expect(detectTrigger("hello @sarah", 5)).toBeNull();
  });

  it("detects trigger after newline", () => {
    expect(detectTrigger("hello\n@sar", 10)).toEqual({
      trigger: "@",
      query: "sar",
      startIndex: 6,
    });
  });

  it("returns null when space follows trigger query", () => {
    // cursor is after "sarah " — space breaks the trigger
    expect(detectTrigger("@sarah ", 7)).toBeNull();
  });
});

// ---- filterContacts ----

describe("filterContacts", () => {
  const contacts: ContactDto[] = [
    { userId: "u1", name: "Sarah Chen", email: "sarah@test.com", isGuest: false },
    { userId: "u2", name: "Mike Johnson", email: "mike@test.com", isGuest: false },
    { userId: "u3", name: "Sarah Miller", email: "smiller@test.com", isGuest: false },
    { guestUserId: "g1", name: "Alex", isGuest: true },
    { userId: "u4", name: "Bob", email: "bob@test.com", isGuest: false },
    { userId: "u5", name: "Charlie", email: "charlie@test.com", isGuest: false },
    { userId: "u6", name: "Diana", email: "diana@test.com", isGuest: false },
  ];

  it("returns first 5 when query is empty", () => {
    expect(filterContacts(contacts, "")).toHaveLength(5);
  });

  it("filters by name case-insensitively", () => {
    const result = filterContacts(contacts, "sar");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Sarah Chen");
    expect(result[1].name).toBe("Sarah Miller");
  });

  it("prioritizes startsWith over includes", () => {
    const result = filterContacts(contacts, "mi");
    expect(result[0].name).toBe("Mike Johnson");
  });

  it("returns empty array when no match", () => {
    expect(filterContacts(contacts, "xyz")).toEqual([]);
  });

  it("limits to 5 results", () => {
    expect(filterContacts(contacts, "").length).toBeLessThanOrEqual(5);
  });
});

// ---- filterGroups ----

describe("filterGroups", () => {
  const groups: GroupDto[] = [
    { id: "g1", name: "Beach Trip", emoji: "🏖️", isArchived: false, createdAt: "", updatedAt: "" },
    { id: "g2", name: "Roommates", isArchived: false, createdAt: "", updatedAt: "" },
    { id: "g3", name: "Old Trip", isArchived: true, createdAt: "", updatedAt: "" },
  ];

  it("excludes archived groups", () => {
    const result = filterGroups(groups, "");
    expect(result.find((g) => g.name === "Old Trip")).toBeUndefined();
  });

  it("filters by name case-insensitively", () => {
    const result = filterGroups(groups, "beach");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Beach Trip");
  });

  it("returns empty when no match", () => {
    expect(filterGroups(groups, "xyz")).toEqual([]);
  });
});

// ---- insertMention ----

describe("insertMention", () => {
  it("inserts mention at end of text", () => {
    const { newText, newCursorPos } = insertMention("hello @sar", "Sarah", "@", 6, 10);
    expect(newText).toBe("hello @Sarah ");
    expect(newCursorPos).toBe(13);
  });

  it("inserts mention at start of text", () => {
    const { newText } = insertMention("@mi", "Mike", "@", 0, 3);
    expect(newText).toBe("@Mike ");
  });

  it("inserts group mention", () => {
    const { newText } = insertMention("in #bea", "Beach Trip", "#", 3, 7);
    expect(newText).toBe("in #Beach Trip ");
  });

  it("preserves text after cursor", () => {
    const { newText } = insertMention("@sar and more", "Sarah", "@", 0, 4);
    expect(newText).toBe("@Sarah  and more");
  });
});

// ---- replaceMentionsForWire ----

describe("replaceMentionsForWire", () => {
  it("transforms single mention", () => {
    const mentions: MentionRecord[] = [
      { trigger: "@", displayName: "Sarah", id: "userId:abc123" },
    ];
    expect(replaceMentionsForWire("Split $50 with @Sarah", mentions)).toBe(
      "Split $50 with @[Sarah](userId:abc123)"
    );
  });

  it("transforms multiple mentions", () => {
    const mentions: MentionRecord[] = [
      { trigger: "@", displayName: "Sarah", id: "userId:abc" },
      { trigger: "#", displayName: "Beach Trip", id: "groupId:xyz" },
    ];
    expect(
      replaceMentionsForWire("@Sarah in #Beach Trip", mentions)
    ).toBe("@[Sarah](userId:abc) in #[Beach Trip](groupId:xyz)");
  });

  it("returns text unchanged when no mentions", () => {
    expect(replaceMentionsForWire("hello world", [])).toBe("hello world");
  });

  it("handles guest user mentions", () => {
    const mentions: MentionRecord[] = [
      { trigger: "@", displayName: "Alex", id: "guestUserId:g1" },
    ];
    expect(replaceMentionsForWire("@Alex owes", mentions)).toBe(
      "@[Alex](guestUserId:g1) owes"
    );
  });
});

// ---- parseMentionsForDisplay ----

describe("parseMentionsForDisplay", () => {
  it("returns single text segment for plain text", () => {
    const result = parseMentionsForDisplay("hello world");
    expect(result).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("parses a single @ mention", () => {
    const result = parseMentionsForDisplay("Split with @[Sarah](userId:abc)");
    expect(result).toEqual([
      { type: "text", value: "Split with " },
      { type: "mention", value: "Sarah", mentionType: "@" },
    ]);
  });

  it("parses a # mention", () => {
    const result = parseMentionsForDisplay("in #[Beach Trip](groupId:xyz)");
    expect(result).toEqual([
      { type: "text", value: "in " },
      { type: "mention", value: "Beach Trip", mentionType: "#" },
    ]);
  });

  it("parses mixed mentions", () => {
    const result = parseMentionsForDisplay(
      "@[Sarah](userId:abc) owes in #[Beach Trip](groupId:xyz)"
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: "mention", value: "Sarah", mentionType: "@" });
    expect(result[1]).toEqual({ type: "text", value: " owes in " });
    expect(result[2]).toEqual({ type: "mention", value: "Beach Trip", mentionType: "#" });
  });

  it("handles adjacent mentions", () => {
    const result = parseMentionsForDisplay(
      "@[Sarah](userId:a)@[Mike](userId:b)"
    );
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("mention");
    expect(result[1].type).toBe("mention");
  });

  it("returns single text segment for empty string", () => {
    const result = parseMentionsForDisplay("");
    expect(result).toEqual([{ type: "text", value: "" }]);
  });
});
