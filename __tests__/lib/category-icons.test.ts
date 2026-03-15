import {
  getCategoryIcon,
  getActivityIcon,
  getPaymentMethodIcon,
  CATEGORY_ICON_MAP,
  ACTIVITY_ICON_MAP,
  PAYMENT_METHOD_ICON_MAP,
  type CategoryIconConfig,
} from "../../lib/category-icons";

// ---------------------------------------------------------------------------
// getCategoryIcon
// ---------------------------------------------------------------------------
describe("getCategoryIcon", () => {
  it("returns config for known icon names", () => {
    const food = getCategoryIcon("restaurant");
    expect(food.label).toBe("Restaurant");
    expect(food.color).toBe("#d97706");

    const transport = getCategoryIcon("car");
    expect(transport.label).toBe("Car");
    expect(transport.color).toBe("#2563eb");
  });

  it("is case-insensitive", () => {
    const upper = getCategoryIcon("RESTAURANT");
    expect(upper.label).toBe("Restaurant");

    const mixed = getCategoryIcon("Coffee");
    expect(mixed.label).toBe("Coffee");

    const allCaps = getCategoryIcon("FLIGHT");
    expect(allCaps.label).toBe("Flight");
  });

  it("returns default config for undefined/empty input", () => {
    const undef = getCategoryIcon(undefined);
    expect(undef.label).toBe("Other");
    expect(undef.color).toBe("#64748b");

    const empty = getCategoryIcon("");
    expect(empty.label).toBe("Other");
  });

  it("returns default config for completely unknown icon name", () => {
    const result = getCategoryIcon("xyz_unknown_999");
    expect(result.label).toBe("Other");
    expect(result.color).toBe("#64748b");
  });

  it("fuzzy matches substring keys (e.g. 'local_restaurant' matches 'restaurant')", () => {
    const result = getCategoryIcon("local_restaurant");
    expect(result.label).toBe("Restaurant");
    expect(result.color).toBe("#d97706");
  });

  it("fuzzy matches when map key is a substring of input", () => {
    const result = getCategoryIcon("my_coffee_shop");
    expect(result.label).toBe("Coffee");
  });

  it("returns distinct configs for different categories", () => {
    const food = getCategoryIcon("food");
    const transport = getCategoryIcon("transport");
    const health = getCategoryIcon("health");
    expect(food.color).not.toBe(transport.color);
    expect(food.color).not.toBe(health.color);
    expect(transport.color).not.toBe(health.color);
  });

  it("all CATEGORY_ICON_MAP entries have valid fields", () => {
    for (const [key, config] of Object.entries(CATEGORY_ICON_MAP)) {
      expect(config.icon).toBeDefined();
      expect(typeof config.color).toBe("string");
      expect(config.color).toMatch(/^#/);
      expect(typeof config.bg).toBe("string");
      expect(config.bg).toMatch(/^#/);
      expect(typeof config.label).toBe("string");
      expect(config.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getActivityIcon
// ---------------------------------------------------------------------------
describe("getActivityIcon", () => {
  it("returns activity type icon when no category", () => {
    const result = getActivityIcon("expense_created");
    expect(result.label).toBe("Added");
    expect(result.color).toBe("#0d9488");
  });

  it("returns category icon when categoryName matches", () => {
    const result = getActivityIcon("expense_created", "food");
    expect(result.color).toBe("#d97706"); // food amber color
  });

  it("falls back to activity type icon when categoryName is unknown", () => {
    const result = getActivityIcon("expense_created", "xyz_unknown");
    expect(result.label).toBe("Added");
  });

  it("returns default for unknown activity type", () => {
    const result = getActivityIcon("unknown_type");
    expect(result.label).toBe("Other");
  });

  it("returns category icon for expense_updated with category", () => {
    const result = getActivityIcon("expense_updated", "transport");
    expect(result.color).toBe("#2563eb");
  });

  it("handles settlement_created", () => {
    const result = getActivityIcon("settlement_created");
    expect(result.label).toBe("Settled");
  });

  it("handles member_joined", () => {
    const result = getActivityIcon("member_joined");
    expect(result.label).toBe("Joined");
  });

  it("handles group_created", () => {
    const result = getActivityIcon("group_created");
    expect(result.label).toBe("Created");
  });

  it("all ACTIVITY_ICON_MAP entries have valid fields", () => {
    for (const [key, config] of Object.entries(ACTIVITY_ICON_MAP)) {
      expect(config.icon).toBeDefined();
      expect(config.color).toMatch(/^#/);
      expect(config.bg).toMatch(/^#/);
      expect(config.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getPaymentMethodIcon
// ---------------------------------------------------------------------------
describe("getPaymentMethodIcon", () => {
  it("returns config for known payment methods", () => {
    const cash = getPaymentMethodIcon("cash");
    expect(cash.label).toBe("Cash");

    const venmo = getPaymentMethodIcon("venmo");
    expect(venmo.label).toBe("Venmo");

    const zelle = getPaymentMethodIcon("zelle");
    expect(zelle.label).toBe("Zelle");

    const paypal = getPaymentMethodIcon("paypal");
    expect(paypal.label).toBe("PayPal");

    const bank = getPaymentMethodIcon("bank_transfer");
    expect(bank.label).toBe("Bank");

    const other = getPaymentMethodIcon("other");
    expect(other.label).toBe("Other");
  });

  it("is case-insensitive", () => {
    const result = getPaymentMethodIcon("CASH");
    expect(result.label).toBe("Cash");
  });

  it("returns default for undefined", () => {
    const result = getPaymentMethodIcon(undefined);
    expect(result.label).toBe("Other");
  });

  it("returns default for unknown key", () => {
    const result = getPaymentMethodIcon("bitcoin");
    expect(result.label).toBe("Other");
  });

  it("returns default for empty string", () => {
    const result = getPaymentMethodIcon("");
    expect(result.label).toBe("Other");
  });

  it("all PAYMENT_METHOD_ICON_MAP entries have valid fields", () => {
    for (const [key, config] of Object.entries(PAYMENT_METHOD_ICON_MAP)) {
      expect(config.icon).toBeDefined();
      expect(config.color).toMatch(/^#/);
      expect(config.bg).toMatch(/^#/);
      expect(config.label.length).toBeGreaterThan(0);
    }
  });
});
