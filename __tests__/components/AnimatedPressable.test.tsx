import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { AnimatedPressable } from "@/components/ui/animated-pressable";

describe("AnimatedPressable", () => {
  it("renders children", () => {
    render(
      <AnimatedPressable>
        <Text>Child Content</Text>
      </AnimatedPressable>
    );
    expect(screen.getByText("Child Content")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(
      <AnimatedPressable onPress={onPress}>
        <Text>Tap Me</Text>
      </AnimatedPressable>
    );
    fireEvent.press(screen.getByText("Tap Me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("calls onPressIn callback when provided", () => {
    const onPressIn = jest.fn();
    render(
      <AnimatedPressable onPressIn={onPressIn}>
        <Text>Press In</Text>
      </AnimatedPressable>
    );
    fireEvent(screen.getByText("Press In"), "pressIn");
    expect(onPressIn).toHaveBeenCalledTimes(1);
  });

  it("calls onPressOut callback when provided", () => {
    const onPressOut = jest.fn();
    render(
      <AnimatedPressable onPressOut={onPressOut}>
        <Text>Press Out</Text>
      </AnimatedPressable>
    );
    fireEvent(screen.getByText("Press Out"), "pressOut");
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it("works without onPressIn/onPressOut callbacks", () => {
    render(
      <AnimatedPressable>
        <Text>No Callbacks</Text>
      </AnimatedPressable>
    );
    // Should not throw when press events fire without callbacks
    fireEvent(screen.getByText("No Callbacks"), "pressIn");
    fireEvent(screen.getByText("No Callbacks"), "pressOut");
  });

  it("accepts custom scaleValue", () => {
    render(
      <AnimatedPressable scaleValue={0.9}>
        <Text>Custom Scale</Text>
      </AnimatedPressable>
    );
    expect(screen.getByText("Custom Scale")).toBeTruthy();
  });

  it("passes through accessibility props", () => {
    render(
      <AnimatedPressable accessibilityLabel="action button" accessibilityRole="button">
        <Text>A11y</Text>
      </AnimatedPressable>
    );
    expect(screen.getByLabelText("action button")).toBeTruthy();
  });
});
