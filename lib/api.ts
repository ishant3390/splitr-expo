/**
 * API client for the Splitr Spring Boot backend.
 *
 * Set EXPO_PUBLIC_API_URL in your .env to point at your backend:
 *   EXPO_PUBLIC_API_URL=http://localhost:8080
 *
 * All endpoints mirror the REST resources your backend exposes.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
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

// ---- Auth (may be handled by Clerk, but exposing for custom OTP) ----

export const authApi = {
  sendOtp: (contact: string, method: "email" | "sms") =>
    request<{ success: boolean }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ contact, method }),
    }),

  verifyOtp: (contact: string, code: string) =>
    request<{ success: boolean; token: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ contact, code }),
    }),

  signUp: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }) =>
    request<{ success: boolean; userId: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---- Groups ----

export const groupsApi = {
  list: () => request<any[]>("/api/groups"),

  get: (id: string) => request<any>(`/api/groups/${id}`),

  create: (data: { name: string; memberIds: string[]; invitedEmails?: string[] }) =>
    request<any>("/api/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  search: (memberNames: string[]) =>
    request<any>("/api/groups/search", {
      method: "POST",
      body: JSON.stringify({ memberNames }),
    }),
};

// ---- Expenses ----

export const expensesApi = {
  list: (groupId?: string) =>
    request<any[]>(groupId ? `/api/expenses?groupId=${groupId}` : "/api/expenses"),

  create: (data: {
    groupId: string;
    description: string;
    amount: number;
    category: string;
    paidBy: string;
    splitAmong: string[];
  }) =>
    request<any>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---- Users / Friends ----

export const usersApi = {
  me: () => request<any>("/api/users/me"),
  friends: () => request<any[]>("/api/users/friends"),
  search: (query: string) => request<any[]>(`/api/users/search?q=${encodeURIComponent(query)}`),
};

// ---- Chat (SSE streaming) ----

export function chatStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: any) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  const controller = new AbortController();

  fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

// ---- Receipt scanning ----

export const receiptApi = {
  scan: (imageBase64: string) =>
    request<any>("/api/receipt/scan", {
      method: "POST",
      body: JSON.stringify({ image: imageBase64 }),
    }),
};
