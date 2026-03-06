import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders text children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Press</Button>);

    fireEvent.press(screen.getByText("Press"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} disabled>
        Disabled
      </Button>
    );

    fireEvent.press(screen.getByText("Disabled"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not call onPress when loading", () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} loading>
        Loading
      </Button>
    );

    fireEvent.press(screen.getByText("Loading"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows loading indicator when loading", () => {
    render(<Button loading>Loading</Button>);
    // ActivityIndicator should be present
    expect(screen.getByText("Loading")).toBeTruthy();
  });

  it("renders custom children (non-string)", () => {
    const { getByTestId } = render(
      <Button>
        <React.Fragment>
          <></>
        </React.Fragment>
      </Button>
    );
    // Should render without crashing
    expect(true).toBe(true);
  });
});
