/**
 * API client for the Splitr backend.
 *
 * Set EXPO_PUBLIC_API_URL in your .env.local:
 *   EXPO_PUBLIC_API_URL=http://localhost:8085/api
 */

import type {
  UserDto,
  UpdateUserRequest,
  GroupDto,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupMemberDto,
  AddMemberRequest,
  AddGuestMemberRequest,
  UpdateMemberRequest,
  ExpenseDto,
  CreateExpenseRequest,
  ExpenseListResponse,
  UpdateExpenseRequest,
  ActivityLogDto,
  CategoryDto,
  SettlementDto,
  SettlementSuggestionDto,
  CreateSettlementRequest,
  UpdateSettlementRequest,
  GroupInvitePreviewDto,
  JoinGroupRequest,
  ContactDto,
} from "./types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8085/api";

async function request<T>(
  path: string,
  options?: RequestInit,
  token?: string | null
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${errorBody}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

/** Flatten `{ key: T[] }` map responses into a flat `T[]`. */
function flattenMap<T>(data: Record<string, T[]> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return Object.values(data).flat();
}

// ---- Users ----

export const usersApi = {
  me: (token: string) =>
    request<UserDto>("/v1/users/me", undefined, token),

  updateMe: (data: UpdateUserRequest, token: string) =>
    request<UserDto>("/v1/users/me", { method: "PATCH", body: JSON.stringify(data) }, token),

  activity: async (token: string, params?: { page?: number; limit?: number }): Promise<ActivityLogDto[]> => {
    const qs = params ? `?page=${params.page ?? 0}&limit=${params.limit ?? 20}` : "";
    const data = await request<any>(
      `/v1/users/me/activity${qs}`,
      undefined,
      token
    );
    // Handle Spring Boot Page response (content array) or legacy flat/map response
    if (data?.content && Array.isArray(data.content)) return data.content;
    return flattenMap(data);
  },

  sync: (token: string) =>
    request<void>("/v1/users/sync", { method: "POST" }, token),

  registerPushToken: (data: { token: string; platform: string; deviceId?: string }, authToken: string) =>
    request<void>("/v1/users/me/push-tokens", { method: "POST", body: JSON.stringify(data) }, authToken),

  unregisterPushToken: (pushToken: string, authToken: string) =>
    request<void>(`/v1/users/me/push-tokens/${encodeURIComponent(pushToken)}`, { method: "DELETE" }, authToken),

  balance: (token: string) =>
    request<import("./types").UserBalanceRawDto>("/v1/users/me/balance", undefined, token),
};

// ---- Groups ----

export const groupsApi = {
  list: (token: string, status = "active") =>
    request<GroupDto[]>(`/v1/groups?status=${status}`, undefined, token),

  get: (groupId: string, token: string, expand?: string) =>
    request<GroupDto>(
      `/v1/groups/${groupId}${expand ? `?expand=${expand}` : ""}`,
      undefined,
      token
    ),

  create: (data: CreateGroupRequest, token: string) =>
    request<GroupDto>("/v1/groups", { method: "POST", body: JSON.stringify(data) }, token),

  update: (groupId: string, data: UpdateGroupRequest, token: string) =>
    request<GroupDto>(
      `/v1/groups/${groupId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  delete: (groupId: string, token: string) =>
    request<void>(`/v1/groups/${groupId}`, { method: "DELETE" }, token),

  // Members
  listMembers: async (groupId: string, token: string): Promise<GroupMemberDto[]> => {
    const data = await request<Record<string, GroupMemberDto[]>>(
      `/v1/groups/${groupId}/members`,
      undefined,
      token
    );
    return flattenMap(data);
  },

  addMember: (groupId: string, data: AddMemberRequest, token: string) =>
    request<GroupMemberDto>(
      `/v1/groups/${groupId}/members`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  addGuestMember: (groupId: string, data: AddGuestMemberRequest, token: string) =>
    request<GroupMemberDto>(
      `/v1/groups/${groupId}/members/guest`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  updateMember: (groupId: string, memberId: string, data: UpdateMemberRequest, token: string) =>
    request<GroupMemberDto>(
      `/v1/groups/${groupId}/members/${memberId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  removeMember: (groupId: string, memberId: string, token: string) =>
    request<void>(`/v1/groups/${groupId}/members/${memberId}`, { method: "DELETE" }, token),

  // Expenses
  listExpenses: (groupId: string, token: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return request<ExpenseListResponse>(
      `/v1/groups/${groupId}/expenses${qs}`,
      undefined,
      token
    );
  },

  createExpense: (groupId: string, data: CreateExpenseRequest, token: string) =>
    request<ExpenseDto>(
      `/v1/groups/${groupId}/expenses`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  // Activity
  activity: async (groupId: string, token: string, params?: { page?: number; limit?: number }): Promise<ActivityLogDto[]> => {
    const qs = params ? `?page=${params.page ?? 0}&limit=${params.limit ?? 20}` : "";
    const data = await request<any>(
      `/v1/groups/${groupId}/activity${qs}`,
      undefined,
      token
    );
    if (data?.content && Array.isArray(data.content)) return data.content;
    return flattenMap(data);
  },
};

// ---- Invite / Join ----

export const inviteApi = {
  /** Get group preview by invite code (no auth required) */
  preview: (inviteCode: string) =>
    request<GroupInvitePreviewDto>(`/v1/groups/invite/${inviteCode}`),

  /** Join a group using an invite code */
  join: (data: JoinGroupRequest, token: string) =>
    request<GroupMemberDto>(
      `/v1/groups/join`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  /** Regenerate invite code for a group */
  regenerate: (groupId: string, token: string) =>
    request<GroupDto>(
      `/v1/groups/${groupId}/invite/regenerate`,
      { method: "POST" },
      token
    ),
};

// ---- Contacts ----

export const contactsApi = {
  /** Get deduplicated contacts from all user's groups */
  list: async (token: string): Promise<ContactDto[]> => {
    const data = await request<ContactDto[] | Record<string, ContactDto[]>>(
      "/v1/users/me/contacts",
      undefined,
      token
    );
    return flattenMap(data as Record<string, ContactDto[]>);
  },
};

// ---- Categories ----

export const categoriesApi = {
  list: (token: string) =>
    request<CategoryDto[]>("/v1/categories", undefined, token),
};

// ---- Expenses ----

export const expensesApi = {
  get: (expenseId: string, token: string, expand?: string) =>
    request<ExpenseDto>(
      `/v1/expenses/${expenseId}${expand ? `?expand=${expand}` : ""}`,
      undefined,
      token
    ),

  update: (expenseId: string, data: UpdateExpenseRequest, token: string) =>
    request<ExpenseDto>(
      `/v1/expenses/${expenseId}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  delete: (expenseId: string, token: string) =>
    request<void>(`/v1/expenses/${expenseId}`, { method: "DELETE" }, token),

  uploadReceipt: (expenseId: string, formData: FormData, token: string) =>
    fetch(`${BASE_URL}/v1/expenses/${expenseId}/receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw new Error(`API ${res.status}: ${errorBody}`);
      }
      return res.json() as Promise<Record<string, unknown>>;
    }),
};

// ---- Settlements ----

export const settlementsApi = {
  list: async (groupId: string, token: string, params?: { page?: number; limit?: number }): Promise<SettlementDto[]> => {
    const qs = params ? `?page=${params.page ?? 0}&limit=${params.limit ?? 20}` : "";
    const data = await request<any>(`/v1/groups/${groupId}/settlements${qs}`, undefined, token);
    // Handle Spring Boot Page response or plain array
    if (data?.content && Array.isArray(data.content)) return data.content;
    return Array.isArray(data) ? data : [];
  },

  suggestions: (groupId: string, token: string) =>
    request<SettlementSuggestionDto[]>(
      `/v1/groups/${groupId}/settlements/suggestions`,
      undefined,
      token
    ),

  create: (groupId: string, data: CreateSettlementRequest, token: string) =>
    request<SettlementDto>(
      `/v1/groups/${groupId}/settlements`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  get: (settlementId: string, token: string) =>
    request<SettlementDto>(`/v1/settlements/${settlementId}`, undefined, token),

  update: (settlementId: string, data: UpdateSettlementRequest, token: string) =>
    request<SettlementDto>(
      `/v1/settlements/${settlementId}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  delete: (settlementId: string, token: string) =>
    request<void>(`/v1/settlements/${settlementId}`, { method: "DELETE" }, token),
};

// ---- Chat (SSE streaming) ----

export function chatStream(
  messages: Array<{ role: string; content: string }>,
  token: string,
  onChunk: (chunk: any) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  const controller = new AbortController();

  fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Chat API ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            onChunk(JSON.parse(data));
          } catch {
            // skip malformed
          }
        }
      }
      onDone();
    })
    .catch(onError);

  return () => controller.abort();
}
