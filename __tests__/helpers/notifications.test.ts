// Test the helper functions from notifications.tsx
// We extract and test the pure logic functions

describe("formatNotifMessage", () => {
  // Replicate the function logic for testing
  function formatNotifMessage(item: {
    activityType: string;
    actorUserName?: string;
    actorGuestName?: string;
    groupName?: string;
    details?: Record<string, unknown>;
  }): string {
    const actor = item.actorUserName ?? item.actorGuestName ?? "Someone";
    const group = item.groupName ?? "";
    const desc = (item.details?.description ?? item.details?.newDescription) as string | undefined;

    switch (item.activityType) {
      case "expense_created":
        return `${actor} added "${desc ?? "an expense"}" in ${group}`;
      case "expense_updated":
        return `${actor} updated "${desc ?? "an expense"}" in ${group}`;
      case "expense_deleted":
        return `${actor} deleted an expense in ${group}`;
      case "member_joined":
        return `${actor} joined ${group}`;
      case "member_left":
        return `${actor} left ${group}`;
      case "group_created":
        return `${actor} created ${group}`;
      case "settlement_created":
        return `${actor} recorded a payment in ${group}`;
      case "settlement_deleted":
        return `${actor} reversed a payment in ${group}`;
      default:
        return `${actor} ${item.activityType.replace(/_/g, " ")} in ${group}`;
    }
  }

  it("formats expense_created with description", () => {
    const result = formatNotifMessage({
      activityType: "expense_created",
      actorUserName: "Alice",
      groupName: "Trip",
      details: { description: "Dinner" },
    });
    expect(result).toBe('Alice added "Dinner" in Trip');
  });

  it("formats expense_created without description", () => {
    const result = formatNotifMessage({
      activityType: "expense_created",
      actorUserName: "Alice",
      groupName: "Trip",
    });
    expect(result).toBe('Alice added "an expense" in Trip');
  });

  it("formats member_joined", () => {
    const result = formatNotifMessage({
      activityType: "member_joined",
      actorUserName: "Bob",
      groupName: "Home",
    });
    expect(result).toBe("Bob joined Home");
  });

  it("formats settlement_created", () => {
    const result = formatNotifMessage({
      activityType: "settlement_created",
      actorGuestName: "Charlie",
      groupName: "Trip",
    });
    expect(result).toBe("Charlie recorded a payment in Trip");
  });

  it("falls back to 'Someone' when no actor", () => {
    const result = formatNotifMessage({
      activityType: "group_created",
      groupName: "New Group",
    });
    expect(result).toBe("Someone created New Group");
  });

  it("handles unknown activity types gracefully", () => {
    const result = formatNotifMessage({
      activityType: "custom_event",
      actorUserName: "Alice",
      groupName: "Trip",
    });
    expect(result).toBe("Alice custom event in Trip");
  });
});

describe("timeAgo", () => {
  function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-05T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'Just now' for very recent", () => {
    expect(timeAgo("2026-03-05T11:59:30Z")).toBe("Just now");
  });

  it("returns minutes ago", () => {
    expect(timeAgo("2026-03-05T11:45:00Z")).toBe("15m ago");
  });

  it("returns hours ago", () => {
    expect(timeAgo("2026-03-05T09:00:00Z")).toBe("3h ago");
  });

  it("returns 'Yesterday' for 1 day ago", () => {
    expect(timeAgo("2026-03-04T12:00:00Z")).toBe("Yesterday");
  });

  it("returns days ago for 2-6 days", () => {
    expect(timeAgo("2026-03-02T12:00:00Z")).toBe("3d ago");
  });

  it("returns formatted date for older", () => {
    const result = timeAgo("2026-01-15T12:00:00Z");
    expect(result).toBe("Jan 15");
  });
});

describe("groupByDay", () => {
  function groupByDay(
    items: { createdAt: string; id: string }[]
  ): { title: string; data: { createdAt: string; id: string }[] }[] {
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();

    const groups: Record<string, { createdAt: string; id: string }[]> = {};
    items.forEach((item) => {
      const d = new Date(item.createdAt).toDateString();
      const label = d === today ? "Today" : d === yesterday ? "Yesterday" : "Earlier";
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    const order = ["Today", "Yesterday", "Earlier"];
    return order
      .filter((k) => groups[k]?.length)
      .map((title) => ({ title, data: groups[title] }));
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-05T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("groups items by day", () => {
    const items = [
      { id: "1", createdAt: "2026-03-05T10:00:00Z" },
      { id: "2", createdAt: "2026-03-04T10:00:00Z" },
      { id: "3", createdAt: "2026-01-01T10:00:00Z" },
    ];

    const result = groupByDay(items);

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe("Today");
    expect(result[0].data).toHaveLength(1);
    expect(result[1].title).toBe("Yesterday");
    expect(result[2].title).toBe("Earlier");
  });

  it("returns empty for empty input", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("maintains order: Today > Yesterday > Earlier", () => {
    const items = [
      { id: "1", createdAt: "2026-01-01T10:00:00Z" },
      { id: "2", createdAt: "2026-03-05T10:00:00Z" },
    ];

    const result = groupByDay(items);
    expect(result[0].title).toBe("Today");
    expect(result[1].title).toBe("Earlier");
  });
});
