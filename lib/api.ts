/**
 * API client for the Splitr backend.
 *
 * Set EXPO_PUBLIC_API_URL in your .env to point at your backend:
 *   EXPO_PUBLIC_API_URL=http://localhost:8085
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8085";

async function request<T>(
  path: string,
  options?: RequestInit,
  token?: string | null
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${errorBody}`);
  }

  return res.json();
}

// ---- Users ----

export const usersApi = {
  me: (token: string) =>
    request<any>("/v1/users/me", undefined, token),

  updateMe: (data: any, token: string) =>
    request<any>("/v1/users/me", { method: "PATCH", body: JSON.stringify(data) }, token),

  activity: (token: string) =>
    request<any[]>("/v1/users/me/activity", undefined, token),

  sync: (token: string) =>
    request<any>("/v1/users/sync", { method: "POST" }, token),
};

// ---- Groups ----

export const groupsApi = {
  list: (token: string, status?: string) =>
    request<any[]>(status ? `/v1/groups?status=${status}` : "/v1/groups", undefined, token),

  get: (groupId: string, token: string, expand?: string) =>
    request<any>(
      expand ? `/v1/groups/${groupId}?expand=${expand}` : `/v1/groups/${groupId}`,
      undefined,
      token
    ),

  create: (data: { name: string; [key: string]: any }, token: string) =>
    request<any>("/v1/groups", { method: "POST", body: JSON.stringify(data) }, token),

  update: (groupId: string, data: any, token: string) =>
    request<any>(`/v1/groups/${groupId}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  delete: (groupId: string, token: string) =>
    request<any>(`/v1/groups/${groupId}`, { method: "DELETE" }, token),

  // Members
  listMembers: (groupId: string, token: string) =>
    request<any[]>(`/v1/groups/${groupId}/members`, undefined, token),

  addMember: (groupId: string, data: { userId: string }, token: string) =>
    request<any>(
      `/v1/groups/${groupId}/members`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  addGuestMember: (groupId: string, data: { name: string; email?: string }, token: string) =>
    request<any>(
      `/v1/groups/${groupId}/members/guest`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  updateMember: (groupId: string, memberId: string, data: any, token: string) =>
    request<any>(
      `/v1/groups/${groupId}/members/${memberId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  removeMember: (groupId: string, memberId: string, token: string) =>
    request<any>(`/v1/groups/${groupId}/members/${memberId}`, { method: "DELETE" }, token),

  // Expenses
  listExpenses: (groupId: string, token: string) =>
    request<any[]>(`/v1/groups/${groupId}/expenses`, undefined, token),

  createExpense: (groupId: string, data: any, token: string) =>
    request<any>(
      `/v1/groups/${groupId}/expenses`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  // Activity
  activity: (groupId: string, token: string) =>
    request<any[]>(`/v1/groups/${groupId}/activity`, undefined, token),
};

// ---- Expenses ----

export const expensesApi = {
  get: (expenseId: string, token: string, expand?: string) =>
    request<any>(
      expand ? `/v1/expenses/${expenseId}?expand=${expand}` : `/v1/expenses/${expenseId}`,
      undefined,
      token
    ),

  update: (expenseId: string, data: any, token: string) =>
    request<any>(
      `/v1/expenses/${expenseId}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  delete: (expenseId: string, token: string) =>
    request<any>(`/v1/expenses/${expenseId}`, { method: "DELETE" }, token),

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
      return res.json();
    }),
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

  fetch(`${BASE_URL}/api/chat`, {
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
