/**
 * Offline support for Splitr.
 *
 * 1. Network status context — provides `isOnline` to the entire app
 * 2. Expense queue — persists pending expenses to AsyncStorage when offline,
 *    auto-syncs when back online
 *
 * FINANCIAL SAFETY:
 * - Queued expenses are clearly marked as "pending" (not confirmed)
 * - Each queued item has a unique ID to prevent double-submission
 * - Failed syncs keep the item in the queue (user must manually retry or discard)
 * - Successful syncs invalidate React Query cache to reflect real server state
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { invalidateAfterExpenseChange } from "./query";
import { groupsApi } from "./api";
import type { CreateExpenseRequest } from "./types";

const QUEUE_KEY = "@splitr/expense_queue";

export interface QueuedExpense {
  /** Unique client-side ID to prevent double-submission */
  clientId: string;
  groupId: string;
  groupName: string;
  request: CreateExpenseRequest;
  /** Description for display in pending list */
  description: string;
  /** Amount in cents for display */
  amountCents: number;
  /** ISO timestamp when queued */
  queuedAt: string;
  /** Number of sync attempts so far */
  attempts: number;
  /** Last error message if sync failed */
  lastError?: string;
}

// ---- Queue Operations ----

export async function getQueuedExpenses(): Promise<QueuedExpense[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addToQueue(expense: QueuedExpense): Promise<void> {
  const queue = await getQueuedExpenses();
  // Prevent duplicate clientIds
  if (queue.some((e) => e.clientId === expense.clientId)) return;
  queue.push(expense);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(clientId: string): Promise<void> {
  const queue = await getQueuedExpenses();
  const filtered = queue.filter((e) => e.clientId !== clientId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

async function updateQueueItem(
  clientId: string,
  update: Partial<QueuedExpense>
): Promise<void> {
  const queue = await getQueuedExpenses();
  const idx = queue.findIndex((e) => e.clientId === clientId);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...update };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

// ---- Sync ----

export interface SyncResult {
  synced: string[];
  failed: Array<{ clientId: string; error: string }>;
}

/**
 * Attempt to sync all queued expenses to the server.
 * Returns which items succeeded and which failed.
 *
 * - Successful items are removed from queue and trigger cache invalidation
 * - Failed items stay in queue with incremented attempt count and error message
 * - Each item is synced independently (one failure doesn't block others)
 */
export async function syncQueuedExpenses(token: string): Promise<SyncResult> {
  const queue = await getQueuedExpenses();
  if (queue.length === 0) return { synced: [], failed: [] };

  const result: SyncResult = { synced: [], failed: [] };

  for (const item of queue) {
    try {
      await groupsApi.createExpense(item.groupId, item.request, token);
      await removeFromQueue(item.clientId);
      invalidateAfterExpenseChange(item.groupId);
      result.synced.push(item.clientId);
    } catch (err: any) {
      const errorMsg = err?.message ?? "Unknown error";
      await updateQueueItem(item.clientId, {
        attempts: item.attempts + 1,
        lastError: errorMsg,
      });
      result.failed.push({ clientId: item.clientId, error: errorMsg });
    }
  }

  return result;
}

// ---- Helpers ----

let _idCounter = 0;
export function generateClientId(): string {
  _idCounter++;
  return `exp_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}
