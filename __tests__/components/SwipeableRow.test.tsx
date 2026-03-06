import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { SwipeableRow } from "@/components/ui/swipeable-row";

// Mock react-native-gesture-handler
jest.mock("react-native-gesture-handler", () => {
  const RN = require("react-native");
  return {
    Swipeable: ({ children, renderRightActions }: any) => (
      <RN.View>
        {children}
        {renderRightActions && renderRightActions()}
      </RN.View>
    ),
    GestureHandlerRootView: RN.View,
  };
});

// Mock lucide-react-native icons
jest.mock("lucide-react-native", () => ({
  Trash2: "Trash2",
  Pencil: "Pencil",
}));

describe("SwipeableRow", () => {
  it("renders children", () => {
    render(
      <SwipeableRow>
        <Text>Row Content</Text>
      </SwipeableRow>
    );
    expect(screen.getByText("Row Content")).toBeTruthy();
  });

  it("renders Edit action when onEdit is provided", () => {
    render(
      <SwipeableRow onEdit={jest.fn()}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("renders Delete action when onDelete is provided", () => {
    render(
      <SwipeableRow onDelete={jest.fn()}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("renders both Edit and Delete actions when both handlers provided", () => {
    render(
      <SwipeableRow onEdit={jest.fn()} onDelete={jest.fn()}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("does not render Edit action when onEdit is not provided", () => {
    render(
      <SwipeableRow onDelete={jest.fn()}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("does not render Delete action when onDelete is not provided", () => {
    render(
      <SwipeableRow onEdit={jest.fn()}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("calls onEdit when Edit button is pressed", () => {
    const onEdit = jest.fn();
    render(
      <SwipeableRow onEdit={onEdit}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    fireEvent.press(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when Delete button is pressed", () => {
    const onDelete = jest.fn();
    render(
      <SwipeableRow onDelete={onDelete}>
        <Text>Content</Text>
      </SwipeableRow>
    );
    fireEvent.press(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("renders no actions when neither handler is provided", () => {
    render(
      <SwipeableRow>
        <Text>Content</Text>
      </SwipeableRow>
    );
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });
});
