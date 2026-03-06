import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ThemedSwitch } from "@/components/ui/themed-switch";

describe("ThemedSwitch", () => {
  it("renders without crashing", () => {
    const onChange = jest.fn();
    const { toJSON } = render(
      <ThemedSwitch checked={false} onCheckedChange={onChange} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it("calls onCheckedChange when toggled", () => {
    const onChange = jest.fn();
    render(<ThemedSwitch checked={false} onCheckedChange={onChange} />);

    // Switch uses onValueChange internally
    const switchEl = screen.UNSAFE_getByType(
      require("react-native").Switch
    );
    fireEvent(switchEl, "valueChange", true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
