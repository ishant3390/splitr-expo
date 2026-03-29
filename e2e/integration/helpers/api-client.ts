/**
 * Direct REST client for integration test setup/teardown.
 * Calls the Splitr backend at localhost:8085 using the Clerk test token.
 */

const API_BASE = process.env.E2E_API_URL || "http://localhost:8085/api";

interface TrackedResource {
  type: "group" | "expense" | "settlement";
  id: string;
  groupId?: string;
}

export class ApiClient {
  private token: string;
  private tracked: TrackedResource[] = [];
  private readonly maxNetworkRetries = 3;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers = this.buildHeaders(path, options);

    const res = await this.fetchWithRetry(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status} ${options?.method || "GET"} ${path}: ${body}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  // ---- Health Check ----

  static async isBackendHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/v1/categories`, {
        signal: AbortSignal.timeout(5000),
      });
      // 401 means backend is up (just needs auth)
      return res.ok || res.status === 401;
    } catch {
      return false;
    }
  }

  // ---- Users ----

  async getMe() {
    return this.request<{
      id: string;
      email: string;
      name: string;
      defaultCurrency?: string;
      profileImageUrl?: string;
      avatarUrl?: string;
      paymentHandles?: Record<string, string>;
    }>("/v1/users/me");
  }

  async updateMe(data: {
    name?: string;
    defaultCurrency?: string;
    paymentHandles?: Record<string, string>;
  }) {
    return this.request<{
      id: string;
      name: string;
      defaultCurrency?: string;
      paymentHandles?: Record<string, string>;
    }>(
      "/v1/users/me",
      { method: "PATCH", body: JSON.stringify(data) }
    );
  }

  // ---- Profile Image ----

  async uploadProfileImage(filePath: string): Promise<{
    id: string;
    profileImageUrl?: string;
    avatarUrl?: string;
  }> {
    const fs = await import("fs");
    const path = await import("path");
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    // Use Node's built-in FormData (available in Node 18+)
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, fileName);

    const url = `${API_BASE}/v1/users/me/profile-image`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status} POST /v1/users/me/profile-image: ${errBody}`);
    }

    return res.json();
  }

  async deleteProfileImage(): Promise<void> {
    const url = `${API_BASE}/v1/users/me/profile-image`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status} DELETE /v1/users/me/profile-image: ${errBody}`);
    }
  }

  // ---- Group Banner ----

  async uploadGroupBanner(groupId: string, filePath: string): Promise<{
    id: string;
    bannerImageUrl?: string;
  }> {
    const fs = await import("fs");
    const path = await import("path");
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, fileName);

    const url = `${API_BASE}/v1/groups/${groupId}/banner`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status} POST /v1/groups/${groupId}/banner: ${errBody}`);
    }

    return res.json();
  }

  async deleteGroupBanner(groupId: string): Promise<void> {
    const url = `${API_BASE}/v1/groups/${groupId}/banner`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "Unknown error");
      throw new Error(`API ${res.status} DELETE /v1/groups/${groupId}/banner: ${errBody}`);
    }
  }

  // ---- Groups ----

  async createGroup(data: {
    name: string;
    groupType?: string;
    emoji?: string;
    defaultCurrency?: string;
  }) {
    const group = await this.request<{
      id: string;
      name: string;
      inviteCode?: string;
      memberCount?: number;
      version?: number;
    }>("/v1/groups", { method: "POST", body: JSON.stringify(data) });
    this.tracked.push({ type: "group", id: group.id });
    return group;
  }

  async getGroup(groupId: string) {
    return this.request<{
      id: string;
      name: string;
      inviteCode?: string;
      memberCount?: number;
      isArchived?: boolean;
      version?: number;
    }>(`/v1/groups/${groupId}`);
  }

  async updateGroup(
    groupId: string,
    data: { name?: string; isArchived?: boolean; simplifyDebts?: boolean; version?: number }
  ) {
    return this.request<{ id: string; name: string; version?: number }>(
      `/v1/groups/${groupId}`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  }

  async deleteGroup(groupId: string) {
    await this.request<void>(`/v1/groups/${groupId}`, { method: "DELETE" });
  }

  async listGroups(status = "active") {
    return this.request<
      Array<{ id: string; name: string; memberCount?: number }>
    >(`/v1/groups?status=${status}`);
  }

  // ---- Members ----

  async addGuestMember(groupId: string, data: { name: string; email?: string }) {
    const member = await this.request<{
      id: string;
      guestUser?: { id: string; name: string };
      displayName?: string;
    }>(`/v1/groups/${groupId}/members/guest`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return member;
  }

  async listMembers(groupId: string) {
    const data = await this.request<
      Record<string, Array<{ id: string; user?: { id: string; name: string }; guestUser?: { id: string; name: string }; displayName?: string }>>
      | Array<{ id: string; user?: { id: string; name: string }; guestUser?: { id: string; name: string }; displayName?: string }>
    >(`/v1/groups/${groupId}/members`);
    // Flatten map response
    if (Array.isArray(data)) return data;
    return Object.values(data).flat();
  }

  async removeMember(groupId: string, memberId: string) {
    await this.request<void>(`/v1/groups/${groupId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  async inviteByEmail(groupId: string, email: string) {
    return this.request<{
      id: string;
      user?: { id: string; name: string };
      guestUser?: { id: string; name: string };
    }>(`/v1/groups/${groupId}/members/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // ---- Expenses ----

  async createExpense(
    groupId: string,
    data: {
      description: string;
      totalAmount: number;
      currency?: string;
      categoryId?: string;
      expenseDate: string;
      splitType: string;
      payers: Array<{ userId?: string; guestUserId?: string; amountPaid: number }>;
      splits: Array<{ userId?: string; guestUserId?: string; splitAmount?: number }>;
    }
  ) {
    const expense = await this.request<{
      id: string;
      groupId: string;
      description: string;
      amountCents: number;
      version?: number;
    }>(`/v1/groups/${groupId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.tracked.push({ type: "expense", id: expense.id, groupId });
    return expense;
  }

  async getExpense(expenseId: string) {
    return this.request<{
      id: string;
      description: string;
      amountCents: number;
      version?: number;
    }>(`/v1/expenses/${expenseId}`);
  }

  async updateExpense(
    expenseId: string,
    data: {
      description?: string;
      totalAmount?: number;
      currency?: string;
      categoryId?: string;
      expenseDate?: string;
      splitType?: string;
      payers?: Array<{ userId?: string; guestUserId?: string; amountPaid: number }>;
      splits?: Array<{ userId?: string; guestUserId?: string; splitAmount?: number }>;
      version: number;
    }
  ) {
    return this.request<{
      id: string;
      description: string;
      amountCents: number;
      version?: number;
    }>(`/v1/expenses/${expenseId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(expenseId: string) {
    await this.request<void>(`/v1/expenses/${expenseId}`, { method: "DELETE" });
  }

  async listExpenses(groupId: string) {
    return this.request<{
      data: Array<{ id: string; description: string; amountCents: number }>;
      pagination: { totalCount?: number };
    }>(`/v1/groups/${groupId}/expenses`);
  }

  // ---- Settlements ----

  async createSettlement(
    groupId: string,
    data: {
      payerUserId?: string;
      payerGuestUserId?: string;
      payeeUserId?: string;
      payeeGuestUserId?: string;
      amount: number;
      currency: string;
      paymentMethod?: string;
      settlementDate: string;
    }
  ) {
    const settlement = await this.request<{
      id: string;
      groupId: string;
      amount: number;
      version: number;
    }>(`/v1/groups/${groupId}/settlements`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.tracked.push({ type: "settlement", id: settlement.id, groupId });
    return settlement;
  }

  async deleteSettlement(settlementId: string) {
    await this.request<void>(`/v1/settlements/${settlementId}`, {
      method: "DELETE",
    });
  }

  async listSettlements(groupId: string) {
    const data = await this.request<any>(`/v1/groups/${groupId}/settlements`);
    if (data?.content && Array.isArray(data.content)) return data.content;
    return Array.isArray(data) ? data : [];
  }

  async getSettlementSuggestions(groupId: string) {
    return this.request<
      Array<{
        fromUser?: { id: string; name: string };
        fromGuest?: { id: string; name: string };
        toUser?: { id: string; name: string };
        toGuest?: { id: string; name: string };
        amount: number;
        currency: string;
        toUserPaymentHandles?: Record<string, string>;
      }>
    >(`/v1/groups/${groupId}/settlements/suggestions`);
  }

  // ---- Join Group ----

  async joinGroupByInvite(inviteCode: string) {
    // Note: does NOT track for cleanup — only the group creator should clean up
    return this.request<{
      id: string;
      name: string;
      memberCount?: number;
    }>("/v1/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
  }

  // ---- Balance ----

  async getBalance() {
    return this.request<{
      totalOwed: Array<{ currency: string; amount: number }>;
      totalOwing: Array<{ currency: string; amount: number }>;
    }>("/v1/users/me/balance");
  }

  // ---- Invite ----

  async getInvitePreview(inviteCode: string) {
    // No auth needed for preview
    const res = await fetch(`${API_BASE}/v1/groups/invite/${inviteCode}`);
    if (!res.ok) throw new Error(`Preview ${res.status}`);
    return res.json() as Promise<{
      groupId: string;
      name: string;
      memberCount: number;
    }>;
  }

  async regenerateInvite(groupId: string) {
    return this.request<{ id: string; inviteCode?: string }>(
      `/v1/groups/${groupId}/invite/regenerate`,
      { method: "POST" }
    );
  }

  // ---- Categories ----

  async listCategories() {
    return this.request<Array<{ id: string; name: string; icon?: string }>>(
      "/v1/categories"
    );
  }

  // ---- Activity ----

  async getActivity(params?: { page?: number; limit?: number }) {
    const qs = params
      ? `?page=${params.page ?? 0}&limit=${params.limit ?? 20}`
      : "";
    const data = await this.request<any>(`/v1/users/me/activity${qs}`);
    if (data?.content && Array.isArray(data.content)) return data.content;
    return Array.isArray(data) ? data : Object.values(data).flat();
  }

  // ---- Safe Request (non-throwing) ----

  async requestSafe<T>(
    path: string,
    options?: RequestInit
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
    const url = `${API_BASE}${path}`;
    const headers = this.buildHeaders(path, options);

    const res = await this.fetchWithRetry(url, {
      ...options,
      headers,
    });

    const text = await res.text().catch(() => "");

    if (res.ok) {
      const data = text ? JSON.parse(text) : ({} as T);
      return { ok: true, status: res.status, data };
    }

    return { ok: false, status: res.status, error: text };
  }

  private buildHeaders(path: string, options?: RequestInit): Headers {
    const method = (options?.method || "GET").toUpperCase();
    const headers = new Headers(options?.headers || {});

    headers.set("Authorization", `Bearer ${this.token}`);

    const body = options?.body;
    const isFormDataBody =
      typeof FormData !== "undefined" && body instanceof FormData;
    if (body != null && !isFormDataBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (
      this.requiresIdempotencyHeader(path, method) &&
      !headers.has("Idempotency-Key")
    ) {
      headers.set("Idempotency-Key", this.createIdempotencyKey());
    }

    return headers;
  }

  private requiresIdempotencyHeader(path: string, method: string): boolean {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return false;
    }

    return (
      /^\/v1\/groups\/[^/]+\/expenses(?:\/|$)/.test(path) ||
      /^\/v1\/expenses\/[^/]+$/.test(path) ||
      /^\/v1\/groups\/[^/]+\/settlements(?:\/|$)/.test(path) ||
      /^\/v1\/settlements\/[^/]+$/.test(path)
    );
  }

  private createIdempotencyKey(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= this.maxNetworkRetries; attempt += 1) {
      try {
        const res = await fetch(url, init);
        // Retry on 429 (rate limit) with exponential backoff
        if (res.status === 429 && attempt < this.maxNetworkRetries) {
          const retryAfter = res.headers.get("retry-after");
          const delayMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : 2000 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        return res;
      } catch (err) {
        lastError = err;
        if (attempt >= this.maxNetworkRetries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
    throw lastError ?? new Error("Network request failed");
  }

  // ---- Cleanup ----

  /**
   * Delete all tracked resources in reverse order (settlements → expenses → groups).
   * Silently ignores 404s (already deleted).
   */
  async cleanup() {
    // Sort: settlements first, then expenses, then groups
    const order = { settlement: 0, expense: 1, group: 2 };
    const sorted = [...this.tracked].sort(
      (a, b) => order[a.type] - order[b.type]
    );

    for (const resource of sorted) {
      try {
        switch (resource.type) {
          case "settlement":
            await this.deleteSettlement(resource.id);
            break;
          case "expense":
            await this.deleteExpense(resource.id);
            break;
          case "group":
            // Archive first (DELETE returns 500 on backend), then try delete as fallback
            try {
              await this.updateGroup(resource.id, { isArchived: true });
            } catch {
              try {
                await this.deleteGroup(resource.id);
              } catch {
                // Ignore — group may already be gone
              }
            }
            break;
        }
      } catch {
        // Ignore cleanup errors (404, already deleted, etc.)
      }
    }

    this.tracked = [];
  }
}
