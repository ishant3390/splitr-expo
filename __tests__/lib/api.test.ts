import { Platform } from "react-native";
import {
  usersApi,
  groupsApi,
  inviteApi,
  contactsApi,
  categoriesApi,
  expensesApi,
  settlementsApi,
  chatStream,
} from "@/lib/api";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// chatStream tests use the fetch-based web path
const originalPlatformOS = Platform.OS;


function mockResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

function mockErrorResponse(body: string, status: number) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("usersApi", () => {
  describe("me", () => {
    it("sends GET with auth header", async () => {
      const user = { id: "u1", name: "Test" };
      mockFetch.mockResolvedValue(mockResponse(user));

      const result = await usersApi.me("my-token");

      expect(result).toEqual(user);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/users/me"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  describe("updateMe", () => {
    it("sends PATCH with body", async () => {
      const updated = { id: "u1", name: "Updated" };
      mockFetch.mockResolvedValue(mockResponse(updated));

      await usersApi.updateMe({ name: "Updated" }, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/users/me"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        })
      );
    });
  });

  describe("activity", () => {
    it("flattens map response into array", async () => {
      const mapResponse = {
        activities: [
          { id: "a1", activityType: "expense_created", createdAt: "2026-01-01" },
          { id: "a2", activityType: "member_joined", createdAt: "2026-01-02" },
        ],
      };
      mockFetch.mockResolvedValue(mockResponse(mapResponse));

      const result = await usersApi.activity("token");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a1");
    });

    it("handles array response directly", async () => {
      const arrayResponse = [
        { id: "a1", activityType: "expense_created", createdAt: "2026-01-01" },
      ];
      mockFetch.mockResolvedValue(mockResponse(arrayResponse));

      const result = await usersApi.activity("token");

      expect(result).toHaveLength(1);
    });
  });

  describe("sync", () => {
    it("sends POST request", async () => {
      mockFetch.mockResolvedValue(mockResponse(""));

      await usersApi.sync("token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/users/sync"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("balance", () => {
    it("fetches aggregate balance", async () => {
      const balanceData = {
        totalOwedCents: 5000,
        totalOwesCents: 3000,
        netBalanceCents: 2000,
      };
      mockFetch.mockResolvedValue(mockResponse(balanceData));

      const result = await usersApi.balance("token");

      expect(result).toEqual(balanceData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/users/me/balance"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        })
      );
    });
  });
});

describe("groupsApi", () => {
  describe("list", () => {
    it("defaults to active status", async () => {
      mockFetch.mockResolvedValue(mockResponse([]));

      await groupsApi.list("token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups?status=active"),
        expect.anything()
      );
    });

    it("supports archived status", async () => {
      mockFetch.mockResolvedValue(mockResponse([]));

      await groupsApi.list("token", "archived");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups?status=archived"),
        expect.anything()
      );
    });
  });

  describe("get", () => {
    it("fetches single group", async () => {
      const group = { id: "g1", name: "Trip" };
      mockFetch.mockResolvedValue(mockResponse(group));

      const result = await groupsApi.get("g1", "token");

      expect(result).toEqual(group);
    });

    it("supports expand parameter", async () => {
      mockFetch.mockResolvedValue(mockResponse({}));

      await groupsApi.get("g1", "token", "members");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1?expand=members"),
        expect.anything()
      );
    });
  });

  describe("create", () => {
    it("sends POST with group data", async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "g1", name: "Trip" }));

      await groupsApi.create({ name: "Trip" }, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Trip" }),
        })
      );
    });
  });

  describe("update", () => {
    it("sends PATCH", async () => {
      mockFetch.mockResolvedValue(mockResponse({}));

      await groupsApi.update("g1", { isArchived: true }, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ isArchived: true }),
        })
      );
    });
  });

  describe("delete", () => {
    it("sends DELETE", async () => {
      mockFetch.mockResolvedValue(mockResponse(""));

      await groupsApi.delete("g1", "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("listMembers", () => {
    it("flattens map response", async () => {
      const mapResponse = {
        members: [
          { id: "m1", displayName: "Alice" },
          { id: "m2", displayName: "Bob" },
        ],
      };
      mockFetch.mockResolvedValue(mockResponse(mapResponse));

      const result = await groupsApi.listMembers("g1", "token");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe("addGuestMember", () => {
    it("posts to /members/guest", async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "m1" }));

      await groupsApi.addGuestMember("g1", { name: "Guest" }, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/members/guest"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Guest" }),
        })
      );
    });
  });

  describe("addMember", () => {
    it("sends POST to /members with body", async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "m1", displayName: "Alice" }));

      await groupsApi.addMember("g1", { userId: "u1" } as any, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/members"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: "u1" }),
        })
      );
    });
  });

  describe("updateMember", () => {
    it("sends PATCH to /members/{memberId} with body", async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "m1", displayName: "Alice Updated" }));

      await groupsApi.updateMember("g1", "m1", { displayName: "Alice Updated" } as any, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/members/m1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ displayName: "Alice Updated" }),
        })
      );
    });
  });

  describe("removeMember", () => {
    it("sends DELETE to /members/{memberId}", async () => {
      mockFetch.mockResolvedValue(mockResponse(""));

      await groupsApi.removeMember("g1", "m1", "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/members/m1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("activity", () => {
    it("fetches group activity and flattens map response", async () => {
      const mapResponse = {
        activities: [
          { id: "a1", activityType: "expense_created", createdAt: "2026-01-01" },
        ],
      };
      mockFetch.mockResolvedValue(mockResponse(mapResponse));

      const result = await groupsApi.activity("g1", "token");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/activity"),
        expect.anything()
      );
    });
  });

  describe("createExpense", () => {
    it("sends POST to /expenses with body", async () => {
      const expenseData = { description: "Dinner", amount: 5000, currency: "USD" };
      mockFetch.mockResolvedValue(mockResponse({ id: "e1", ...expenseData }));

      await groupsApi.createExpense("g1", expenseData as any, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/expenses"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(expenseData),
        })
      );
    });
  });

  describe("listExpenses", () => {
    it("supports query params", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], pagination: {}, summary: {} }));

      await groupsApi.listExpenses("g1", "token", { cursor: "abc" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("cursor=abc"),
        expect.anything()
      );
    });

    it("works without query params", async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: [], pagination: {}, summary: {} }));

      await groupsApi.listExpenses("g1", "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/expenses"),
        expect.anything()
      );
      // Ensure no query string is appended
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain("?");
    });
  });
});

describe("inviteApi", () => {
  describe("preview", () => {
    it("sends GET without auth", async () => {
      const preview = { groupId: "g1", name: "Trip", memberCount: 3 };
      mockFetch.mockResolvedValue(mockResponse(preview));

      const result = await inviteApi.preview("ABC123");

      expect(result).toEqual(preview);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/invite/ABC123"),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });

  describe("join", () => {
    it("sends POST with invite code", async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "m1" }));

      await inviteApi.join({ inviteCode: "ABC123" }, "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/join"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ inviteCode: "ABC123" }),
        })
      );
    });
  });

  describe("regenerate", () => {
    it("sends POST to regenerate endpoint", async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: "g1", inviteCode: "NEW123" }));

      await inviteApi.regenerate("g1", "token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/groups/g1/invite/regenerate"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});

describe("contactsApi", () => {
  it("flattens contacts response", async () => {
    const mapResponse = {
      contacts: [{ name: "Alice", isGuest: false }],
    };
    mockFetch.mockResolvedValue(mockResponse(mapResponse));

    const result = await contactsApi.list("token");

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe("Alice");
  });
});

describe("categoriesApi", () => {
  it("fetches categories list", async () => {
    const categories = [
      { id: "c1", name: "Food", icon: "restaurant" },
      { id: "c2", name: "Transport", icon: "car" },
    ];
    mockFetch.mockResolvedValue(mockResponse(categories));

    const result = await categoriesApi.list("token");

    expect(result).toEqual(categories);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/categories"),
      expect.anything()
    );
  });
});

describe("error handling", () => {
  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse("Not found", 404));

    await expect(usersApi.me("token")).rejects.toThrow("API 404: Not found");
  });

  it("throws on 500 error", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse("Server error", 500));

    await expect(groupsApi.list("token")).rejects.toThrow("API 500: Server error");
  });

  it("returns 'Unknown error' when text() fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.reject(new Error("text failed")),
    });

    await expect(usersApi.me("token")).rejects.toThrow("API 500: Unknown error");
  });

  it("returns empty object for empty response body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    });

    const result = await usersApi.me("token");

    expect(result).toEqual({});
  });
});

describe("settlementsApi", () => {
  it("lists settlements for a group", async () => {
    mockFetch.mockResolvedValue(mockResponse([]));

    await settlementsApi.list("g1", "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/groups/g1/settlements"),
      expect.anything()
    );
  });

  it("fetches suggestions", async () => {
    mockFetch.mockResolvedValue(mockResponse([]));

    await settlementsApi.suggestions("g1", "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/groups/g1/settlements/suggestions"),
      expect.anything()
    );
  });

  it("creates a settlement", async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: "s1" }));

    await settlementsApi.create(
      "g1",
      {
        payerUserId: "u1",
        payeeUserId: "u2",
        amount: 1000,
        currency: "USD",
        settlementDate: "2026-03-05",
      },
      "token"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/groups/g1/settlements"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deletes a settlement", async () => {
    mockFetch.mockResolvedValue(mockResponse(""));

    await settlementsApi.delete("s1", "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/settlements/s1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("gets a settlement by id", async () => {
    const settlement = { id: "s1", amount: 1000, currency: "USD" };
    mockFetch.mockResolvedValue(mockResponse(settlement));

    const result = await settlementsApi.get("s1", "token");

    expect(result).toEqual(settlement);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/settlements/s1"),
      expect.anything()
    );
  });

  it("updates a settlement with PUT", async () => {
    const updateData = { amount: 2000, version: 1 };
    mockFetch.mockResolvedValue(mockResponse({ id: "s1", ...updateData }));

    await settlementsApi.update("s1", updateData as any, "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/settlements/s1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(updateData),
      })
    );
  });
});

describe("expensesApi", () => {
  it("gets expense by id", async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: "e1" }));

    await expensesApi.get("e1", "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/expenses/e1"),
      expect.anything()
    );
  });

  it("deletes expense", async () => {
    mockFetch.mockResolvedValue(mockResponse(""));

    await expensesApi.delete("e1", "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/expenses/e1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("updates expense with PUT", async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: "e1" }));

    await expensesApi.update("e1", { description: "Updated" }, "token");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/expenses/e1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ description: "Updated" }),
      })
    );
  });

  it("gets expense with expand parameter", async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: "e1", splits: [] }));

    await expensesApi.get("e1", "token", "splits");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/expenses/e1?expand=splits"),
      expect.anything()
    );
  });

  describe("uploadReceipt", () => {
    it("uploads receipt successfully", async () => {
      const receiptResult = { url: "https://example.com/receipt.jpg" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(receiptResult)),
        json: () => Promise.resolve(receiptResult),
      });

      const formData = new FormData();
      const result = await expensesApi.uploadReceipt("e1", formData, "token");

      expect(result).toEqual(receiptResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/expenses/e1/receipt"),
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer token" },
          body: formData,
        })
      );
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
        json: () => Promise.reject(new Error("fail")),
      });

      const formData = new FormData();
      await expect(
        expensesApi.uploadReceipt("e1", formData, "token")
      ).rejects.toThrow("API 404: Not found");
    });
  });
});

describe("flattenMap edge cases", () => {
  it("handles empty object", async () => {
    mockFetch.mockResolvedValue(mockResponse({}));

    const result = await groupsApi.listMembers("g1", "token");

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("handles map with multiple keys", async () => {
    const mapResponse = {
      admins: [{ id: "m1", displayName: "Alice" }],
      regulars: [{ id: "m2", displayName: "Bob" }, { id: "m3", displayName: "Charlie" }],
    };
    mockFetch.mockResolvedValue(mockResponse(mapResponse));

    const result = await groupsApi.listMembers("g1", "token");

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });
});

describe("chatStream", () => {
  beforeAll(() => {
    // Force web path so tests use fetch-based SSE (not XHR)
    (Platform as any).OS = "web";
  });
  afterAll(() => {
    (Platform as any).OS = originalPlatformOS;
  });

  function mockSSEResponse(chunks: string[]) {
    const encoder = new TextEncoder();
    let index = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]));
          index++;
        } else {
          controller.close();
        }
      },
    });
    return {
      ok: true,
      status: 200,
      body: stream,
    };
  }

  it("parses SSE events and calls onEvent", async () => {
    const onEvent = jest.fn();
    const onDone = jest.fn();
    const onError = jest.fn();

    mockFetch.mockResolvedValue(
      mockSSEResponse([
        'data: {"type":"text","content":"Hello","conversationId":"c1"}\n\n',
        'data: {"type":"text","content":" world","conversationId":"c1"}\n\n',
        "data: [DONE]\n\n",
      ])
    );

    chatStream("Hi", null, "token", onEvent, onDone, onError);

    await new Promise((r) => setTimeout(r, 100));

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledWith({ type: "text", content: "Hello", conversationId: "c1" });
    expect(onEvent).toHaveBeenCalledWith({ type: "text", content: " world", conversationId: "c1" });
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("sends message and conversationId in request body", async () => {
    mockFetch.mockResolvedValue(
      mockSSEResponse(["data: [DONE]\n\n"])
    );

    chatStream("Hello", "conv-123", "token", jest.fn(), jest.fn(), jest.fn());

    await new Promise((r) => setTimeout(r, 100));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/chat"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ conversationId: "conv-123", message: "Hello" }),
      })
    );
  });

  it("calls onDone when [DONE] is received", async () => {
    const onEvent = jest.fn();
    const onDone = jest.fn();
    const onError = jest.fn();

    mockFetch.mockResolvedValue(
      mockSSEResponse(["data: [DONE]\n\n"])
    );

    chatStream("Hi", null, "token", onEvent, onDone, onError);

    await new Promise((r) => setTimeout(r, 100));

    expect(onEvent).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("calls onError on non-OK response", async () => {
    const onEvent = jest.fn();
    const onDone = jest.fn();
    const onError = jest.fn();

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
    });

    chatStream("Hi", null, "token", onEvent, onDone, onError);

    await new Promise((r) => setTimeout(r, 100));

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toContain("Chat API 500");
  });

  it("skips malformed JSON chunks", async () => {
    const onEvent = jest.fn();
    const onDone = jest.fn();
    const onError = jest.fn();

    mockFetch.mockResolvedValue(
      mockSSEResponse([
        'data: {"type":"text","content":"valid","conversationId":"c1"}\n',
        "data: {bad json}\n",
        'data: {"type":"text","content":"also valid","conversationId":"c1"}\n',
        "data: [DONE]\n\n",
      ])
    );

    chatStream("Hi", null, "token", onEvent, onDone, onError);

    await new Promise((r) => setTimeout(r, 100));

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledWith({ type: "text", content: "valid", conversationId: "c1" });
    expect(onEvent).toHaveBeenCalledWith({ type: "text", content: "also valid", conversationId: "c1" });
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("returns an abort function", () => {
    mockFetch.mockResolvedValue(
      mockSSEResponse(["data: [DONE]\n\n"])
    );

    const abort = chatStream("Hi", null, "token", jest.fn(), jest.fn(), jest.fn());

    expect(typeof abort).toBe("function");
  });
});
