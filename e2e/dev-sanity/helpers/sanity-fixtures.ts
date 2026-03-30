/**
 * Test data factories for dev sanity tests.
 * All names prefixed with [SANITY] + timestamp for uniqueness and easy identification.
 */

function ts() {
  return Date.now().toString(36);
}

export const sanityFixtures = {
  group(overrides?: {
    name?: string;
    groupType?: string;
    emoji?: string;
    defaultCurrency?: string;
  }) {
    return {
      name: `[SANITY] ${overrides?.name || "Test Group"} ${ts()}`,
      groupType: overrides?.groupType || "trip",
      emoji: overrides?.emoji || "🔬",
      defaultCurrency: overrides?.defaultCurrency || "USD",
    };
  },

  expense(
    payerUserId: string,
    splitUserIds: string[],
    overrides?: {
      description?: string;
      totalAmount?: number;
      currency?: string;
      categoryId?: string;
      splitType?: string;
    }
  ) {
    const totalAmount = overrides?.totalAmount || 2550;
    const perPerson = Math.floor(totalAmount / splitUserIds.length);
    const remainder = totalAmount - perPerson * splitUserIds.length;

    return {
      description: `[SANITY] ${overrides?.description || "Test Expense"} ${ts()}`,
      totalAmount,
      currency: overrides?.currency || "USD",
      categoryId: overrides?.categoryId,
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: overrides?.splitType || "EQUAL",
      payers: [{ userId: payerUserId, amountPaid: totalAmount }],
      splits: splitUserIds.map((userId, idx) => ({
        userId,
        splitAmount:
          idx === splitUserIds.length - 1 ? perPerson + remainder : perPerson,
      })),
    };
  },

  settlement(
    payerUserId: string,
    payeeUserId: string,
    overrides?: {
      amount?: number;
      currency?: string;
      paymentMethod?: string;
    }
  ) {
    return {
      payerUserId,
      payeeUserId,
      amount: overrides?.amount || 1000,
      currency: overrides?.currency || "USD",
      paymentMethod: overrides?.paymentMethod || "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    };
  },

  guestExpense(
    payerUserId: string,
    guestUserId: string,
    overrides?: {
      description?: string;
      totalAmount?: number;
    }
  ) {
    const totalAmount = overrides?.totalAmount || 2000;
    const perPerson = Math.floor(totalAmount / 2);
    const remainder = totalAmount - perPerson * 2;

    return {
      description: `[SANITY] ${overrides?.description || "Guest Expense"} ${ts()}`,
      totalAmount,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: payerUserId, amountPaid: totalAmount }],
      splits: [
        { userId: payerUserId, splitAmount: perPerson },
        { guestUserId, splitAmount: perPerson + remainder },
      ],
    };
  },

  guestMember(overrides?: { name?: string; email?: string }) {
    return {
      name: `[SANITY] ${overrides?.name || "Guest"} ${ts()}`,
      email: overrides?.email,
    };
  },

  unequalExpense(
    payerUserId: string,
    splits: Array<{ userId?: string; guestUserId?: string; amount: number }>,
    overrides?: {
      description?: string;
      currency?: string;
    }
  ) {
    const totalAmount = splits.reduce((sum, s) => sum + s.amount, 0);
    return {
      description: `[SANITY] ${overrides?.description || "Unequal Expense"} ${ts()}`,
      totalAmount,
      currency: overrides?.currency || "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EXACT",
      payers: [{ userId: payerUserId, amountPaid: totalAmount }],
      splits: splits.map((s) => ({
        userId: s.userId,
        guestUserId: s.guestUserId,
        splitAmount: s.amount,
      })),
    };
  },
};
