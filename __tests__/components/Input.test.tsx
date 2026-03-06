import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders without label or error", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeTruthy();
  });

  it("renders label when provided", () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByText("Email")).toBeTruthy();
  });

  it("does not render label when not provided", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.queryByText("Email")).toBeNull();
  });

  it("renders error message when provided", () => {
    render(<Input error="Required field" placeholder="Enter text" />);
    expect(screen.getByText("Required field")).toBeTruthy();
  });

  it("does not render error when not provided", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.queryByText("Required field")).toBeNull();
  });

  it("accepts text input", () => {
    const onChangeText = jest.fn();
    render(<Input placeholder="Type here" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByPlaceholderText("Type here"), "hello");
    expect(onChangeText).toHaveBeenCalledWith("hello");
  });

  it("renders with both label and error", () => {
    render(<Input label="Name" error="Too short" placeholder="Enter name" />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Too short")).toBeTruthy();
  });
});
