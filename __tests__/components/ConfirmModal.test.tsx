import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ConfirmModal } from "@/components/ui/confirm-modal";

describe("ConfirmModal", () => {
  const defaultProps = {
    visible: true,
    title: "Delete Item",
    message: "Are you sure?",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title and message when visible", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText("Delete Item")).toBeTruthy();
    expect(screen.getByText("Are you sure?")).toBeTruthy();
  });

  it("uses default button labels", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Confirm")).toBeTruthy();
  });

  it("uses custom button labels", () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    );

    expect(screen.getByText("Keep")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("calls onConfirm when confirm pressed", () => {
    render(<ConfirmModal {...defaultProps} confirmLabel="Yes" />);

    fireEvent.press(screen.getByText("Yes"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel pressed", () => {
    render(<ConfirmModal {...defaultProps} />);

    fireEvent.press(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
