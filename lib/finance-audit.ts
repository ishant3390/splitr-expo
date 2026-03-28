import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { parseApiError } from "./errors";

const FINANCE_AUDIT_KEY = "@splitr/finance_audit_log";
const MAX_FINANCE_AUDIT_ENTRIES = 500;
let writeQueue: Promise<void> = Promise.resolve();

export type FinanceAuditAction =
  | "expense_create"
  | "expense_update"
  | "expense_delete"
  | "settlement_create"
  | "settlement_update"
  | "settlement_delete"
  | "group_archive"
  | "group_restore";

export type FinanceAuditStatus = "started" | "succeeded" | "failed";

export interface FinanceAuditDetails {
  groupId?: string;
  entityId?: string;
  amount?: number;
  currency?: string;
}

export interface FinanceAuditEntry extends FinanceAuditDetails {
  id: string;
  operationId: string;
  correlationId: string;
  action: FinanceAuditAction;
  status: FinanceAuditStatus;
  createdAt: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface FinanceAuditContext {
  operationId: string;
  correlationId: string;
  action: FinanceAuditAction;
  details: FinanceAuditDetails;
}

async function readAuditLog(): Promise<FinanceAuditEntry[]> {
  const raw = await AsyncStorage.getItem(FINANCE_AUDIT_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function appendAuditEntry(entry: FinanceAuditEntry): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    try {
      const current = await readAuditLog();
      const next = [...current, entry];
      const bounded =
        next.length > MAX_FINANCE_AUDIT_ENTRIES
          ? next.slice(next.length - MAX_FINANCE_AUDIT_ENTRIES)
          : next;
      await AsyncStorage.setItem(FINANCE_AUDIT_KEY, JSON.stringify(bounded));
    } catch {
      // Audit persistence must never block financial operations.
    }
  });
  await writeQueue;
}

export async function startFinanceAudit(
  action: FinanceAuditAction,
  details: FinanceAuditDetails = {},
  operationId?: string
): Promise<FinanceAuditContext> {
  const context: FinanceAuditContext = {
    operationId: operationId ?? `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    correlationId: randomUUID(),
    action,
    details,
  };

  await appendAuditEntry({
    id: randomUUID(),
    operationId: context.operationId,
    correlationId: context.correlationId,
    action: context.action,
    status: "started",
    createdAt: new Date().toISOString(),
    ...details,
  });

  return context;
}

export async function markFinanceAuditSuccess(
  context: FinanceAuditContext,
  details: FinanceAuditDetails = {}
): Promise<void> {
  await appendAuditEntry({
    id: randomUUID(),
    operationId: context.operationId,
    correlationId: context.correlationId,
    action: context.action,
    status: "succeeded",
    createdAt: new Date().toISOString(),
    ...context.details,
    ...details,
  });
}

export async function markFinanceAuditFailure(
  context: FinanceAuditContext,
  err: unknown,
  details: FinanceAuditDetails = {}
): Promise<void> {
  const apiErr = parseApiError(err);
  await appendAuditEntry({
    id: randomUUID(),
    operationId: context.operationId,
    correlationId: context.correlationId,
    action: context.action,
    status: "failed",
    createdAt: new Date().toISOString(),
    ...context.details,
    ...details,
    errorCode: apiErr?.code,
    errorMessage: apiErr?.message ?? (err instanceof Error ? err.message : "Unknown error"),
  });
}

export async function getFinanceAuditEntries(): Promise<FinanceAuditEntry[]> {
  return readAuditLog();
}

export async function clearFinanceAuditEntries(): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    try {
      await AsyncStorage.removeItem(FINANCE_AUDIT_KEY);
    } catch {
      // Non-critical.
    }
  });
  await writeQueue;
}

// Test helper to avoid cross-test queue leakage.
export function __resetFinanceAuditWriteQueueForTests(): void {
  writeQueue = Promise.resolve();
}
