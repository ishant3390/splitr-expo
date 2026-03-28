type InvariantOk = { ok: true };
type InvariantFail = { ok: false; code: string; message: string };

export type InvariantResult = InvariantOk | InvariantFail;

interface ExpensePayerInvariantInput {
  amountPaid: number;
}

interface ExpenseSplitInvariantInput {
  splitAmount?: number;
}

interface ExpenseInvariantInput {
  totalAmount: number;
  payers: ExpensePayerInvariantInput[];
  splits: ExpenseSplitInvariantInput[];
}

interface SettlementInvariantInput {
  payerUserId?: string;
  payerGuestUserId?: string;
  payeeUserId?: string;
  payeeGuestUserId?: string;
  amount: number;
  currency: string;
}

function fail(code: string, message: string): InvariantFail {
  return { ok: false, code, message };
}

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

/**
 * Deterministically allocates total cents by percentage weights using
 * floor + largest remainder distribution. Returns null for invalid input.
 */
export function allocatePercentageSplitCents(
  totalAmount: number,
  percentages: number[]
): number[] | null {
  if (!isInteger(totalAmount) || totalAmount < 0 || percentages.length === 0) {
    return null;
  }
  if (percentages.some((pct) => !Number.isFinite(pct) || pct < 0)) {
    return null;
  }
  const totalPercentage = percentages.reduce((sum, pct) => sum + pct, 0);
  if (Math.abs(totalPercentage - 100) > 0.5) {
    return null;
  }

  const rows = percentages.map((pct, idx) => {
    const exact = (totalAmount * pct) / 100;
    const base = Math.floor(exact);
    return { idx, amount: base, fraction: exact - base };
  });

  let remainder = totalAmount - rows.reduce((sum, row) => sum + row.amount, 0);
  if (remainder < 0) return null;

  rows.sort((a, b) => b.fraction - a.fraction || a.idx - b.idx);
  let cursor = 0;
  while (remainder > 0) {
    rows[cursor % rows.length].amount += 1;
    cursor += 1;
    remainder -= 1;
  }

  rows.sort((a, b) => a.idx - b.idx);
  return rows.map((row) => row.amount);
}

/**
 * Normalizes fixed split cents so the sum matches total amount without
 * ever producing negative splits. Returns null for invalid input.
 */
export function normalizeFixedSplitCents(
  totalAmount: number,
  rawSplitCents: number[]
): number[] | null {
  if (!isInteger(totalAmount) || totalAmount < 0 || rawSplitCents.length === 0) {
    return null;
  }
  if (rawSplitCents.some((cents) => !isInteger(cents) || cents < 0)) {
    return null;
  }

  const normalized = [...rawSplitCents];
  const sum = normalized.reduce((acc, value) => acc + value, 0);
  let delta = totalAmount - sum;
  if (Math.abs(delta) > 1) return null;

  if (delta === 0) return normalized;

  if (delta > 0) {
    // Add shortfall to the largest share for deterministic behavior.
    const largestIndex = normalized.reduce(
      (best, value, index, arr) => (value > arr[best] ? index : best),
      0
    );
    normalized[largestIndex] += delta;
    return normalized;
  }

  // delta < 0: remove overflow from largest shares first without going negative.
  let overflow = -delta;
  const ordered = normalized
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value || a.index - b.index);

  for (const row of ordered) {
    if (overflow <= 0) break;
    const removable = Math.min(normalized[row.index], overflow);
    normalized[row.index] -= removable;
    overflow -= removable;
  }

  if (overflow > 0) return null;
  return normalized;
}

export function validateExpenseInvariants(input: ExpenseInvariantInput): InvariantResult {
  if (!isInteger(input.totalAmount) || input.totalAmount <= 0) {
    return fail("EXPENSE_TOTAL_INVALID", "Total amount must be a whole number of cents greater than zero.");
  }

  if (!input.payers.length) {
    return fail("EXPENSE_PAYERS_EMPTY", "Expense must have at least one payer.");
  }

  const payerAmountCheck = input.payers.every(
    (payer) => isInteger(payer.amountPaid) && payer.amountPaid >= 0
  );
  if (!payerAmountCheck) {
    return fail("EXPENSE_PAYER_AMOUNT_INVALID", "Each payer amount must be a non-negative whole number of cents.");
  }

  const payerTotal = input.payers.reduce((sum, payer) => sum + payer.amountPaid, 0);
  if (payerTotal !== input.totalAmount) {
    return fail("EXPENSE_PAYER_SUM_MISMATCH", "Payer amounts must add up to the expense total.");
  }

  if (!input.splits.length) {
    return fail("EXPENSE_SPLITS_EMPTY", "Expense must have at least one split.");
  }

  const splitAmountCheck = input.splits.every(
    (split) => split.splitAmount != null && isInteger(split.splitAmount) && split.splitAmount >= 0
  );
  if (!splitAmountCheck) {
    return fail("EXPENSE_SPLIT_AMOUNT_INVALID", "Each split amount must be a non-negative whole number of cents.");
  }

  const splitTotal = input.splits.reduce((sum, split) => sum + (split.splitAmount ?? 0), 0);
  if (splitTotal !== input.totalAmount) {
    return fail("EXPENSE_SPLIT_SUM_MISMATCH", "Split amounts must add up to the expense total.");
  }

  return { ok: true };
}

function participantIdentity(userId?: string, guestId?: string): string | null {
  if (userId) return `user:${userId}`;
  if (guestId) return `guest:${guestId}`;
  return null;
}

export function validateSettlementInvariants(input: SettlementInvariantInput): InvariantResult {
  if (!isInteger(input.amount) || input.amount <= 0) {
    return fail("SETTLEMENT_AMOUNT_INVALID", "Settlement amount must be a whole number of cents greater than zero.");
  }

  if (!input.currency.trim()) {
    return fail("SETTLEMENT_CURRENCY_MISSING", "Settlement currency is required.");
  }

  const payer = participantIdentity(input.payerUserId, input.payerGuestUserId);
  const payee = participantIdentity(input.payeeUserId, input.payeeGuestUserId);

  if (!payer) {
    return fail("SETTLEMENT_PAYER_MISSING", "Settlement must include a payer.");
  }
  if (!payee) {
    return fail("SETTLEMENT_PAYEE_MISSING", "Settlement must include a payee.");
  }
  if (payer === payee) {
    return fail("SETTLEMENT_SELF_PAYMENT", "Payer and payee must be different.");
  }

  return { ok: true };
}
