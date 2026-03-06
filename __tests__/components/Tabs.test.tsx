import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Tabs } from "@/components/ui/tabs";

const tabs = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

describe("Tabs", () => {
  it("renders all tab labels", () => {
    const onChange = jest.fn();
    render(<Tabs tabs={tabs} activeTab="active" onTabChange={onChange} />);

    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Archived")).toBeTruthy();
  });

  it("calls onTabChange when a tab is pressed", () => {
    const onChange = jest.fn();
    render(<Tabs tabs={tabs} activeTab="active" onTabChange={onChange} />);

    fireEvent.press(screen.getByText("Archived"));
    expect(onChange).toHaveBeenCalledWith("archived");
  });

  it("calls onTabChange with correct id for each tab", () => {
    const onChange = jest.fn();
    render(<Tabs tabs={tabs} activeTab="archived" onTabChange={onChange} />);

    fireEvent.press(screen.getByText("Active"));
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("renders three tabs", () => {
    const threeTabs = [
      { id: "a", label: "Tab A" },
      { id: "b", label: "Tab B" },
      { id: "c", label: "Tab C" },
    ];
    const onChange = jest.fn();
    render(<Tabs tabs={threeTabs} activeTab="a" onTabChange={onChange} />);

    expect(screen.getByText("Tab A")).toBeTruthy();
    expect(screen.getByText("Tab B")).toBeTruthy();
    expect(screen.getByText("Tab C")).toBeTruthy();
  });
});
