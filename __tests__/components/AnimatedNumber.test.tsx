import React from "react";
import { render, screen } from "@testing-library/react-native";
import { AnimatedNumber } from "@/components/ui/animated-number";

describe("AnimatedNumber", () => {
  it("renders initial value", () => {
    render(<AnimatedNumber value={42} />);
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders with custom formatter", () => {
    render(<AnimatedNumber value={1234} formatter={(n) => `$${n.toFixed(2)}`} />);
    expect(screen.getByText("$1234.00")).toBeTruthy();
  });

  it("updates display when value changes", () => {
    // In test env, withTiming resolves instantly via mock (returns target value)
    // and useAnimatedReaction fires synchronously
    const { rerender } = render(<AnimatedNumber value={0} duration={600} />);
    expect(screen.getByText("0")).toBeTruthy();

    rerender(<AnimatedNumber value={100} duration={600} />);
    // Mock withTiming returns value directly, useAnimatedReaction fires with new value
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("does not change display when value stays the same", () => {
    const { rerender } = render(<AnimatedNumber value={50} />);
    rerender(<AnimatedNumber value={50} />);
    expect(screen.getByText("50")).toBeTruthy();
  });

  it("accepts custom duration prop", () => {
    render(<AnimatedNumber value={10} duration={100} />);
    expect(screen.getByText("10")).toBeTruthy();
  });

  it("passes through text props", () => {
    render(<AnimatedNumber value={99} testID="animated-num" />);
    expect(screen.getByTestId("animated-num")).toBeTruthy();
  });
});
