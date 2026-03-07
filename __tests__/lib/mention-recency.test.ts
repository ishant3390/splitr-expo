import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getRecentMentions,
  trackMention,
  clearRecentMentions,
  type RecentMention,
} from "@/lib/mention-recency";

const RECENT_MENTIONS_KEY = "@splitr/recent_mentions";

describe("mention-recency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecentMentions", () => {
    it("returns empty array when nothing stored", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await getRecentMentions();
      expect(result).toEqual([]);
    });

    it("returns empty array on invalid JSON", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not json");
      const result = await getRecentMentions();
      expect(result).toEqual([]);
    });

    it("returns mentions sorted by lastMentionedAt DESC", async () => {
      const stored: RecentMention[] = [
        { id: "userId:a", name: "Alice", isGuest: false, lastMentionedAt: "2026-03-01T00:00:00Z" },
        { id: "userId:b", name: "Bob", isGuest: false, lastMentionedAt: "2026-03-05T00:00:00Z" },
        { id: "userId:c", name: "Charlie", isGuest: false, lastMentionedAt: "2026-03-03T00:00:00Z" },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stored));
      const result = await getRecentMentions();
      expect(result[0].name).toBe("Bob");
      expect(result[1].name).toBe("Charlie");
      expect(result[2].name).toBe("Alice");
    });
  });

  describe("trackMention", () => {
    it("tracks a new mention", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const mention: RecentMention = {
        id: "userId:a",
        name: "Alice",
        isGuest: false,
        lastMentionedAt: "2026-03-07T00:00:00Z",
      };
      await trackMention(mention);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        RECENT_MENTIONS_KEY,
        expect.stringContaining("Alice")
      );
    });

    it("upserts existing mention with new timestamp", async () => {
      const existing: RecentMention[] = [
        { id: "userId:a", name: "Alice", isGuest: false, lastMentionedAt: "2026-03-01T00:00:00Z" },
        { id: "userId:b", name: "Bob", isGuest: false, lastMentionedAt: "2026-03-02T00:00:00Z" },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await trackMention({
        id: "userId:a",
        name: "Alice",
        isGuest: false,
        lastMentionedAt: "2026-03-07T00:00:00Z",
      });

      const savedArg = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved: RecentMention[] = JSON.parse(savedArg);
      // Alice should be first (most recent) and no duplicate
      expect(saved[0].id).toBe("userId:a");
      expect(saved[0].lastMentionedAt).toBe("2026-03-07T00:00:00Z");
      expect(saved).toHaveLength(2);
    });

    it("handles invalid JSON in storage gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not valid json");
      const mention: RecentMention = {
        id: "userId:a",
        name: "Alice",
        isGuest: false,
        lastMentionedAt: "2026-03-07T00:00:00Z",
      };
      await trackMention(mention);
      const savedArg = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved: RecentMention[] = JSON.parse(savedArg);
      // getRecentMentions returns [] on invalid JSON, so only the new mention is stored
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe("userId:a");
    });

    it("caps at 20 entries", async () => {
      const existing: RecentMention[] = Array.from({ length: 20 }, (_, i) => ({
        id: `userId:${i}`,
        name: `User ${i}`,
        isGuest: false,
        lastMentionedAt: `2026-03-0${String(1 + (i % 9)).padStart(1, "0")}T00:00:00Z`,
      }));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await trackMention({
        id: "userId:new",
        name: "New User",
        isGuest: false,
        lastMentionedAt: "2026-03-07T12:00:00Z",
      });

      const savedArg = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved: RecentMention[] = JSON.parse(savedArg);
      expect(saved).toHaveLength(20);
      expect(saved[0].id).toBe("userId:new");
    });
  });

  describe("clearRecentMentions", () => {
    it("removes the storage key", async () => {
      await clearRecentMentions();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(RECENT_MENTIONS_KEY);
    });
  });
});
