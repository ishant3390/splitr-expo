import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Pressable } from "react-native";
import { ToastProvider, useToast } from "@/components/ui/toast";

function TestConsumer() {
  const toast = useToast();
  return (
    <>
      <Pressable testID="show-success" onPress={() => toast.success("Done!")} />
      <Pressable testID="show-error" onPress={() => toast.error("Failed!")} />
      <Pressable testID="show-info" onPress={() => toast.info("Info here")} />
    </>
  );
}

describe("Toast", () => {
  it("useToast throws outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      function Bad() {
        useToast();
        return null;
      }
      render(<Bad />);
    }).toThrow("useToast must be used within ToastProvider");

    spy.mockRestore();
  });

  it("shows success toast message", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(screen.getByTestId("show-success"));
    expect(screen.getByText("Done!")).toBeTruthy();
  });

  it("shows error toast message", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(screen.getByTestId("show-error"));
    expect(screen.getByText("Failed!")).toBeTruthy();
  });

  it("shows info toast message", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(screen.getByTestId("show-info"));
    expect(screen.getByText("Info here")).toBeTruthy();
  });

  it("shows multiple toasts", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(screen.getByTestId("show-success"));
    fireEvent.press(screen.getByTestId("show-error"));

    expect(screen.getByText("Done!")).toBeTruthy();
    expect(screen.getByText("Failed!")).toBeTruthy();
  });
});
