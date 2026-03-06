import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  it("renders unchecked state", () => {
    const onChange = jest.fn();
    render(<Checkbox checked={false} onCheckedChange={onChange} />);
    // Should have checkbox role
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("renders checked state", () => {
    const onChange = jest.fn();
    render(<Checkbox checked={true} onCheckedChange={onChange} />);
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("toggles on press", () => {
    const onChange = jest.fn();
    render(<Checkbox checked={false} onCheckedChange={onChange} />);

    fireEvent.press(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles from checked to unchecked", () => {
    const onChange = jest.fn();
    render(<Checkbox checked={true} onCheckedChange={onChange} />);

    fireEvent.press(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("does not toggle when disabled", () => {
    const onChange = jest.fn();
    render(<Checkbox checked={false} onCheckedChange={onChange} disabled />);

    fireEvent.press(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
