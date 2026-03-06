jest.mock("@/lib/api", () => ({
  groupsApi: {
    createExpense: jest.fn(),
  },
}));
jest.mock("@/lib/query", () => ({
  invalidateAfterExpenseChange: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getQueuedExpenses,
  addToQueue,
  removeFromQueue,
  clearQueue,
  syncQueuedExpenses,
  generateClientId,
  type QueuedExpense,
} from "@/lib/offline";

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const QUEUE_KEY = "@splitr/expense_queue";

function makeItem(overrides: Partial<QueuedExpense> = {}): QueuedExpense {
  return {
    clientId: "exp_123",
    groupId: "g1",
    groupName: "Trip",
    request: {
      description: "Lunch",
      amountCents: 1500,
      paidByUserId: "u1",
      categoryId: "c1",
      splits: [{ userId: "u1", amountCents: 1500 }],
    } as any,
    description: "Lunch",
    amountCents: 1500,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getQueuedExpenses", () => {
  it("returns empty array when nothing stored", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await getQueuedExpenses();
    expect(result).toEqual([]);
  });

  it("parses stored JSON array", async () => {
    const items = [makeItem()];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));
    const result = await getQueuedExpenses();
    expect(result).toHaveLength(1);
    expect(result[0].clientId).toBe("exp_123");
  });

  it("returns empty array on parse error", async () => {
    mockAsyncStorage.getItem.mockResolvedValue("invalid json{");
    const result = await getQueuedExpenses();
    expect(result).toEqual([]);
  });

  it("returns empty array if stored value is not an array", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ foo: "bar" }));
    const result = await getQueuedExpenses();
    expect(result).toEqual([]);
  });
});

describe("addToQueue", () => {
  it("adds item to empty queue", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const item = makeItem();
    await addToQueue(item);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      QUEUE_KEY,
      expect.stringContaining("exp_123")
    );
  });

  it("prevents duplicate clientIds", async () => {
    const existing = [makeItem()];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    await addToQueue(makeItem()); // same clientId
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("appends to existing queue", async () => {
    const existing = [makeItem()];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const newItem = makeItem({ clientId: "exp_456", description: "Dinner" });
    await addToQueue(newItem);
    const savedJson = (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const saved = JSON.parse(savedJson);
    expect(saved).toHaveLength(2);
    expect(saved[1].clientId).toBe("exp_456");
  });
});

describe("removeFromQueue", () => {
  it("removes item by clientId", async () => {
    const items = [makeItem(), makeItem({ clientId: "exp_456" })];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));
    await removeFromQueue("exp_123");
    const savedJson = (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const saved = JSON.parse(savedJson);
    expect(saved).toHaveLength(1);
    expect(saved[0].clientId).toBe("exp_456");
  });
});

describe("clearQueue", () => {
  it("removes the queue key from storage", async () => {
    await clearQueue();
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(QUEUE_KEY);
  });
});

describe("syncQueuedExpenses", () => {
  it("returns empty result when queue is empty", async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await syncQueuedExpenses("token");
    expect(result).toEqual({ synced: [], failed: [] });
  });

  it("syncs items and removes successful ones", async () => {
    const items = [makeItem()];
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(items)) // initial load
      .mockResolvedValueOnce(JSON.stringify(items)); // load for removeFromQueue

    // Mock groupsApi.createExpense to succeed
    const { groupsApi } = require("@/lib/api");
    groupsApi.createExpense = jest.fn().mockResolvedValue({});

    const result = await syncQueuedExpenses("token");
    expect(result.synced).toContain("exp_123");
    expect(result.failed).toHaveLength(0);
    expect(groupsApi.createExpense).toHaveBeenCalledWith("g1", items[0].request, "token");
  });

  it("tracks failed items with error and attempt count", async () => {
    const items = [makeItem()];
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(items)) // initial load
      .mockResolvedValueOnce(JSON.stringify(items)); // load for updateQueueItem

    const { groupsApi } = require("@/lib/api");
    groupsApi.createExpense = jest.fn().mockRejectedValue(new Error("Network error"));

    const result = await syncQueuedExpenses("token");
    expect(result.synced).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe("Network error");

    // Should have updated the item with attempts+1 and lastError
    const savedJson = (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const saved = JSON.parse(savedJson);
    expect(saved[0].attempts).toBe(1);
    expect(saved[0].lastError).toBe("Network error");
  });
});

describe("generateClientId", () => {
  it("returns unique IDs", () => {
    const id1 = generateClientId();
    const id2 = generateClientId();
    expect(id1).not.toBe(id2);
  });

  it("starts with exp_ prefix", () => {
    const id = generateClientId();
    expect(id).toMatch(/^exp_/);
  });
});
