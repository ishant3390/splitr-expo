/**
 * Test data factories for integration tests.
 * All names prefixed with [E2E] + timestamp for uniqueness and easy identification.
 */

function ts() {
  return Date.now().toString(36);
}

export const fixtures = {
  group(overrides?: {
    name?: string;
    groupType?: string;
    emoji?: string;
    defaultCurrency?: string;
  }) {
    return {
      name: `[E2E] ${overrides?.name || "Test Group"} ${ts()}`,
      groupType: overrides?.groupType || "trip",
      emoji: overrides?.emoji || "🧪",
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
    const totalAmount = overrides?.totalAmount || 2550; // $25.50 in cents
    const splitAmount = Math.floor(totalAmount / splitUserIds.length);

    return {
      description: `[E2E] ${overrides?.description || "Test Expense"} ${ts()}`,
      totalAmount,
      currency: overrides?.currency || "USD",
      categoryId: overrides?.categoryId,
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: overrides?.splitType || "EQUAL",
      payers: [{ userId: payerUserId, amountPaid: totalAmount }],
      splits: splitUserIds.map((userId) => ({
        userId,
        splitAmount,
      })),
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
    const totalAmount = overrides?.totalAmount || 2000; // $20.00
    const splitAmount = Math.floor(totalAmount / 2);

    return {
      description: `[E2E] ${overrides?.description || "Guest Expense"} ${ts()}`,
      totalAmount,
      currency: "USD",
      expenseDate: new Date().toISOString().split("T")[0],
      splitType: "EQUAL",
      payers: [{ userId: payerUserId, amountPaid: totalAmount }],
      splits: [
        { userId: payerUserId, splitAmount },
        { guestUserId, splitAmount },
      ],
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
      amount: overrides?.amount || 1000, // $10.00
      currency: overrides?.currency || "USD",
      paymentMethod: overrides?.paymentMethod || "cash",
      settlementDate: new Date().toISOString().split("T")[0],
    };
  },

  guestMember(overrides?: { name?: string; email?: string }) {
    return {
      name: `[E2E] ${overrides?.name || "Guest"} ${ts()}`,
      email: overrides?.email,
    };
  },
};
