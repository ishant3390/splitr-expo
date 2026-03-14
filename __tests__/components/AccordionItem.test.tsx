import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AccordionItem } from "@/components/ui/accordion-item";

// hapticLight is already mocked globally via expo-haptics mock

describe("AccordionItem", () => {
  const defaultProps = {
    title: "What is Splitr?",
    children: "Splitr is an expense splitting app.",
    onToggle: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders title text", () => {
    render(<AccordionItem {...defaultProps} />);
    expect(screen.getByText("What is Splitr?")).toBeTruthy();
  });

  it("renders children content", () => {
    render(<AccordionItem {...defaultProps} expanded={true} />);
    expect(screen.getByText("Splitr is an expense splitting app.")).toBeTruthy();
  });

  it("renders content in collapsed state too (hidden via animation)", () => {
    render(<AccordionItem {...defaultProps} expanded={false} />);
    // Content is in the tree but animated to maxHeight 0 / opacity 0
    expect(screen.getByText("Splitr is an expense splitting app.")).toBeTruthy();
  });

  it("calls onToggle and hapticLight when header is pressed", () => {
    const haptics = require("expo-haptics");
    render(<AccordionItem {...defaultProps} />);

    fireEvent.press(screen.getByText("What is Splitr?"));
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    expect(haptics.impactAsync).toHaveBeenCalled();
  });

  it("renders without onToggle (no crash)", () => {
    render(
      <AccordionItem title="No Toggle" expanded={false}>
        Some content
      </AccordionItem>
    );
    // Should not throw on press
    fireEvent.press(screen.getByText("No Toggle"));
  });

  it("updates animation when expanded changes", () => {
    const { rerender } = render(<AccordionItem {...defaultProps} expanded={false} />);
    rerender(<AccordionItem {...defaultProps} expanded={true} />);
    // Should not crash — animation values updated via useEffect
    expect(screen.getByText("What is Splitr?")).toBeTruthy();
  });
});
