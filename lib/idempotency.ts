/**
 * Idempotency key management for financial POST endpoints.
 *
 * Keys are UUID v4, persisted to AsyncStorage for crash recovery.
 * Required: POST expenses, POST settlements
 * Optional: POST groups, join, members, nudge
 *
 * See: pipeline/fe/idempotency-spec.md
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { parseApiError } from "./errors";

const KEY_PREFIX = "@splitr/idem:";
const KEY_TS_PREFIX = "@splitr/idem_ts:";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;
const KEY_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function createIdempotencyKey(): string {
  try {
    const generated = randomUUID?.();
    if (typeof generated === "string" && generated.length > 0) return generated;
  } catch {
    // Fall through to deterministic local fallback.
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Generate a new idempotency key or retrieve an existing one for crash recovery.
 */
export async function getIdempotencyKey(operationId: string): Promise<string> {
  const storageKey = `${KEY_PREFIX}${operationId}`;
  const tsKey = `${KEY_TS_PREFIX}${operationId}`;
  try {
    const [existing, existingTs] = await Promise.all([
      AsyncStorage.getItem(storageKey),
      AsyncStorage.getItem(tsKey),
    ]);
    if (existing) {
      const ts = existingTs ? Number(existingTs) : NaN;
      const isExpired = Number.isNaN(ts) || ts <= 0 || Date.now() - ts > KEY_TTL_MS;
      if (isExpired) {
        await Promise.all([
          AsyncStorage.removeItem(storageKey),
          AsyncStorage.removeItem(tsKey),
        ]);
      } else {
        return existing;
      }
    }
  } catch {
    // Storage read failed — generate fresh
  }
  const key = createIdempotencyKey();
  try {
    await Promise.all([
      AsyncStorage.setItem(storageKey, key),
      AsyncStorage.setItem(tsKey, String(Date.now())),
    ]);
  } catch {
    // Persist failed — key still works for this request
  }
  return key;
}

/**
 * Clear a persisted key after successful completion.
 */
export async function clearIdempotencyKey(operationId: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(`${KEY_PREFIX}${operationId}`),
      AsyncStorage.removeItem(`${KEY_TS_PREFIX}${operationId}`),
    ]);
  } catch {
    // Non-critical
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an API call with idempotency key + retry logic.
 *
 * - 201/200 → clear key, return result
 * - ERR-415 (in-flight) → wait, retry with SAME key
 * - ERR-414 (param mismatch) → clear key, throw (caller regenerates)
 * - 5xx / network error → retry with SAME key (exponential backoff)
 * - Other 4xx → clear key, throw
 */
export async function withIdempotency<T>(
  operationId: string,
  fn: (idempotencyKey: string) => Promise<T>
): Promise<T> {
  const key = await getIdempotencyKey(operationId);

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn(key);
      await clearIdempotencyKey(operationId);
      return result;
    } catch (err: unknown) {
      lastError = err;
      const apiErr = parseApiError(err);

      // ERR-414: param mismatch — don't retry with same key
      if (apiErr?.code === "ERR-414") {
        await clearIdempotencyKey(operationId);
        throw err;
      }

      // ERR-415: in-flight — retry with same key after delay
      // 5xx or network error — retry with same key
      const isRetryable =
        apiErr?.code === "ERR-415" ||
        (apiErr?.status != null && apiErr.status >= 500) ||
        !apiErr; // network error (parseApiError returned null for non-API errors)

      // But don't retry other 4xx errors
      if (apiErr && apiErr.status != null && apiErr.status < 500 && apiErr.code !== "ERR-415") {
        await clearIdempotencyKey(operationId);
        throw err;
      }

      if (!isRetryable) {
        await clearIdempotencyKey(operationId);
        throw err;
      }
      if (attempt >= MAX_RETRIES) {
        // Keep the same key persisted for manual retry on ambiguous outcomes.
        throw err;
      }

      // Exponential backoff with jitter
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  throw lastError;
}
