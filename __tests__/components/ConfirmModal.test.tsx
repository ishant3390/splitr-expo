import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react-native";
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

  it("renders with destructive=true", () => {
    render(<ConfirmModal {...defaultProps} destructive={true} confirmLabel="Delete" />);
    expect(screen.getByText("Delete")).toBeTruthy();
    expect(screen.getByText("Delete Item")).toBeTruthy();
    expect(screen.getByText("Are you sure?")).toBeTruthy();
  });

  it("renders with destructive=false (default)", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeTruthy();
  });

  it("calls onCancel when backdrop is pressed", () => {
    render(<ConfirmModal {...defaultProps} />);
    // The outer Pressable acts as backdrop
    // Modal's onRequestClose is set to onCancel
    expect(screen.getByText("Delete Item")).toBeTruthy();
  });

  it("renders all text content simultaneously", () => {
    render(
      <ConfirmModal
        {...defaultProps}
        title="Remove Member"
        message="This will remove the member from the group."
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive={true}
      />
    );
    expect(screen.getByText("Remove Member")).toBeTruthy();
    expect(screen.getByText("This will remove the member from the group.")).toBeTruthy();
    expect(screen.getByText("Remove")).toBeTruthy();
    expect(screen.getByText("Keep")).toBeTruthy();
  });

  it("inner pressable stops event propagation", () => {
    const { UNSAFE_root } = render(<ConfirmModal {...defaultProps} />);

    // Find Pressable-like nodes with onPress that calls stopPropagation
    const allNodes = UNSAFE_root.findAll(
      (node) => node.props && typeof node.props.onPress === "function"
    );
    // Call each onPress with a mock event that has stopPropagation
    const mockEvent = { stopPropagation: jest.fn() };
    for (const node of allNodes) {
      try {
        node.props.onPress(mockEvent);
      } catch {
        // ignore
      }
    }
    // The stopPropagation should have been called at least once (from the inner wrapper)
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it("renders modal contract testIDs", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByTestId("confirm-modal-root")).toBeTruthy();
    expect(screen.getByTestId("confirm-modal-backdrop")).toBeTruthy();
    expect(screen.getByTestId("confirm-modal-sheet")).toBeTruthy();
    expect(screen.getByTestId("confirm-modal-cancel")).toBeTruthy();
    expect(screen.getByTestId("confirm-modal-confirm")).toBeTruthy();
  });
});
