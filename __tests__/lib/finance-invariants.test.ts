import {
  allocatePercentageSplitCents,
  normalizeFixedSplitCents,
  validateExpenseInvariants,
  validateSettlementInvariants,
} from "@/lib/finance-invariants";

describe("validateExpenseInvariants", () => {
  it("returns ok for valid expense totals", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [{ amountPaid: 1000 }],
        splits: [{ splitAmount: 250 }, { splitAmount: 750 }],
      })
    ).toEqual({ ok: true });
  });

  it("fails when total amount is not an integer", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000.5,
        payers: [{ amountPaid: 1000 }],
        splits: [{ splitAmount: 1000 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_TOTAL_INVALID" });
  });

  it("fails when total amount is zero or negative", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 0,
        payers: [{ amountPaid: 0 }],
        splits: [{ splitAmount: 0 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_TOTAL_INVALID" });
  });

  it("fails when payers are missing", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [],
        splits: [{ splitAmount: 1000 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_PAYERS_EMPTY" });
  });

  it("fails when payer amounts are invalid", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [{ amountPaid: -1 }],
        splits: [{ splitAmount: 1000 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_PAYER_AMOUNT_INVALID" });
  });

  it("fails when payer sum does not match total", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [{ amountPaid: 600 }, { amountPaid: 300 }],
        splits: [{ splitAmount: 500 }, { splitAmount: 500 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_PAYER_SUM_MISMATCH" });
  });

  it("fails when splits are missing", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [{ amountPaid: 1000 }],
        splits: [],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_SPLITS_EMPTY" });
  });

  it("fails when split amounts are invalid", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [{ amountPaid: 1000 }],
        splits: [{ splitAmount: 400.5 }, { splitAmount: 599.5 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_SPLIT_AMOUNT_INVALID" });
  });

  it("fails when split sum does not match total", () => {
    expect(
      validateExpenseInvariants({
        totalAmount: 1000,
        payers: [{ amountPaid: 1000 }],
        splits: [{ splitAmount: 400 }, { splitAmount: 500 }],
      })
    ).toMatchObject({ ok: false, code: "EXPENSE_SPLIT_SUM_MISMATCH" });
  });
});

describe("validateSettlementInvariants", () => {
  it("returns ok for valid settlement", () => {
    expect(
      validateSettlementInvariants({
        payerUserId: "u1",
        payeeUserId: "u2",
        amount: 1200,
        currency: "USD",
      })
    ).toEqual({ ok: true });
  });

  it("fails when amount is not an integer", () => {
    expect(
      validateSettlementInvariants({
        payerUserId: "u1",
        payeeUserId: "u2",
        amount: 1200.5,
        currency: "USD",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_AMOUNT_INVALID" });
  });

  it("fails when amount is zero or negative", () => {
    expect(
      validateSettlementInvariants({
        payerUserId: "u1",
        payeeUserId: "u2",
        amount: 0,
        currency: "USD",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_AMOUNT_INVALID" });
  });

  it("fails when currency is blank", () => {
    expect(
      validateSettlementInvariants({
        payerUserId: "u1",
        payeeUserId: "u2",
        amount: 500,
        currency: " ",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_CURRENCY_MISSING" });
  });

  it("fails when payer is missing", () => {
    expect(
      validateSettlementInvariants({
        payeeUserId: "u2",
        amount: 500,
        currency: "USD",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_PAYER_MISSING" });
  });

  it("fails when payee is missing", () => {
    expect(
      validateSettlementInvariants({
        payerUserId: "u1",
        amount: 500,
        currency: "USD",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_PAYEE_MISSING" });
  });

  it("fails when payer and payee are the same user", () => {
    expect(
      validateSettlementInvariants({
        payerUserId: "u1",
        payeeUserId: "u1",
        amount: 500,
        currency: "USD",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_SELF_PAYMENT" });
  });

  it("fails when payer and payee are the same guest", () => {
    expect(
      validateSettlementInvariants({
        payerGuestUserId: "g1",
        payeeGuestUserId: "g1",
        amount: 500,
        currency: "USD",
      })
    ).toMatchObject({ ok: false, code: "SETTLEMENT_SELF_PAYMENT" });
  });
});

describe("allocatePercentageSplitCents", () => {
  it("allocates exact totals without drift", () => {
    expect(allocatePercentageSplitCents(1, [50.4, 50.0, 0.1])).toEqual([1, 0, 0]);
  });

  it("returns deterministic allocation for equal fractions", () => {
    expect(allocatePercentageSplitCents(10, [33.33, 33.33, 33.34])).toEqual([3, 3, 4]);
  });

  it("returns null for invalid input", () => {
    expect(allocatePercentageSplitCents(-1, [100])).toBeNull();
    expect(allocatePercentageSplitCents(100, [])).toBeNull();
    expect(allocatePercentageSplitCents(100, [50, -50])).toBeNull();
  });

  it("returns null when percentages are materially below or above 100", () => {
    expect(allocatePercentageSplitCents(100, [40, 40])).toBeNull();
    expect(allocatePercentageSplitCents(100, [120, 20])).toBeNull();
  });

  it("supports single-person and zero-total scenarios", () => {
    expect(allocatePercentageSplitCents(100, [100])).toEqual([100]);
    expect(allocatePercentageSplitCents(0, [100])).toEqual([0]);
  });
});

describe("normalizeFixedSplitCents", () => {
  it("returns unchanged splits when already balanced", () => {
    expect(normalizeFixedSplitCents(100, [40, 60])).toEqual([40, 60]);
  });

  it("adds missing cents to largest split deterministically", () => {
    expect(normalizeFixedSplitCents(100, [50, 49])).toEqual([51, 49]);
  });

  it("removes overflow without making splits negative", () => {
    expect(normalizeFixedSplitCents(100, [101, 0])).toEqual([100, 0]);
  });

  it("returns null for invalid fixed splits", () => {
    expect(normalizeFixedSplitCents(100, [])).toBeNull();
    expect(normalizeFixedSplitCents(100, [10, -1])).toBeNull();
    expect(normalizeFixedSplitCents(100, [10.5, 89.5])).toBeNull();
    expect(normalizeFixedSplitCents(100, [1, 1])).toBeNull();
    expect(normalizeFixedSplitCents(100, [0, 0, 0])).toBeNull();
  });
});
