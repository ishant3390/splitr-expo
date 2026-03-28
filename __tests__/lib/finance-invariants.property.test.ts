import {
  allocatePercentageSplitCents,
  normalizeFixedSplitCents,
  validateExpenseInvariants,
} from "@/lib/finance-invariants";

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function buildPercentages(rng: () => number, count: number): number[] {
  const weights = Array.from({ length: count }, () => randomInt(rng, 1, 1000));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);

  const percentages = weights.map((value) => Number(((value / weightTotal) * 100).toFixed(6)));
  const running = percentages.slice(0, -1).reduce((sum, value) => sum + value, 0);
  percentages[percentages.length - 1] = Number((100 - running).toFixed(6));
  return percentages;
}

describe("finance invariants property tests", () => {
  it("allocatePercentageSplitCents preserves integer conservation across generated cases", () => {
    const rng = createSeededRng(0xdecafbad);

    for (let i = 0; i < 500; i += 1) {
      const participants = randomInt(rng, 1, 8);
      const total = randomInt(rng, 0, 1_000_000);
      const percentages = buildPercentages(rng, participants);

      const result = allocatePercentageSplitCents(total, percentages);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(participants);
      expect(result?.every((value) => Number.isInteger(value) && value >= 0)).toBe(true);
      expect(result?.reduce((sum, value) => sum + value, 0)).toBe(total);
    }
  });

  it("allocatePercentageSplitCents is deterministic for the same input", () => {
    const rng = createSeededRng(0xabc123ef);

    for (let i = 0; i < 200; i += 1) {
      const participants = randomInt(rng, 1, 6);
      const total = randomInt(rng, 0, 100_000);
      const percentages = buildPercentages(rng, participants);

      const first = allocatePercentageSplitCents(total, percentages);
      const second = allocatePercentageSplitCents(total, percentages);
      expect(second).toEqual(first);
    }
  });

  it("normalizeFixedSplitCents balances generated inputs when drift is within +/-1", () => {
    const rng = createSeededRng(0x5eedbeef);

    for (let i = 0; i < 400; i += 1) {
      const participants = randomInt(rng, 1, 8);
      const total = randomInt(rng, 1, 1_000_000);
      const percentages = buildPercentages(rng, participants);
      const base = allocatePercentageSplitCents(total, percentages);

      expect(base).not.toBeNull();
      const drift = randomInt(rng, -1, 1);
      const drifted = [...(base ?? [])];
      const idx = randomInt(rng, 0, participants - 1);

      if (drift < 0 && drifted[idx] === 0) {
        continue;
      }
      drifted[idx] += drift;

      const normalized = normalizeFixedSplitCents(total, drifted);
      expect(normalized).not.toBeNull();
      expect(normalized?.every((value) => Number.isInteger(value) && value >= 0)).toBe(true);
      expect(normalized?.reduce((sum, value) => sum + value, 0)).toBe(total);
    }
  });

  it("generated allocation + payer totals satisfy validateExpenseInvariants", () => {
    const rng = createSeededRng(0x1234babe);

    for (let i = 0; i < 300; i += 1) {
      const participants = randomInt(rng, 1, 8);
      const total = randomInt(rng, 1, 1_000_000);
      const percentages = buildPercentages(rng, participants);

      const splits = allocatePercentageSplitCents(total, percentages);
      expect(splits).not.toBeNull();

      const result = validateExpenseInvariants({
        totalAmount: total,
        payers: [{ amountPaid: total }],
        splits: (splits ?? []).map((splitAmount) => ({ splitAmount })),
      });
      expect(result).toEqual({ ok: true });
    }
  });
});
