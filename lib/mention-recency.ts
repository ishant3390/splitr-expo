import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_MENTIONS_KEY = "@splitr/recent_mentions";
const MAX_RECENT = 20;

export interface RecentMention {
  id: string; // "userId:abc" or "guestUserId:xyz"
  name: string;
  email?: string;
  isGuest: boolean;
  lastMentionedAt: string; // ISO timestamp
}

export async function getRecentMentions(): Promise<RecentMention[]> {
  const raw = await AsyncStorage.getItem(RECENT_MENTIONS_KEY);
  if (!raw) return [];
  try {
    const parsed: RecentMention[] = JSON.parse(raw);
    return parsed.sort(
      (a, b) =>
        new Date(b.lastMentionedAt).getTime() -
        new Date(a.lastMentionedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function trackMention(mention: RecentMention): Promise<void> {
  const existing = await getRecentMentions();
  const filtered = existing.filter((m) => m.id !== mention.id);
  const updated = [mention, ...filtered].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_MENTIONS_KEY, JSON.stringify(updated));
}

export async function clearRecentMentions(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_MENTIONS_KEY);
}
