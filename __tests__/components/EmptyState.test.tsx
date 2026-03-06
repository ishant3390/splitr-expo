import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock } from "lucide-react-native";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState icon={Clock} title="No items" />);
    expect(screen.getByText("No items")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    render(
      <EmptyState
        icon={Clock}
        title="No items"
        subtitle="Add some items to get started"
      />
    );
    expect(screen.getByText("Add some items to get started")).toBeTruthy();
  });

  it("does not render subtitle when not provided", () => {
    render(<EmptyState icon={Clock} title="No items" />);
    expect(screen.queryByText("Add some items")).toBeNull();
  });

  it("renders action button when actionLabel and onAction provided", () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        icon={Clock}
        title="No items"
        actionLabel="Add Item"
        onAction={onAction}
      />
    );
    expect(screen.getByText("Add Item")).toBeTruthy();
  });

  it("calls onAction when action button pressed", () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        icon={Clock}
        title="No items"
        actionLabel="Add Item"
        onAction={onAction}
      />
    );

    fireEvent.press(screen.getByText("Add Item"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not render action button when only actionLabel is provided", () => {
    render(
      <EmptyState icon={Clock} title="No items" actionLabel="Add Item" />
    );
    // Button should not render without onAction
    // The component checks both actionLabel && onAction
    expect(screen.queryByText("Add Item")).toBeNull();
  });
});
