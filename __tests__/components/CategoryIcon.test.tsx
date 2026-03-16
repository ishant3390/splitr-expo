import React from "react";
import { render } from "@testing-library/react-native";
import { CategoryIcon } from "../../components/ui/category-icon";
import { getCategoryIcon, getPaymentMethodIcon } from "../../lib/category-icons";

// Mock useColorScheme from nativewind
jest.mock("nativewind", () => ({
  useColorScheme: jest.fn(() => ({ colorScheme: "light", setColorScheme: jest.fn(), toggleColorScheme: jest.fn() })),
}));

describe("CategoryIcon", () => {
  it("renders without crashing with iconName", () => {
    const { toJSON } = render(<CategoryIcon iconName="restaurant" />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders without crashing with config", () => {
    const config = getCategoryIcon("food");
    const { toJSON } = render(<CategoryIcon config={config} />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders with unknown iconName (fallback)", () => {
    const { toJSON } = render(<CategoryIcon iconName="totally_unknown" />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders with no props (defaults)", () => {
    const { toJSON } = render(<CategoryIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders sm size", () => {
    const { toJSON } = render(<CategoryIcon iconName="food" size="sm" />);
    const tree = toJSON() as any;
    expect(tree.props.style.width).toBe(28);
    expect(tree.props.style.height).toBe(28);
  });

  it("renders md size (default)", () => {
    const { toJSON } = render(<CategoryIcon iconName="food" />);
    const tree = toJSON() as any;
    expect(tree.props.style.width).toBe(40);
    expect(tree.props.style.height).toBe(40);
  });

  it("renders lg size", () => {
    const { toJSON } = render(<CategoryIcon iconName="food" size="lg" />);
    const tree = toJSON() as any;
    expect(tree.props.style.width).toBe(48);
    expect(tree.props.style.height).toBe(48);
  });

  it("uses correct background color from config", () => {
    const config = getCategoryIcon("food");
    const { toJSON } = render(<CategoryIcon config={config} />);
    const tree = toJSON() as any;
    expect(tree.props.style.backgroundColor).toBe(config.bg);
  });

  it("config prop takes precedence over iconName", () => {
    const paymentConfig = getPaymentMethodIcon("cash");
    const { toJSON } = render(<CategoryIcon iconName="food" config={paymentConfig} />);
    const tree = toJSON() as any;
    expect(tree.props.style.backgroundColor).toBe(paymentConfig.bg);
  });

  it("uses light bg in light mode", () => {
    const { toJSON } = render(<CategoryIcon iconName="food" />);
    const tree = toJSON() as any;
    expect(tree.props.style.backgroundColor).toBe("#fef3c7");
  });

  it("uses darkBg in dark mode", () => {
    const nativewind = require("nativewind");
    nativewind.useColorScheme.mockReturnValue({ colorScheme: "dark", setColorScheme: jest.fn(), toggleColorScheme: jest.fn() });

    const { toJSON } = render(<CategoryIcon iconName="food" />);
    const tree = toJSON() as any;
    expect(tree.props.style.backgroundColor).toBe("#451a03");

    nativewind.useColorScheme.mockReturnValue({ colorScheme: "light", setColorScheme: jest.fn(), toggleColorScheme: jest.fn() });
  });

  it("renders with className prop", () => {
    const { toJSON } = render(<CategoryIcon iconName="food" className="mt-2" />);
    expect(toJSON()).toBeTruthy();
  });
});
