/**
 * API client for the Splitr backend.
 *
 * Set EXPO_PUBLIC_API_URL in your .env.local:
 *   EXPO_PUBLIC_API_URL=http://localhost:8085/api
 */

import { Platform } from "react-native";
import { SplitError, isSplitError, parseApiError } from "./errors";
import type { ApiErrorBody } from "./errors";
import { withIdempotency } from "./idempotency";
import { startFinanceAudit, markFinanceAuditSuccess, markFinanceAuditFailure } from "./finance-audit";
import type {
  UserDto,
  UpdateUserRequest,
  GroupDto,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupMemberDto,
  AddMemberRequest,
  AddGuestMemberRequest,
  InviteByEmailRequest,
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
  InviteByPhoneRequest,
  ContactMatchRequest,
  ContactMatchResponse,
  PushTokenDto,
  RegisterPushTokenRequest,
  NotificationDto,
  ReceiptScanResponseDto,
} from "./types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8085/api";
const MAX_429_RETRIES = 1;
const DEFAULT_429_RETRY_MS = 5000;

function hashOperationPayload(payload: unknown): string {
  const json = JSON.stringify(payload ?? null);
  let hash = 2166136261; // FNV-1a 32-bit offset basis
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function stableOperationId(action: string, entityId: string, payload?: unknown): string {
  const payloadHash = payload === undefined ? "nopayload" : hashOperationPayload(payload);
  return `${action}-${entityId}-${payloadHash}`;
}

/** Generate a UUID v4 correlation ID for request tracing. */
function generateCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function request<T>(
  path: string,
  options?: RequestInit,
  token?: string | null,
  retryCount = 0
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const method = (options?.method || "GET").toUpperCase();
  const requestHeaders = new Headers(options?.headers);
  const canRetry429 =
    ["GET", "HEAD", "OPTIONS"].includes(method) ||
    requestHeaders.has("Idempotency-Key");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Correlation-ID": generateCorrelationId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });

  if (res.status === 429 && canRetry429 && retryCount < MAX_429_RETRIES) {
    const retryAfterHeader = res.headers?.get("Retry-After");
    const retryDelayMs = parseRetryAfterMs(retryAfterHeader) ?? DEFAULT_429_RETRY_MS;
    await sleep(retryDelayMs);
    return request<T>(path, options, token, retryCount + 1);
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw buildApiError(errorBody, res.status);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

/**
 * Parse error body text and throw a SplitError (structured) or plain Error (fallback).
 * Used by both request() and inline fetch calls.
 */
function buildApiError(bodyText: string, status: number): Error {
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed && typeof parsed.code === "string") {
      return new SplitError(parsed as ApiErrorBody, status);
    }
  } catch {
    // Not JSON — fall through
  }
  return new Error(`API ${status}: ${bodyText}`);
}

/** Check if an API error is a version conflict (ERR-302) */
export function isVersionConflict(err: unknown): boolean {
  if (isSplitError(err)) {
    return err.body.code === "ERR-302";
  }
  // Legacy fallback — check ERR-302 first, then HTTP 409 only when no ERR- code present
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ERR-302")) return true;
  // Only match raw "409" if there's no ERR- code (avoids false positive on ERR-409)
  return msg.includes("409") && !msg.includes("ERR-");
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

  registerPushToken: (data: RegisterPushTokenRequest, authToken: string) =>
    request<PushTokenDto>("/v1/users/me/push-tokens", { method: "POST", body: JSON.stringify(data) }, authToken),

  listPushTokens: (authToken: string) =>
    request<PushTokenDto[]>("/v1/users/me/push-tokens", undefined, authToken),

  unregisterPushToken: (tokenId: string, authToken: string) =>
    request<void>(`/v1/users/me/push-tokens/${encodeURIComponent(tokenId)}`, { method: "DELETE" }, authToken),

  notifications: async (authToken: string, params?: { page?: number; limit?: number }): Promise<NotificationDto[]> => {
    const qs = `?page=${params?.page ?? 0}&limit=${params?.limit ?? 20}`;
    const data = await request<any>(`/v1/users/me/notifications${qs}`, undefined, authToken);
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    return Array.isArray(data) ? data : [];
  },

  balance: (token: string) =>
    request<import("./types").UserBalanceRawDto>("/v1/users/me/balance", undefined, token),

  uploadProfileImage: (formData: FormData, token: string) =>
    fetch(`${BASE_URL}/v1/users/me/profile-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
      return res.json() as Promise<UserDto>;
    }),

  deleteProfileImage: (token: string) =>
    fetch(`${BASE_URL}/v1/users/me/profile-image`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
    }),
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

  inviteByEmail: (groupId: string, data: InviteByEmailRequest, token: string) =>
    request<GroupMemberDto>(
      `/v1/groups/${groupId}/members/invite`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  inviteByPhone: (groupId: string, data: InviteByPhoneRequest, token: string) =>
    request<GroupMemberDto>(
      `/v1/groups/${groupId}/members/invite-phone`,
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

  // Nudge
  nudge: (groupId: string, targetUserId: string, token: string) =>
    request<{ sent: boolean; message: string }>(
      `/v1/groups/${groupId}/nudge`,
      { method: "POST", body: JSON.stringify({ targetUserId }) },
      token
    ),

  uploadBanner: (groupId: string, formData: FormData, token: string) =>
    fetch(`${BASE_URL}/v1/groups/${groupId}/banner`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
      return res.json() as Promise<GroupDto>;
    }),

  deleteBanner: (groupId: string, token: string) =>
    fetch(`${BASE_URL}/v1/groups/${groupId}/banner`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
    }),

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
    (async () => {
      const operationId = stableOperationId("expense-create", groupId, data);
      const audit = await startFinanceAudit("expense_create", {
        groupId,
        amount: data.totalAmount,
        currency: data.currency,
      }, operationId);
      try {
        const result = await withIdempotency(operationId, (idempotencyKey) =>
          request<ExpenseDto>(
            `/v1/groups/${groupId}/expenses`,
            {
              method: "POST",
              body: JSON.stringify(data),
              headers: {
                "Idempotency-Key": idempotencyKey,
                "X-Correlation-ID": audit.correlationId,
              },
            },
            token
          )
        );
        await markFinanceAuditSuccess(audit, { entityId: result.id });
        return result;
      } catch (err: unknown) {
        await markFinanceAuditFailure(audit, err);
        throw err;
      }
    })(),

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

  /** Batch match device contacts against Splitr users */
  matchContacts: (data: ContactMatchRequest, token: string) =>
    request<ContactMatchResponse>(
      "/v1/contacts/match",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
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
    (async () => {
      const operationId = stableOperationId("expense-update", expenseId, data);
      const audit = await startFinanceAudit("expense_update", {
        entityId: expenseId,
        amount: data.totalAmount,
        currency: data.currency,
      }, operationId);
      try {
        const result = await withIdempotency(operationId, (idempotencyKey) =>
          request<ExpenseDto>(
            `/v1/expenses/${expenseId}`,
            {
              method: "PUT",
              body: JSON.stringify(data),
              headers: {
                "Idempotency-Key": idempotencyKey,
                "X-Correlation-ID": audit.correlationId,
              },
            },
            token
          )
        );
        await markFinanceAuditSuccess(audit, {
          entityId: result.id,
          groupId: result.groupId,
          amount: result.amountCents,
          currency: result.currency,
        });
        return result;
      } catch (err: unknown) {
        await markFinanceAuditFailure(audit, err);
        throw err;
      }
    })(),

  delete: (expenseId: string, token: string) =>
    (async () => {
      const operationId = stableOperationId("expense-delete", expenseId);
      const audit = await startFinanceAudit("expense_delete", { entityId: expenseId }, operationId);
      try {
        const result = await withIdempotency(operationId, (idempotencyKey) =>
          request<void>(
            `/v1/expenses/${expenseId}`,
            {
              method: "DELETE",
              headers: {
                "Idempotency-Key": idempotencyKey,
                "X-Correlation-ID": audit.correlationId,
              },
            },
            token
          )
        );
        await markFinanceAuditSuccess(audit);
        return result;
      } catch (err: unknown) {
        await markFinanceAuditFailure(audit, err);
        throw err;
      }
    })(),

  getReceiptUrl: (expenseId: string, token: string) =>
    request<{ url: string }>(`/v1/expenses/${expenseId}/receipt`, undefined, token),

  deleteReceipt: (expenseId: string, token: string) =>
    fetch(`${BASE_URL}/v1/expenses/${expenseId}/receipt`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
    }),

  uploadReceipt: (expenseId: string, formData: FormData, token: string) =>
    fetch(`${BASE_URL}/v1/expenses/${expenseId}/receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
      return res.json() as Promise<Record<string, unknown>>;
    }),

  scanReceipt: (base64Image: string, token: string) =>
    fetch(`${BASE_URL}/v1/receipts/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "Unknown error");
        throw buildApiError(errorBody, res.status);
      }
      return res.json() as Promise<ReceiptScanResponseDto>;
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
    (async () => {
      const operationId = stableOperationId("settlement-create", groupId, data);
      const audit = await startFinanceAudit("settlement_create", {
        groupId,
        amount: data.amount,
        currency: data.currency,
      }, operationId);
      try {
        const result = await withIdempotency(operationId, (idempotencyKey) =>
          request<SettlementDto>(
            `/v1/groups/${groupId}/settlements`,
            {
              method: "POST",
              body: JSON.stringify(data),
              headers: {
                "Idempotency-Key": idempotencyKey,
                "X-Correlation-ID": audit.correlationId,
              },
            },
            token
          )
        );
        await markFinanceAuditSuccess(audit, { entityId: result.id });
        return result;
      } catch (err: unknown) {
        await markFinanceAuditFailure(audit, err);
        throw err;
      }
    })(),

  get: (settlementId: string, token: string) =>
    request<SettlementDto>(`/v1/settlements/${settlementId}`, undefined, token),

  update: (settlementId: string, data: UpdateSettlementRequest, token: string) =>
    (async () => {
      const operationId = stableOperationId("settlement-update", settlementId, data);
      const audit = await startFinanceAudit("settlement_update", {
        entityId: settlementId,
        amount: data.amount,
        currency: data.currency,
      }, operationId);
      try {
        const result = await withIdempotency(operationId, (idempotencyKey) =>
          request<SettlementDto>(
            `/v1/settlements/${settlementId}`,
            {
              method: "PUT",
              body: JSON.stringify(data),
              headers: {
                "Idempotency-Key": idempotencyKey,
                "X-Correlation-ID": audit.correlationId,
              },
            },
            token
          )
        );
        await markFinanceAuditSuccess(audit, {
          entityId: result.id,
          groupId: result.groupId,
          amount: result.amount,
          currency: result.currency,
        });
        return result;
      } catch (err: unknown) {
        await markFinanceAuditFailure(audit, err);
        throw err;
      }
    })(),

  delete: (settlementId: string, token: string) =>
    (async () => {
      const operationId = stableOperationId("settlement-delete", settlementId);
      const audit = await startFinanceAudit("settlement_delete", { entityId: settlementId }, operationId);
      try {
        const result = await withIdempotency(operationId, (idempotencyKey) =>
          request<void>(
            `/v1/settlements/${settlementId}`,
            {
              method: "DELETE",
              headers: {
                "Idempotency-Key": idempotencyKey,
                "X-Correlation-ID": audit.correlationId,
              },
            },
            token
          )
        );
        await markFinanceAuditSuccess(audit);
        return result;
      } catch (err: unknown) {
        await markFinanceAuditFailure(audit, err);
        throw err;
      }
    })(),
};

// ---- Re-exports from errors ----
export { SplitError, isSplitError, parseApiError, getUserMessage } from "./errors";
export type { ApiErrorBody } from "./errors";

// ---- Chat ----

import type { ChatSSEEvent, ChatQuotaDto } from "./types";

export const chatApi = {
  quota: (token: string) =>
    request<ChatQuotaDto>("/v1/chat/quota", undefined, token),
};

/**
 * Parse SSE lines from a buffer.
 * Returns remaining incomplete data (to be prepended to the next chunk).
 */
function parseSSEBuffer(
  buffer: string,
  onEvent: (event: ChatSSEEvent) => void,
  onDone: () => void
): { remaining: string; isDone: boolean } {
  const lines = buffer.split("\n");
  const remaining = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") {
      onDone();
      return { remaining: "", isDone: true };
    }
    try {
      const parsed = JSON.parse(data);
      if (__DEV__) console.log("[ChatSSE] event:", parsed.type);
      onEvent(parsed as ChatSSEEvent);
    } catch {
      // skip malformed
    }
  }
  return { remaining, isDone: false };
}

export function chatStream(
  message: string,
  conversationId: string | null,
  token: string,
  onEvent: (event: ChatSSEEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  options?: { image?: string; deterministic?: boolean }
) {
  const body: Record<string, unknown> = { conversationId, message };
  if (options?.image) body.image = options.image;
  if (options?.deterministic) body.deterministic = true;
  const jsonBody = JSON.stringify(body);

  // Use XMLHttpRequest for native (iOS/Android) — fetch ReadableStream
  // is not supported on React Native. Use fetch streaming on web.
  if (Platform.OS !== "web") {
    return chatStreamXHR(jsonBody, token, onEvent, onDone, onError);
  }

  const controller = new AbortController();

  fetch(`${BASE_URL}/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: jsonBody,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (__DEV__) console.log("[ChatSSE] status:", res.status);
      if (!res.ok) throw new Error(`Chat API ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const result = parseSSEBuffer(buffer, onEvent, onDone);
        buffer = result.remaining;
        if (result.isDone) return;
      }
      onDone();
    })
    .catch(onError);

  return () => controller.abort();
}

/**
 * SSE streaming via XMLHttpRequest for React Native (iOS/Android).
 * XHR fires onprogress with the full responseText so far — we track
 * how much we've already processed and only parse the new portion.
 */
function chatStreamXHR(
  jsonBody: string,
  token: string,
  onEvent: (event: ChatSSEEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  const xhr = new XMLHttpRequest();
  let processedLength = 0;
  let buffer = "";
  let completed = false;

  xhr.open("POST", `${BASE_URL}/v1/chat`);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Authorization", `Bearer ${token}`);

  xhr.onprogress = () => {
    if (completed) return;
    const newData = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    if (!newData) return;

    buffer += newData;
    const result = parseSSEBuffer(buffer, onEvent, onDone);
    buffer = result.remaining;
    if (result.isDone) completed = true;
  };

  xhr.onload = () => {
    if (completed) return;
    // Process any remaining buffer
    if (buffer.length > 0) {
      const result = parseSSEBuffer(buffer + "\n", onEvent, onDone);
      if (result.isDone) { completed = true; return; }
    }
    completed = true;
    onDone();
  };

  xhr.onerror = () => {
    if (completed) return;
    completed = true;
    onError(new Error(`Chat API request failed`));
  };

  xhr.ontimeout = () => {
    if (completed) return;
    completed = true;
    onError(new Error("Chat API timeout"));
  };

  xhr.timeout = 60000; // 60s timeout for streaming
  xhr.send(jsonBody);

  return () => {
    if (!completed) {
      completed = true;
      xhr.abort();
    }
  };
}
