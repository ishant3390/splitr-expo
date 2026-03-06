import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { OTPInput } from "@/components/ui/otp-input";

describe("OTPInput", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  // 1. Renders correct number of inputs — default 6, custom length=4
  it("renders 6 inputs by default", () => {
    render(<OTPInput value="" onChange={mockOnChange} />);
    const inputs = screen.getAllByDisplayValue("");
    expect(inputs.length).toBe(6);
  });

  it("renders custom number of inputs when length=4", () => {
    render(<OTPInput value="" onChange={mockOnChange} length={4} />);
    const inputs = screen.getAllByDisplayValue("");
    expect(inputs.length).toBe(4);
  });

  // 2. Displays value digits — "123" shows 1,2,3 and 3 empty slots
  it("displays value digits in the correct slots", () => {
    render(<OTPInput value="123" onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("1")).toBeTruthy();
    expect(screen.getByDisplayValue("2")).toBeTruthy();
    expect(screen.getByDisplayValue("3")).toBeTruthy();
    // 3 empty slots
    const emptyInputs = screen.getAllByDisplayValue("");
    expect(emptyInputs.length).toBe(3);
  });

  // 3. Calls onChange on digit input — typing "5" in first slot
  it("calls onChange when a digit is typed in the first slot", () => {
    render(<OTPInput value="" onChange={mockOnChange} />);
    const inputs = screen.getAllByDisplayValue("");
    fireEvent.changeText(inputs[0], "5");
    expect(mockOnChange).toHaveBeenCalledWith("5");
  });

  // 4. Handles paste — pasting "123456" in first input
  it("handles paste of full OTP in first input", () => {
    render(<OTPInput value="" onChange={mockOnChange} />);
    const inputs = screen.getAllByDisplayValue("");
    fireEvent.changeText(inputs[0], "123456");
    expect(mockOnChange).toHaveBeenCalledWith("123456");
  });

  // 5. Handles paste truncation — pasting "12345678" with length=6
  it("truncates pasted value to match length", () => {
    render(<OTPInput value="" onChange={mockOnChange} length={6} />);
    const inputs = screen.getAllByDisplayValue("");
    fireEvent.changeText(inputs[0], "12345678");
    expect(mockOnChange).toHaveBeenCalledWith("123456");
  });

  // 6. Backspace on empty field — should call onChange to clear previous digit
  it("clears previous digit on backspace in empty field", () => {
    render(<OTPInput value="12" onChange={mockOnChange} />);
    const emptyInputs = screen.getAllByDisplayValue("");
    // The third input (index 2) is the first empty one
    fireEvent(emptyInputs[0], "keyPress", {
      nativeEvent: { key: "Backspace" },
    });
    expect(mockOnChange).toHaveBeenCalledWith("1");
  });

  // 7. Custom className — verify it's applied to wrapper
  it("applies custom className to wrapper View", () => {
    const { toJSON } = render(
      <OTPInput value="" onChange={mockOnChange} className="mt-4" />
    );
    const tree = toJSON() as any;
    // The root View should have the custom className merged
    expect(tree.props.className).toContain("mt-4");
  });

  // 8. Empty value — all inputs empty
  it("renders all empty inputs when value is empty string", () => {
    render(<OTPInput value="" onChange={mockOnChange} />);
    const inputs = screen.getAllByDisplayValue("");
    expect(inputs.length).toBe(6);
    expect(screen.queryByDisplayValue(/\d/)).toBeNull();
  });

  // 9. Full value — all 6 digits filled
  it("renders all digits when value is full", () => {
    render(<OTPInput value="987654" onChange={mockOnChange} />);
    expect(screen.getByDisplayValue("9")).toBeTruthy();
    expect(screen.getByDisplayValue("8")).toBeTruthy();
    expect(screen.getByDisplayValue("7")).toBeTruthy();
    expect(screen.getByDisplayValue("6")).toBeTruthy();
    expect(screen.getByDisplayValue("5")).toBeTruthy();
    expect(screen.getByDisplayValue("4")).toBeTruthy();
    expect(screen.queryAllByDisplayValue("")).toHaveLength(0);
  });

  // 10. Max length on first input — maxLength equals length prop
  it("sets maxLength on first input equal to length prop", () => {
    const { toJSON } = render(
      <OTPInput value="" onChange={mockOnChange} length={4} />
    );
    const tree = toJSON() as any;
    // Navigate to the first Pressable > TextInput
    const firstPressable = tree.children[0];
    const firstTextInput = firstPressable.children[0];
    expect(firstTextInput.props.maxLength).toBe(4);
  });

  it("sets maxLength=1 on non-first inputs", () => {
    const { toJSON } = render(
      <OTPInput value="" onChange={mockOnChange} length={4} />
    );
    const tree = toJSON() as any;
    const secondPressable = tree.children[1];
    const secondTextInput = secondPressable.children[0];
    expect(secondTextInput.props.maxLength).toBe(1);
  });
});
