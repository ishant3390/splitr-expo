import {
  getCategoryIcon,
  getActivityIcon,
  getPaymentMethodIcon,
  inferCategoryIconFromDescription,
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
      expect(config.bg).toMatch(/^#|^transparent$/);
      expect(config.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// inferCategoryIconFromDescription
// ---------------------------------------------------------------------------
describe("inferCategoryIconFromDescription", () => {
  it("returns food icon for 'Pizza'", () => {
    const result = inferCategoryIconFromDescription("Pizza");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#d97706"); // amber food
  });

  it("returns food icon for 'Dinner at Olive Garden'", () => {
    const result = inferCategoryIconFromDescription("Dinner at Olive Garden");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#d97706");
  });

  it("returns transport icon for 'Uber ride'", () => {
    const result = inferCategoryIconFromDescription("Uber ride");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#2563eb"); // blue transport
  });

  it("returns transport icon for 'Gas station'", () => {
    const result = inferCategoryIconFromDescription("Gas station");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#2563eb");
  });

  it("returns entertainment icon for 'Netflix subscription'", () => {
    const result = inferCategoryIconFromDescription("Netflix subscription");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#db2777"); // pink entertainment
  });

  it("returns health icon for 'Pharmacy'", () => {
    const result = inferCategoryIconFromDescription("Pharmacy");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#dc2626"); // red health
  });

  it("returns null for random text with no matching keywords", () => {
    const result = inferCategoryIconFromDescription("Random stuff 12345");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(inferCategoryIconFromDescription("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(inferCategoryIconFromDescription("   ")).toBeNull();
  });

  it("is case-insensitive", () => {
    const result = inferCategoryIconFromDescription("COFFEE at Starbucks");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#d97706");
  });

  it("returns accommodation icon for 'Hotel stay'", () => {
    const result = inferCategoryIconFromDescription("Hotel stay");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#7c3aed"); // violet accommodation
  });

  it("returns utilities icon for 'Electricity bill'", () => {
    const result = inferCategoryIconFromDescription("Electricity bill");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#0284c7"); // sky utilities
  });

  it("returns education icon for 'Tuition payment'", () => {
    const result = inferCategoryIconFromDescription("Tuition payment");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("#0891b2"); // cyan education
  });
});

// ---------------------------------------------------------------------------
// getActivityIcon with description fallback
// ---------------------------------------------------------------------------
describe("getActivityIcon with description fallback", () => {
  it("returns category icon from description when categoryName is missing", () => {
    const result = getActivityIcon("expense_created", undefined, "Pizza for the team");
    expect(result.color).toBe("#d97706"); // food amber, not teal activity
  });

  it("prefers categoryName over description", () => {
    const result = getActivityIcon("expense_created", "transport", "Pizza delivery");
    expect(result.color).toBe("#2563eb"); // transport blue, not food amber
  });

  it("falls back to activity type when neither categoryName nor description match", () => {
    const result = getActivityIcon("expense_created", undefined, "Some random thing");
    expect(result.label).toBe("Added"); // default activity icon
    expect(result.color).toBe("#0d9488"); // teal
  });

  it("falls back to description when categoryName is unknown", () => {
    const result = getActivityIcon("expense_created", "xyz_unknown", "Uber ride home");
    expect(result.color).toBe("#2563eb"); // transport blue
  });

  it("handles undefined description gracefully", () => {
    const result = getActivityIcon("expense_created", undefined, undefined);
    expect(result.label).toBe("Added");
  });

  it("handles empty description", () => {
    const result = getActivityIcon("expense_created", undefined, "");
    expect(result.label).toBe("Added");
  });
});
