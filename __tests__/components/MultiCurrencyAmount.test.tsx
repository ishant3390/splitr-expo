import React from "react";
import { render, screen } from "@testing-library/react-native";
import { MultiCurrencyAmount, formatMultiCurrency } from "@/components/ui/multi-currency-amount";
import type { CurrencyAmount } from "@/lib/types";

describe("MultiCurrencyAmount", () => {
  it("renders zero with fallback currency when amounts is empty", () => {
    render(<MultiCurrencyAmount amounts={[]} />);
    expect(screen.getByText("$0.00")).toBeTruthy();
  });

  it("renders zero with custom fallback currency when amounts is empty", () => {
    render(<MultiCurrencyAmount amounts={[]} fallbackCurrency="GBP" />);
    expect(screen.getByText("£0.00")).toBeTruthy();
  });

  it("renders single currency amount", () => {
    const amounts: CurrencyAmount[] = [{ currency: "GBP", amount: 2500 }];
    render(<MultiCurrencyAmount amounts={amounts} />);
    expect(screen.getByText("£25.00")).toBeTruthy();
  });

  it("renders multiple currencies joined with +", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "USD", amount: 10000 },
      { currency: "GBP", amount: 2500 },
    ];
    render(<MultiCurrencyAmount amounts={amounts} />);
    expect(screen.getByText("$100.00 + £25.00")).toBeTruthy();
  });

  it("filters out zero-amount entries", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "USD", amount: 5000 },
      { currency: "EUR", amount: 0 },
      { currency: "GBP", amount: 1500 },
    ];
    render(<MultiCurrencyAmount amounts={amounts} />);
    expect(screen.getByText("$50.00 + £15.00")).toBeTruthy();
  });

  it("shows fallback zero when all amounts are zero", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "USD", amount: 0 },
      { currency: "EUR", amount: 0 },
    ];
    render(<MultiCurrencyAmount amounts={amounts} />);
    expect(screen.getByText("$0.00")).toBeTruthy();
  });

  it("filters out negative-amount entries", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "USD", amount: 5000 },
      { currency: "EUR", amount: -1000 },
    ];
    render(<MultiCurrencyAmount amounts={amounts} />);
    expect(screen.getByText("$50.00")).toBeTruthy();
  });

  it("sets accessibilityLabel with 'and' separator", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "USD", amount: 10000 },
      { currency: "GBP", amount: 2500 },
    ];
    render(<MultiCurrencyAmount amounts={amounts} />);
    const text = screen.getByText("$100.00 + £25.00");
    expect(text.props.accessibilityLabel).toBe("$100.00 and £25.00");
  });

  it("passes className and style props", () => {
    const amounts: CurrencyAmount[] = [{ currency: "USD", amount: 100 }];
    render(
      <MultiCurrencyAmount
        amounts={amounts}
        className="text-lg font-bold"
        style={{ color: "red" }}
      />
    );
    const text = screen.getByText("$1.00");
    expect(text.props.style).toEqual(expect.objectContaining({ color: "red" }));
  });
});

describe("formatMultiCurrency", () => {
  it("returns zero for empty array", () => {
    expect(formatMultiCurrency([])).toBe("$0.00");
  });

  it("returns zero with custom fallback", () => {
    expect(formatMultiCurrency([], "EUR")).toBe("€0.00");
  });

  it("formats single currency", () => {
    expect(formatMultiCurrency([{ currency: "GBP", amount: 2500 }])).toBe("£25.00");
  });

  it("formats multiple currencies", () => {
    expect(
      formatMultiCurrency([
        { currency: "USD", amount: 10000 },
        { currency: "GBP", amount: 2500 },
      ])
    ).toBe("$100.00 + £25.00");
  });

  it("filters zero amounts", () => {
    expect(
      formatMultiCurrency([
        { currency: "USD", amount: 5000 },
        { currency: "EUR", amount: 0 },
      ])
    ).toBe("$50.00");
  });

  it("filters negative amounts", () => {
    expect(
      formatMultiCurrency([
        { currency: "USD", amount: 5000 },
        { currency: "EUR", amount: -1000 },
      ])
    ).toBe("$50.00");
  });
});
