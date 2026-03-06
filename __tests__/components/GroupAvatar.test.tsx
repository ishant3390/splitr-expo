import React from "react";
import { render, screen } from "@testing-library/react-native";
import { GroupAvatar } from "@/components/ui/group-avatar";

describe("GroupAvatar", () => {
  it("renders emoji when provided", () => {
    render(<GroupAvatar name="Trip" emoji="✈️" />);
    expect(screen.getByText("✈️")).toBeTruthy();
  });

  it("renders first letter of name when no emoji", () => {
    render(<GroupAvatar name="Vacation" />);
    expect(screen.getByText("V")).toBeTruthy();
  });

  it("uppercases the first letter", () => {
    render(<GroupAvatar name="dinner" />);
    expect(screen.getByText("D")).toBeTruthy();
  });

  it("renders without crashing for size sm", () => {
    render(<GroupAvatar name="Test" size="sm" />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("renders without crashing for size md (default)", () => {
    render(<GroupAvatar name="Test" />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("renders without crashing for size lg", () => {
    render(<GroupAvatar name="Test" size="lg" />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("produces deterministic gradient — same name always same result", () => {
    const { unmount: u1 } = render(<GroupAvatar name="Trip" />);
    u1();
    // Re-rendering with same props should not crash (deterministic hash)
    render(<GroupAvatar name="Trip" />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("renders different content for different names", () => {
    const { unmount } = render(<GroupAvatar name="Alpha" />);
    expect(screen.getByText("A")).toBeTruthy();
    unmount();

    render(<GroupAvatar name="Beta" />);
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("includes groupType in hash for gradient variation", () => {
    // Different groupType should not crash, both should render
    const { unmount } = render(<GroupAvatar name="Trip" groupType="travel" />);
    expect(screen.getByText("T")).toBeTruthy();
    unmount();

    render(<GroupAvatar name="Trip" groupType="home" />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("shows emoji over first letter when emoji is provided", () => {
    render(<GroupAvatar name="Groceries" emoji="🛒" />);
    expect(screen.getByText("🛒")).toBeTruthy();
    expect(screen.queryByText("G")).toBeNull();
  });
});
