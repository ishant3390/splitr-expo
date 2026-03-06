import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Card } from "@/components/ui/card";

describe("Card", () => {
  it("renders children", () => {
    render(
      <Card>
        <Text>Card content</Text>
      </Card>
    );
    expect(screen.getByText("Card content")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { toJSON } = render(
      <Card className="p-4">
        <Text>Content</Text>
      </Card>
    );
    // Should render without errors
    expect(toJSON()).toBeTruthy();
  });
});
